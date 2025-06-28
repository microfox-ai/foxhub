import { MinionFlow, MinionType } from "@/components/screens/hooks/convertors";
import { microfoxRouter } from "@/server/microfoxRouter";

export const maxDuration = 600;

export async function POST(req: Request) {
  const body = await req.json();
  const { messages, ...restOfBody } = body;
  // console.log("body", body, restOfBody);
  const lastMessage = body.messages?.[body.messages.length - 1];
  let minionFlow = lastMessage?.metadata?.minionFlow ?? restOfBody.minionFlow;
  if (minionFlow === MinionFlow.Unknown) {
    minionFlow = MinionFlow.BuildFlow;
  }
  const minionType = lastMessage?.metadata?.minionType ?? restOfBody.minionType;
  const clientRequestId =
    lastMessage?.metadata?.clientRequestId ?? restOfBody?.clientRequestId;
  console.log("minionFlow", "/" + minionFlow + "/" + minionType, restOfBody);
  return microfoxRouter.handle("/" + minionFlow, {
    request: {
      messages: body.messages,
      clientRequestId,
      minionType,
      minionFlow,
    },
  });
}
