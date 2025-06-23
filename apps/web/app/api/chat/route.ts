import { microfoxRouter } from "@/server/microfoxRouter";

export const maxDuration = 600;

export async function POST(req: Request) {
  const body = await req.json();
  //console.log("body", body);
  const minionFlow = body.messages?.[body.messages.length - 1]?.metadata;
  return microfoxRouter.handle(minionFlow, {
    request: {
      messages: body.messages,
    },
  });
}
