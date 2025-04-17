import { prisma } from "@/prisma/prisma";
import { DeployStep, TaskInstanceMetaType } from "@/server/convertfox/types";
import { addClientSecretToClientDeployment } from "@/utils/services/db_functions/secrets_helper";
import { updateTaskInstanceMeta } from "@/utils/services/db_functions/updateClientRequest";
import { parseServerlessLogs } from "@/utils/services/parseServerlessLogs";
import { generateMicrofoxEmailTemplate, sesSdk } from "@/utils/services/sesSdk";
import { slackBotSdk } from "@/utils/services/slackBotSdk";
import { MICROFOX_LOGO } from "@/utils/services/slackBotSdk";
import { MySlackChannels } from "@/utils/services/slackBotSdk";
import { FUNCTIONTYPE, DEPLOY_STAGE } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

// Create ClientDeployment
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      originClientRequestId,
      name,
      baseUrl,
      stage,
      type,
      metadata,
      endpoints,
    } = body;

    if (!originClientRequestId || !name || !baseUrl || !type || !stage) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Get userId and botProjectId from ClientRequest
    const clientRequest = await prisma.clientRequest.findUnique({
      where: { id: originClientRequestId },
    });

    if (!clientRequest) {
      return NextResponse.json(
        { error: "ClientRequest not found" },
        { status: 404 }
      );
    }

    const { userId, botProjectId } = clientRequest;

    const serverlessLog = metadata.serverless.output;
    const functions = parseServerlessLogs(serverlessLog);
    let newMetadata = { ...metadata };
    newMetadata.serverless.functions = functions;

    // Create the ClientDeployment
    // VSWJT TODO - in future, we should use id: originClientRequestId+stage as a means to identify the deployments of different stages (when bothe deployments need to exist),
    const clientFunction = await prisma.clientDeployment.upsert({
      where: { id: originClientRequestId },
      update: {
        baseUrl,
        name: `${name}-${stage}-${originClientRequestId}`,
        stage: stage as DEPLOY_STAGE,
        type: type as FUNCTIONTYPE,
        metadata: newMetadata,
        endpoints:
          typeof endpoints === "string" ? JSON.parse(endpoints) : endpoints,
      },
      create: {
        id: originClientRequestId,
        userId,
        botProjectId,
        originClientRequestId,
        name: `${name}-${stage}-${originClientRequestId}`,
        baseUrl,
        stage: stage as DEPLOY_STAGE,
        type: type as FUNCTIONTYPE,
        metadata: newMetadata,
        endpoints:
          typeof endpoints === "string" ? JSON.parse(endpoints) : endpoints,
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

    const taskInstanceMeta = await prisma.taskInstanceMeta.findUnique({
      where: {
        id: originClientRequestId,
      },
    });

    if (taskInstanceMeta) {
      await updateTaskInstanceMeta({
        clientRequestId: originClientRequestId,
        otherData: {
          deployStep: {
            ...(taskInstanceMeta?.deployStep as DeployStep),
            deployment: {
              stage,
              type,
              id: originClientRequestId,
            },
          } as DeployStep,
        },
      });
    }

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

    const timeTaken = new Date().getTime() - clientRequest.createdAt.getTime();

    await slackBotSdk.sendMessage({
      icon_url: MICROFOX_LOGO,
      channel: MySlackChannels.microfox_updates,
      text: `Deployfox finished deployment for ${stage} mode for ${clientRequest.title} - endpoints: ${newMetadata?.serverless?.functions?.length}. 
      Functions Deployed: ${newMetadata?.serverless?.functions?.map((f: any) => f.functionName + " (" + f.size + ")").join(", ")}.
      Total time taken since hellofox started conversation: ${timeTaken} seconds`,
    });

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

    if (!id && !userId && !botProjectId && !clientRequestId) {
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

    // Store data before deletion for notifications
    const { name, originClientRequestId, userId, stage } = clientFunction;

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
  } catch (error) {
    console.error("Error deleting ClientDeployment:", error);
    return NextResponse.json(
      { error: "Error deleting ClientDeployment" },
      { status: 500 }
    );
  }
}
