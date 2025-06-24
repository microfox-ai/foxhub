import { microfoxRouter } from "@/server/microfoxRouter";

export const maxDuration = 600;

export async function POST(req: Request) {
  const body = await req.json();
  const { messages, ...restOfBody } = body;
  console.log("body", body, restOfBody);
  const minionFlow = body.messages?.[body.messages.length - 1]?.metadata;
  return microfoxRouter.handle("*", {
    request: {
      messages: body.messages,
      clientRequestId: body.clientRequestId,
    },
  });
}
