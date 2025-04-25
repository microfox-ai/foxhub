import { prisma } from "@/prisma/prisma";
import { triggerDeployment } from "@/server/deployfox/deployGit";
import { DEPLOY_STAGE } from "@prisma/client";
import { NextRequest } from "next/server";
import { NextResponse } from "next/server";

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

    if (!clientFunction || !clientFunction.stage || !clientRequest) {
      return NextResponse.json(
        { error: "Request or Function not found" },
        { status: 404 }
      );
    }

    const { sha } = await triggerDeployment(
      clientRequest,
      clientFunction.stage,
      true,
      undefined
    );

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
