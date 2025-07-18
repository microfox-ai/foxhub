import { defaultChannel, getTaskChannel } from "@/lib/background-tasks-sse";
import { createChannel, createResponse } from "better-sse";
import { NextResponse, type NextRequest } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  console.log("projectId", projectId);
  return createResponse(request, (session) => {
    session.state.sessionType = "project";
    session.state.projectId = projectId;
    defaultChannel.register(session);
  });
}
