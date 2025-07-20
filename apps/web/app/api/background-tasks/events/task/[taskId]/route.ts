import { defaultChannel } from "@/lib/background-tasks-sse";
import { createResponse, type Session } from "better-sse";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Handles GET requests to establish a Server-Sent Events (SSE) connection
 * for a specific task.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { taskId: string } }
) {
  const { taskId } = params;

  return createResponse(request, (session) => {
    // Initialize session state
    session.state = {
      ...session.state,
      sessionType: "task",
      taskId,
    };

    defaultChannel.register(session);

    // Check for and send any pending updates for this task
    const pendingTasks =
      (defaultChannel.state.pendingTasks as Record<
        string,
        { data: any; event: string }
      >) ?? {};

    if (pendingTasks[taskId]) {
      const { data, event } = pendingTasks[taskId];
      session.push(data, event);
      delete pendingTasks[taskId];
      defaultChannel.state.pendingTasks = pendingTasks;
    }
  });
}

const isMatchingSession = (session: Session, taskId: string): boolean => {
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
      "triggered for taskId",
      taskId,
      event,
      data,
      isClientUpdate,
      request.headers.get("x-task-protection-key")
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
    console.log(
      "isClientUpdate",
      isClientUpdate,
      defaultChannel.activeSessions?.length
    );

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
      const botProjectId = taskId.substring(0, 36);
      const requestId = taskId.substring(37, 73);
      defaultChannel.state.pendingTasks = {
        ...(defaultChannel.state.pendingTasks ?? {}),
        [taskId]: { data, event, taskId, requestId, botProjectId },
      };
      console.log(
        "pendingTasks",
        defaultChannel.state.pendingTasks,
        defaultChannel.activeSessions?.length
      );
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
