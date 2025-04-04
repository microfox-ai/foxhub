import { prisma } from "@/prisma/prisma";
import { deployStep } from "@/server/convertfox/types";
import { triggerDeployment } from "@/server/deployfox/deployGit";
import {
  fetchWorkflowActionRun,
  getLatestRunForClientRequest,
} from "@/server/deployfox/fetchLogs";
import {
  getClientDeployment,
  getTaskInstanceMeta,
} from "@/utils/services/db_functions/getClientRequest";
import { NextRequest, NextResponse } from "next/server";
import { DEPLOY_STAGE } from "@prisma/client";
import { updateTaskInstanceMeta } from "@/utils/services/db_functions/updateClientRequest";

export const maxDuration = 100;

// Create New Triggered Deployment for a ClientRequest
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { clientRequestId, stage } = body;

    const clientRequest = await prisma.clientRequest.findUnique({
      where: { id: clientRequestId },
    });

    const taskInstanceMeta = await getTaskInstanceMeta(clientRequestId);

    if (!clientRequest || !taskInstanceMeta) {
      return NextResponse.json(
        { error: "ClientRequest not found" },
        { status: 404 }
      );
    }

    await triggerDeployment(clientRequest, taskInstanceMeta, stage);

    await new Promise((resolve) => setTimeout(resolve, 20000));

    const runId = await getLatestRunForClientRequest(clientRequest, stage);

    await updateTaskInstanceMeta({
      clientRequestId,
      otherData: {
        deployStep: {
          runId,
          stage,
          status: "pending",
        },
      },
    });

    return NextResponse.json(
      { message: "Deployment triggered", runId },
      { status: 200 }
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to create client deployment" },
      { status: 500 }
    );
  }
}

// Fetches the latest action run for a repo.
export async function GET(req: NextRequest) {
  try {
    const clientRequestId = req.nextUrl.searchParams.get("clientRequestId");
    const stage = req.nextUrl.searchParams.get("stage") as DEPLOY_STAGE;
    const runIdStr = req.nextUrl.searchParams.get("runId");
    const runId = runIdStr ? parseInt(runIdStr, 10) : null;

    if (!clientRequestId || !stage || !runId) {
      return NextResponse.json(
        { error: "Missing required query parameters" },
        { status: 400 }
      );
    }

    if (!Object.values(DEPLOY_STAGE).includes(stage)) {
      return NextResponse.json(
        { error: "Invalid stage value" },
        { status: 400 }
      );
    }

    const clientRequest = await prisma.clientRequest.findUnique({
      where: { id: clientRequestId },
    });

    const taskInstanceMeta = await getTaskInstanceMeta(clientRequestId);

    if (!clientRequest || !taskInstanceMeta) {
      return NextResponse.json(
        { error: "ClientRequest not found" },
        { status: 404 }
      );
    }

    const clientDeployment = await getClientDeployment(clientRequestId);

    if (taskInstanceMeta.deployStep?.shouldBreak) {
      return NextResponse.json(
        {
          shouldBreak: taskInstanceMeta.deployStep?.shouldBreak,
          clientDeployment: taskInstanceMeta.deployStep?.deployment,
          deployStep: taskInstanceMeta.deployStep,
          taskInstanceMeta: taskInstanceMeta,
        },
        { status: 200 }
      );
    }

    const lastRun = await fetchWorkflowActionRun(
      clientRequest,
      taskInstanceMeta,
      stage,
      runId
    );

    return NextResponse.json(
      {
        shouldBreak: lastRun?.shouldBreak,
        clientDeployment: clientDeployment,
        deployStep: lastRun?.taskInstanceMeta?.deployStep,
        taskInstanceMeta: lastRun?.taskInstanceMeta,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error(error);
  }
}
