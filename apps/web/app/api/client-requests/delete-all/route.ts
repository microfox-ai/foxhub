import { prisma } from "@/prisma/prisma";
import { fetchTemplateDir } from "@/server/buildfox/tool/writeToFile";
import { TaskStructure } from "@/server/convertfox/types";
import { triggerDeployment } from "@/server/deployfox/deployGit";
import { DEPLOY_STAGE } from "@prisma/client";
import { readFile } from "fs/promises";
import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import path from "path";
import { Redis } from "@upstash/redis";
import { ClientSecretPackageType } from "@/server/types";

// Delete Serverless Function Deployment
// No need to delete the document, as it will be deleted from inside the function.
// TODO: directly delete the aws landa function based on the details in the clientDeployment document (it should have all necessary info - check client-secrets/update-deployments).
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    console.log("id", id);
    if (!id) {
      return NextResponse.json(
        { error: "Missing function ID" },
        { status: 400 }
      );
    }

    const clientRequest = await prisma.clientRequest.findUnique({
      where: { id: id },
    });

    const clientFunction = await prisma.clientDeployment.findFirst({
      where: { originClientRequestId: id },
    });

    const taskInstanceMeta = await prisma.taskInstanceMeta.findFirst({
      where: {
        originClientRequestId: id,
      },
    });

    if (!clientFunction || !clientFunction.stage || !clientRequest) {
      return NextResponse.json(
        { error: "Request or Function not found" },
        { status: 404 }
      );
    }

    // 1. delete the deployment
    const { sha } = await triggerDeployment(
      clientRequest,
      clientFunction.stage,
      true,
      undefined
    );

    // 2. delete the db stuff.
    const template_type = (
      taskInstanceMeta?.taskStructure as any as TaskStructure
    ).templateType;
    const envsJSON = await readFile(
      path.join(process.cwd(), fetchTemplateDir(template_type), "envs.json"),
      "utf8"
    );
    let templatedEnvs = JSON.parse(envsJSON);
    const upstashUrl = templatedEnvs.find(
      (env: any) => env.key === "UPSTASH_REDIS_REST_URL"
    )?.value;
    const upstashToken = templatedEnvs.find(
      (env: any) => env.key === "UPSTASH_REDIS_REST_TOKEN"
    )?.value;
    const redisClient = new Redis({
      url: upstashUrl,
      token: upstashToken,
    });
    // Delete all Redis keys matching the pattern ${id}*
    const keys = await redisClient.keys(`${id}*`);
    if (keys.length > 0) {
      await redisClient.del(...keys);
    }

    // 3. delete the custom envs & template envs for this client request.
    const deletedCustomSecrets = await prisma.clientSecret.deleteMany({
      where: {
        clientRequestIds: {
          has: id,
        },
        packageType: ClientSecretPackageType.CUSTOM,
      },
    });

    // ALSO MODIFY THE DEPLOY STEP.

    return NextResponse.json(
      {
        success: true,
        message:
          "Deletion triggered. We will delete the function in a few minutes.",
        sha,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting ClientDeployment:", error);
    return NextResponse.json(
      { error: "Error deleting ClientDeployment" },
      { status: 500 }
    );
  }
}
