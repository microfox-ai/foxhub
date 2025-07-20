import { defaultChannel } from "@/lib/background-tasks-sse";
import { prisma } from "@/prisma/prisma";
import { createResponse } from "better-sse";
import { type NextRequest } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  console.log(`SSE connection opened for project: ${projectId}`);
  return createResponse(request, async (session) => {
    session.state.sessionType = "project";
    session.state.projectId = projectId;
    defaultChannel.register(session);
    console.log(`SSE session registered for project: ${projectId}`);

    console.log(`Checking for pending events for project: ${projectId}`);
    const pendingEvents = await prisma.pendingEvent.findMany({
      where: { botProjectId: projectId },
    });

    console.log(
      `Found ${pendingEvents.length} pending events for project: ${projectId}`
    );

    for (const pendingEvent of pendingEvents) {
      console.log(
        `Broadcasting pending event ${pendingEvent.event} for project: ${projectId}`
      );
      defaultChannel.broadcast(pendingEvent.data, pendingEvent.event, {
        filter: (s) =>
          s.state.sessionType === "project" &&
          s.state.projectId === projectId,
      });
      console.log(
        `Deleting pending event ${pendingEvent.id} for project: ${projectId}`
      );
      await prisma.pendingEvent.delete({ where: { id: pendingEvent.id } });
    }
  });
}
