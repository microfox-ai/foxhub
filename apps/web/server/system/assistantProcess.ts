import { StreamWriter } from "@repo/ai-utils/helper";
import { AiHandler, AiMiddleware } from "@repo/ai-utils/router";

export const assistantMessageProcessor: AiMiddleware<any, any, any> = async (
  props,
  next
) => {
  const { request, state, response } = props;

  console.log("assistantMessageProcessor", state, response);

  try {
    //console.log("assistantMessageProcessor", request, state, response);
    const { messages } = request;
    let returnRequestBody = {
      ...request,
    };

    if (messages[messages.length - 1]?.role === "assistant") {
      let extraData: Record<string, any> = {};
      returnRequestBody = {
        minionContinue: true,
        ...request,
        ...extraData,
      };
    }

    response.writeMessageMetadata({
      clientRequestId: returnRequestBody.clientRequestId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      minionType: returnRequestBody.minionType,
    });

    return next();
  } catch (error) {
    console.error("assistantMessageProcessor", error);
    return;
  }
};
