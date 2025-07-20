import { defaultChannel } from "@/lib/background-tasks-sse";
import { prisma } from "@/prisma/prisma";
import { createResponse, type Session } from "better-sse";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Handles GET requests to establish a Server-Sent Events (SSE) connection
 * for a specific task.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const { taskId } = await params;
  console.log(`SSE connection opened for task: ${taskId}`);

  return createResponse(request, async (session) => {
    // Initialize session state
    session.state = {
      ...session.state,
      sessionType: "task",
      taskId,
    };

    defaultChannel.register(session);
    console.log(`SSE session registered for task: ${taskId}`);

    // Check for and send any pending updates for this task
    console.log(`Checking for pending events for task: ${taskId}`);
    const pendingTasks = await prisma.pendingEvent.findMany({
      where: { taskId: taskId },
    });

    console.log(
      `Found ${pendingTasks.length} pending events for task: ${taskId}`
    );

    for (const pendingTask of pendingTasks) {
      console.log(
        `Broadcasting pending event ${pendingTask.event} for task: ${taskId}`
      );
      session.push(pendingTask.data, pendingTask.event);
      console.log(
        `Deleting pending event ${pendingTask.id} for task: ${taskId}`
      );
      await prisma.pendingEvent.delete({ where: { id: pendingTask.id } });
    }
  });
}

function isMatchingSession(session: Session, taskId: string): boolean {
  const {
    sessionType,
    taskId: sessionTaskId,
    projectId,
    requestId,
  } = session.state;

  if (sessionType === "task" && sessionTaskId === taskId) {
    return true;
  }
  if (
    sessionType === "project" &&
    projectId &&
    taskId.includes(projectId as string)
  ) {
    return true;
  }
  if (
    sessionType === "request" &&
    requestId &&
    taskId.includes(requestId as string)
  ) {
    return true;
  }

  return false;
};

/**
 * Handles POST requests to broadcast events to clients subscribed to SSE tasks.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await params;
    const { event, data, isClientUpdate } = await request.json();

    console.log(
      `POST request received for task: ${taskId}, event: ${event}, isClientUpdate: ${isClientUpdate}`
    );
    // const botProjectId = taskId.substring(0, 36);
    // const requestId = taskId.substring(37, 73);
    // const splitTaskId = taskId.substring(74, 110);

    if (
      request.headers.get("x-task-protection-key") !==
      process.env.TASK_API_PROTECTION_KEY
    ) {
      console.log("unauthorized");
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized",
        },
        { status: 401 }
      );
    }

    if (!taskId || !event || !data) {
      console.log("taskId, event, and data are required");
      return NextResponse.json(
        {
          success: false,
          message: "taskId, event, and data are required",
        },
        { status: 400 }
      );
    }

    if (!isClientUpdate) {
      return NextResponse.json({
        success: true,
        message: "Event received, no client update required.",
      });
    }

    const hasMatchingActiveSession = defaultChannel.activeSessions.some(
      (session) => isMatchingSession(session, taskId)
    );

    if (hasMatchingActiveSession) {
      console.log("hasMatchingActiveSession", hasMatchingActiveSession);
      defaultChannel.broadcast(data, event, {
        filter: (session) => isMatchingSession(session, taskId),
      });
      console.log("broadcasted event", data);
      return NextResponse.json({ success: true, message: "Event broadcasted" });
    } else {
      // If no active client is listening, queue the update as a pending task.
      console.log(`No active session for task: ${taskId}, queueing event`);
      const botProjectId = taskId.substring(0, 36);
      const requestId = taskId.substring(37, 73);
      await prisma.pendingEvent.create({
        data: {
          event,
          data,
          taskId,
          requestId,
          botProjectId,
        },
      });
      return NextResponse.json({ success: true, message: "Event queued" });
    }
  } catch (error) {
    console.error("Error broadcasting event:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
