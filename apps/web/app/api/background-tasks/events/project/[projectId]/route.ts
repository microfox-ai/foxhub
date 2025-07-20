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
    const pendingProjects = (defaultChannel.state.pendingProjects as Record<string, any>) ?? {};
    const matchingKeys = Object.keys(pendingProjects).filter((key) =>
      key.includes(projectId)
    );
    for (const key of matchingKeys) {
      const { data, event } = pendingProjects[key];
      defaultChannel.broadcast(data, event, {
        filter: (s) =>
          s.state.sessionType === "project" &&
          s.state.projectId === projectId,
      });
      delete pendingProjects[key];
    }
    defaultChannel.state.pendingProjects = pendingProjects;
  });
}
