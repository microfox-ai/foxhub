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
    let originMessageId = ctx.state?.originMessageId;
    console.log("restoreLastKnownState - originMessageId", originMessageId);
    let uniqueId = originMessageId
      ? originMessageId?.endsWith(ctx.request.clientRequestId)
        ? originMessageId
        : `${originMessageId}-${ctx.request.clientRequestId}`
      : ctx.request.clientRequestId;
    const lastKnownState = await prisma.chatAgenticState.findUnique({
      where: {
        originClientRequestId: uniqueId,
      },
    });
    ctx.state.toolMode = (lastKnownState?.state as any).toolMode;
    ctx.state.toolExecType = (lastKnownState?.state as any).toolExecType;
    ctx.state.selectedMcps = (lastKnownState?.state as any).selectedMcps;
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
  let selectedMcps = ctx.state?.selectedMcps;
  let originMessageId = ctx.state?.originMessageId;
  console.log(
    "saving chatAgenticState",
    ctx.state.toolMode,
    ctx.state.toolExecType,
    toolPopulatedMcps?.[0]?.package_name,
    toolPopulatedMcps?.[0],
    originMessageId
  );
  let uniqueId = originMessageId
    ? originMessageId?.endsWith(clientRequest.id)
      ? originMessageId
      : `${originMessageId}-${clientRequest.id}`
    : clientRequest.id;
  console.log("uniqueId", uniqueId);
  await prisma.chatAgenticState.upsert({
    where: {
      originClientRequestId: uniqueId,
    },
    update: {
      state: {
        toolMode: ctx.state.toolMode,
        toolExecType: ctx.state.toolExecType,
        toolPopulatedMcps: toolPopulatedMcps,
        selectedMcps: selectedMcps,
      },
    },
    create: {
      originClientRequestId: uniqueId,
      state: {
        toolMode: ctx.state.toolMode,
        toolExecType: ctx.state.toolExecType,
        toolPopulatedMcps: toolPopulatedMcps,
        selectedMcps: selectedMcps,
      },
    },
  });
  return toolPopulatedMcps;
};
