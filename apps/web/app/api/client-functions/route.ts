import { prisma } from "@/prisma/prisma";
import { getServiceName } from "@/server/buildfox/helper/getServiceName";
import {
  TaskInstanceMetaType,
  TaskStructure,
} from "@/server/convertfox/helpers/types";
import { updateTaskInstanceMeta } from "@/utils/services/db_functions/updateClientRequest";
import {
  deleteEmbedding,
  embedApiEndpoints,
} from "@/utils/services/embeddings/embedFunctions";
import { OpenAPIDoc } from "@/utils/services/OpenAPIToolsClient";
import {
  parseServerlessFunctions,
  parseServerlessLogs,
} from "@/utils/services/parseServerlessLogs";
import {
  MICROFOX_LOGO,
  MySlackChannels,
  slackBotSdk,
} from "@/utils/services/slackBotSdk";
import {
  DEPLOY_STAGE,
  DEPLOY_STATUS,
  FUNCTIONTYPE,
  TaskInstanceMeta,
} from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { GITHUB_TOKEN, PROJECT_REPO_OWNER } from "@/utils/constants/githubInfo";
import YAML from "yaml";
import { Octokit } from "octokit";

// Create ClientDeployment
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      originClientRequestId,
      sha,
      name,
      baseUrl,
      stage,
      type,
      metadata,
      endpoints,
    } = body;

    if (
      !originClientRequestId ||
      !name ||
      !baseUrl ||
      !type ||
      !stage ||
      !sha
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Get userId and botProjectId from ClientRequest
    const clientRequest = await prisma.clientRequest.findUnique({
      where: { id: originClientRequestId },
      include: {
        taskInstanceMeta: true,
      },
    });

    if (!clientRequest) {
      return NextResponse.json(
        { error: "ClientRequest not found" },
        { status: 404 }
      );
    }

    const { userId, botProjectId } = clientRequest;

    // TODO: VSWJT - MAKE THIS A SEPERATE FUNCTION
    let functions: any[] = [];
    if (
      !clientRequest.prBranch ||
      !clientRequest.requestDir ||
      !clientRequest.repoName
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const githubSdk = new Octokit({
      auth: GITHUB_TOKEN,
    });

    let serviceName = getServiceName(
      clientRequest,
      clientRequest.taskInstanceMeta as unknown as TaskInstanceMetaType
    );
    let region = clientRequest.awsRegion;
    let functionBase = serviceName + "-" + stage?.toLowerCase();
    try {
      const serverlessYmlPath = `${clientRequest.requestDir}/serverless.yml`;
      const fileContentResponse = await githubSdk.rest.repos.getContent({
        owner: PROJECT_REPO_OWNER,
        repo: clientRequest.repoName,
        path: serverlessYmlPath,
        ref: clientRequest.prBranch,
      });
      if ("content" in fileContentResponse.data) {
        const decodedContent = Buffer.from(
          fileContentResponse.data.content,
          "base64"
        ).toString("utf-8");
        const serverlessConfig = YAML.parse(decodedContent);
        const functions = parseServerlessFunctions(
          serverlessConfig,
          functionBase,
          metadata.serverless?.output
        );
        serviceName = serverlessConfig.service;
        region = serverlessConfig.provider.region;
      }
    } catch (e) {
      console.log("Error fetching or parsing serverless.yml", e);
      const serverlessLog = metadata.serverless?.output;
      functions = parseServerlessLogs(serverlessLog);
    }

    let newMetadata = { ...metadata };
    newMetadata.serverless.functions = functions;
    newMetadata.serverless.serviceName = serviceName;
    newMetadata.serverless.functionBase = functionBase;
    newMetadata.serverless.region = region;
    console.log("newMetadata", newMetadata);

    // Create the ClientDeployment with awsRegion from clientRequest
    // VSWJT TODO - in future, we should use id: originClientRequestId+stage as a means to identify the deployments of different stages (when bothe deployments need to exist),
    const clientFunction = await prisma.clientDeployment.upsert({
      where: { id: originClientRequestId },
      update: {
        sha,
        baseUrl,
        name: `${name}-${stage}-${originClientRequestId}`,
        stage: stage as DEPLOY_STAGE,
        type: type as FUNCTIONTYPE,
        status: DEPLOY_STATUS.DEPLOYED,
        metadata: newMetadata,
        endpoints:
          typeof endpoints === "string" ? JSON.parse(endpoints) : endpoints,
        awsRegion: clientRequest.awsRegion,
      },
      create: {
        id: originClientRequestId,
        userId,
        botProjectId,
        originClientRequestId,
        name: `${name}-${stage}-${originClientRequestId}`,
        sha,
        baseUrl,
        stage: stage as DEPLOY_STAGE,
        type: type as FUNCTIONTYPE,
        status: DEPLOY_STATUS.DEPLOYED,
        metadata: newMetadata,
        endpoints:
          typeof endpoints === "string" ? JSON.parse(endpoints) : endpoints,
        awsRegion: clientRequest.awsRegion,
      },
    });

    // if (clientFunction.stage === DEPLOY_STAGE.PROD) {
    //   await sesSdk.sendEmail({
    //     sender: "notifications@microfox.app",
    //     recipient: clientFunction.userId,
    //     subject: `Function "${clientFunction.name}" has been updated.`,
    //     bodyHtml: generateMicrofoxEmailTemplate({
    //       title: `Congrats! Your automation has been published.`,
    //       content: `"${clientFunction.name}" has been published. You can now expect your automation to be running clockwise, untill you decide to stop it. You can stop it by visiting the dashboard.`,
    //       // ctaText: "Test it out",
    //       // ctaLink: `https://microfox.app/test/${updatedFunction.id}`,
    //     }),
    //   });
    // }

    let taskInstanceMeta = await prisma.taskInstanceMeta.findUnique({
      where: {
        originClientRequestId: originClientRequestId,
      },
    });

    // Add notification in chat if needed
    // TODO: VISHWAJEET - send not only a message, but also an email to the user.
    // await prisma.chatUIMessage.create({
    //   data: {
    //     originClientRequestId,
    //     userId,
    //     content: `A new ${type.toLowerCase()} function "${name}" has been deployed to ${mode} mode`,
    //     context: `server`,
    //     role: `assistant`,
    //     minionType: `other`,
    //     createdAt: new Date(),
    //   },
    // });
    if (
      taskInstanceMeta &&
      newMetadata?.docData?.paths &&
      Object.keys(newMetadata?.docData?.paths).length > 0
    ) {
      await embedApiEndpoints({
        taskStructure: taskInstanceMeta?.taskStructure as TaskStructure,
        docData: newMetadata?.docData as OpenAPIDoc,
        botProjectId: botProjectId,
        originClientRequestId: originClientRequestId,
        userId: userId,
        stage: stage,
        base_url: `${baseUrl}/${stage.toLowerCase()}`,
        schema_path: "/docs.json",
      });
    }
    const timeTaken = new Date().getTime() - clientRequest.createdAt.getTime();

    // await slackBotSdk.sendMessage({
    //   icon_url: MICROFOX_LOGO,
    //   channel: MySlackChannels.microfox_updates,
    //   text: `Deployfox finished deployment for ${stage} mode for ${clientRequest.title} - endpoints: ${newMetadata?.serverless?.functions?.length}.
    //   Functions Deployed: ${newMetadata?.serverless?.functions?.map((f: any) => f.functionName + " (" + f.size + ")").join(", ")}.
    //   Total time taken since hellofox started conversation: ${timeTaken} seconds`,
    // });

    return NextResponse.json(clientFunction, { status: 201 });
  } catch (error) {
    console.error("Error creating ClientDeployment:", error);
    return NextResponse.json(
      { error: "Error creating ClientDeployment" },
      { status: 500 }
    );
  }
}

// Get ClientDeployment(s)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const userId = searchParams.get("userId");
    const botProjectId = searchParams.get("botProjectId");
    const clientRequestId = searchParams.get("clientRequestId");
    const sha = searchParams.get("sha");

    if (!id && !userId && !botProjectId && !clientRequestId && !sha) {
      return NextResponse.json(
        {
          error:
            "Missing id, name, userId, botProjectId, or clientRequestId parameter",
        },
        { status: 400 }
      );
    }

    const clientFunctions = await prisma.clientDeployment.findMany({
      where: {
        ...(id && { id }),
        ...(userId && { userId }),
        ...(botProjectId && { botProjectId }),
        ...(clientRequestId && { originClientRequestId: clientRequestId }),
        ...(sha && { sha }),
      },
      include: {
        originClientRequest: true,
      },
    });

    return NextResponse.json({ clientFunctions }, { status: 200 });
  } catch (error) {
    console.error("Error fetching ClientDeployment:", error);
    return NextResponse.json(
      { error: "Error fetching ClientDeployment" },
      { status: 500 }
    );
  }
}

// Delete ClientDeployment
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const pause = searchParams.get("pause");

    if (!id) {
      return NextResponse.json(
        { error: "Missing function ID" },
        { status: 400 }
      );
    }

    const clientFunction = await prisma.clientDeployment.findUnique({
      where: { id },
    });

    if (!clientFunction) {
      return NextResponse.json(
        { error: "Function not found" },
        { status: 404 }
      );
    }

    // Delete the embedding
    await deleteEmbedding(clientFunction.originClientRequestId);

    // Store data before deletion for notifications
    // const { name, originClientRequestId, userId, stage } = clientFunction;

    if (pause === "true") {
      // If pause=true, archive the function instead of deleting
      const archivedFunction = await prisma.clientDeployment.update({
        where: { id },
        data: {
          status: DEPLOY_STATUS.ARCHIVED,
        },
      });

      return NextResponse.json(
        {
          message: "Function archived successfully",
          function: archivedFunction,
        },
        { status: 200 }
      );
    } else {
      // Delete the function
      await prisma.clientDeployment.delete({
        where: { id },
      });
      // Notify in chat about deletion
      // TODO: VISHWAJEET - no need to send a mesaage i think, but will have to take a look later
      // await prisma.chatUIMessage.create({
      //   data: {
      //     originClientRequestId,
      //     userId,
      //     content: `Function "${name}" has been removed from ${mode} mode`,
      //     context: `server`,
      //     role: `assistant`,
      //     minionType: `other`,
      //     createdAt: new Date(),
      //   },
      // });

      return NextResponse.json(
        { message: "Function deleted successfully" },
        { status: 200 }
      );
    }
  } catch (error) {
    console.error("Error deleting ClientDeployment:", error);
    return NextResponse.json(
      { error: "Error deleting ClientDeployment" },
      { status: 500 }
    );
  }
}
