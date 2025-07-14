import { getTaskChannel } from "@/lib/background-tasks-sse";
import { createResponse } from "better-sse";
import { type NextRequest } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const { taskId } = await params;
  console.log("taskId", taskId);
  return createResponse(request, (session) => {
    const channel = getTaskChannel(taskId);
    channel.register(session);
  });
} 
