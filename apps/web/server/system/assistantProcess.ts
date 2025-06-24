import { StreamWriter } from "@repo/ai-utils/helper";
import { AiHandler, AiMiddleware } from "@repo/ai-utils/router";

export const assistantMessageProcessor: AiMiddleware<any, any, any> = async (
  props,
  next
) => {
  const { request, state, writer } = props;

  const { messages } = request;
  let returnRequestBody = {
    ...request,
  };

  console.log("assistantMessageProcessor", request, state, messages);
  if (messages[messages.length - 1]?.role === "assistant") {
    let extraData: Record<string, any> = {};
    returnRequestBody = {
      minionContinue: true,
      ...request,
      ...extraData,
    };
  }

  writer.writeMessageMetadata({
    clientRequestId: returnRequestBody.clientRequestId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    minionType: returnRequestBody.minionType,
    ...returnRequestBody,
  });

  return next();
};
