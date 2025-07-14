import { getTaskChannel } from "@/lib/background-tasks-sse";
import { createResponse } from "better-sse";
import { type NextRequest } from "next/server";

export function GET(
  request: NextRequest,
  { params }: { params: { taskId: string } }
) {
  const { taskId } = params;

  return createResponse(request, (session) => {
    const channel = getTaskChannel(taskId);
    channel.register(session);
  });
} 
