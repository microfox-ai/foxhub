import { MinionFlow, MinionType } from "@/components/screens/hooks/convertors";
import { microfoxRouter } from "@/server/microfoxRouter";
import { UIMessage } from "ai";

export const maxDuration = 6000;

export async function POST(req: Request) {
  const body = await req.json();
  const { messages, ...restOfBody } = body;
  // console.log("body", body, restOfBody);
  const lastMessage = body.messages?.[body.messages.length - 1] as UIMessage<
    any,
    any
  >;
  let minionFlow = lastMessage?.metadata?.minionFlow ?? restOfBody.minionFlow;
  if (minionFlow === MinionFlow.Unknown) {
    minionFlow = MinionFlow.BuildFlow;
  }
  const minionType = lastMessage?.metadata?.minionType ?? restOfBody.minionType;
  const clientRequestId =
    lastMessage?.metadata?.clientRequestId ?? restOfBody?.clientRequestId;
  // console.log(
  //   "minionFlow",
  //   "/" + minionFlow + "/" + minionType,
  //   restOfBody,
  //   messages[messages.length - 1]
  // );
  const revalidatePath = lastMessage?.metadata?.revalidatePath;

  const response = microfoxRouter.handle(
    revalidatePath ? revalidatePath : "/" + minionFlow,
    {
      request: {
        messages: body.messages,
        ...restOfBody,
        clientRequestId,
        minionType,
        minionFlow,
        loadedRevalidatePath: revalidatePath,
      },
    }
  );
  return response;
}
