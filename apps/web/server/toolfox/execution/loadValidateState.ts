import { prisma } from "@/prisma/prisma";
import { ApiMcp } from "@/utils/services/embeddings/packageSearch";
import { AiContext, AiMiddleware } from "@microfox/ai-router";

/**
 * If the tool continuation is requested, we need to reconstruct the toolPopulatedMcps from the last known state.
 * @param ctx - The context object containing the request and state.
 * @param next - The next middleware function to call.
 * @returns The next middleware function.
 */
export const restoreLastKnownState: AiMiddleware<any, any, any, any> = async (
  ctx,
  next
) => {
  // if tool continuation is requested, we need to reconstruct the toolPopulatedMcps from the last known state.
  if (ctx.request.loadedRevalidatePath) {
    ctx.response.writeMessageMetadata({
      loader: "Restoring the tools.",
    });
    const lastKnownState = await prisma.chatAgenticState.findUnique({
      where: {
        originClientRequestId: ctx.request.clientRequestId,
      },
    });
    ctx.state.toolMode = (lastKnownState?.state as any).toolMode;
    ctx.state.toolExecType = (lastKnownState?.state as any).toolExecType;
    ctx.state.toolPopulatedMcps = (
      lastKnownState?.state as any
    ).toolPopulatedMcps;
    console.log(
      "restored state",
      ctx.state.toolPopulatedMcps.length,
      ctx.state.toolPopulatedMcps[0].package_name,
      ctx.state.toolPopulatedMcps[0]
    );
  }
  return next();
};

/**
 * Save the passed in tools in the arguments to the database. ( NEEDS TO BE REMOVED )
 * @param ctx - The context object containing the request and state.
 * @returns The toolPopulatedMcps.
 */
export const savePassedInTools = async (ctx: AiContext<any, any, any, any>) => {
  let toolPopulatedMcps = ctx.state.toolPopulatedMcps;
  let clientRequest = ctx.state.clientRequest;
  console.log(
    "saving chatAgenticState",
    ctx.state.toolMode,
    ctx.state.toolExecType,
    toolPopulatedMcps?.[0]?.package_name,
    toolPopulatedMcps?.[0]
  );
  await prisma.chatAgenticState.upsert({
    where: {
      originClientRequestId: clientRequest.id,
    },
    update: {
      state: {
        toolMode: ctx.state.toolMode,
        toolExecType: ctx.state.toolExecType,
        toolPopulatedMcps: toolPopulatedMcps,
      },
    },
    create: {
      originClientRequestId: clientRequest.id,
      state: {
        toolMode: ctx.state.toolMode,
        toolExecType: ctx.state.toolExecType,
        toolPopulatedMcps: toolPopulatedMcps,
      },
    },
  });
  return toolPopulatedMcps;
};
