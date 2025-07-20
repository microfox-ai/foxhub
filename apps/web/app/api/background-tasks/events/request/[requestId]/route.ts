import { defaultChannel } from "@/lib/background-tasks-sse";
import { prisma } from "@/prisma/prisma";
import { createResponse } from "better-sse";
import { NextResponse, type NextRequest } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ requestId: string }> }
) {
  const { requestId } = await params;
  console.log(`SSE connection opened for request: ${requestId}`);
  return createResponse(request, async (session) => {
    session.state.sessionType = "request";
    session.state.requestId = requestId;
    defaultChannel.register(session);
    console.log(`SSE session registered for request: ${requestId}`);

    console.log(`Checking for pending events for request: ${requestId}`);
    const pendingRequests = await prisma.pendingEvent.findMany({
      where: { requestId: requestId },
    });

    console.log(
      `Found ${pendingRequests.length} pending events for request: ${requestId}`
    );

    for (const pendingRequest of pendingRequests) {
      if (pendingRequest) {
        console.log(
          `Broadcasting pending event ${pendingRequest.event} for request: ${requestId}`
        );
        defaultChannel.broadcast(pendingRequest.data, pendingRequest.event, {
          filter: (s) =>
            s.state.sessionType === "request" &&
            s.state.requestId === requestId,
        });
        console.log(
          `Deleting pending event ${pendingRequest.id} for request: ${requestId}`
        );
        await prisma.pendingEvent.delete({ where: { id: pendingRequest.id } });
      }
    }
  });
}
