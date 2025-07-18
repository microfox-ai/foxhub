import { defaultChannel, getTaskChannel } from "@/lib/background-tasks-sse";
import { createChannel, createResponse } from "better-sse";
import { NextResponse, type NextRequest } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const { taskId } = await params;
  console.log("taskId", taskId);
  return createResponse(request, (session) => {
    //const channel = getTaskChannel(taskId);
    session.state.sessionType = "task";
    session.state.taskId = taskId;
    defaultChannel.register(session);
  });
}

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
    if (isClientUpdate && defaultChannel.activeSessions?.length > 0) {
      console.log("broadcasting event", data, defaultChannel.activeSessions);
      defaultChannel.broadcast(data, event, {
        filter: (session) =>
          Boolean(
            (session.state.sessionType === "task" &&
              session.state.taskId === taskId) ||
              (session.state.sessionType === "project" &&
                session.state.projectId &&
                taskId.includes(session.state.projectId as string)) ||
              (session.state.sessionType === "request" &&
                session.state.requestId &&
                taskId.includes(session.state.requestId as string))
          ),
      });
      return NextResponse.json({ success: true, message: "Event broadcasted" });
    } else {
      defaultChannel.emit("event", data, event);
    }
    return NextResponse.json({
      success: true,
      message: "Event Sent to Server",
    });
  } catch (error) {
    console.error("Error broadcasting event:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
