import { defaultChannel, getTaskChannel } from "@/lib/background-tasks-sse";
import { createChannel, createResponse } from "better-sse";
import { NextResponse, type NextRequest } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ requestId: string }> }
) {
  const { requestId } = await params;
  console.log("requestId", requestId);
  return createResponse(request, (session) => {
    session.state.sessionType = "request";
    session.state.requestId = requestId;
    defaultChannel.register(session);

    const pendingRequests = (defaultChannel.state.pendingRequests as Record<string, any>) ?? {};
    const matchingKeys = Object.keys(pendingRequests).filter((key) =>
      key.includes(requestId)
    );
    console.log("matchingKeys", matchingKeys);
    for (const key of matchingKeys) {
      const { data, event } = pendingRequests[key];
      if (data.requestId === requestId) {
        console.log("broadcasting pending event", data, event);
        defaultChannel.broadcast(data, event, {
          filter: (s) =>
            s.state.sessionType === "request" &&
            s.state.requestId === requestId,
        });
        delete pendingRequests[key];
        console.log("broadcasted pending event", data);
      }
    }
    defaultChannel.state.pendingRequests = pendingRequests;
  });
}
