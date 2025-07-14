import { getTaskChannel } from "@/lib/background-tasks-sse";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { taskId, event, data, isClientUpdate } = await request.json();
    if (!taskId || !event || !data) {
      return NextResponse.json(
        {
          success: false,
          message: "taskId, event, and data are required",
        },
        { status: 400 }
      );
    }
    if (isClientUpdate) {
      const channel = getTaskChannel(taskId);
      channel.broadcast(data, event);
      return NextResponse.json({ success: true, message: "Event broadcasted" });
    }
    return NextResponse.json({ success: true, message: "Event Sent to Server" });
  } catch (error) {
    console.error("Error broadcasting event:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
} 
