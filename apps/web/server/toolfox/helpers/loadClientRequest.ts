import { prisma } from "@/prisma/prisma";
import { AiContext, AiMiddleware } from "@microfox/ai-router";

export const loadClientRequest: AiMiddleware<any, any, any, any> = async (
  ctx,
  next
) => {
  if (!ctx.state.clientRequest) {
    const clientRequest = await prisma.clientRequest.findUnique({
      where: {
        id: ctx.request.clientRequestId,
      },
    });
    ctx.state.clientRequest = clientRequest;
  }
  return next();
};
