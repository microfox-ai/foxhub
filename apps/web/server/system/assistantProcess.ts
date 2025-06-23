import { AiHandler, AiMiddleware } from "@repo/ai-utils/router";

export const assistantMessageProcessor: AiMiddleware = async (props, next) => {
  const { request, state, writer } = props;

  const { messages } = request;
  let returnRequestBody = {
    ...request,
  };

  if (messages[messages.length - 1]?.role === "assistant") {
    let annotations = messages[messages.length - 1]?.metadata;
    let extraData: Record<string, any> = {};
    Object.entries(annotations as any).forEach(
      ([key, annotation]: [string, any]) => {
        if (typeof annotation === "object") {
          if (key === "minion") {
            returnRequestBody.minionType = annotation.value;
          }
        }
        let keys = Object.keys(annotation);
        if (keys.includes("type") && keys.includes("value")) {
          extraData[annotation.type] = annotation.value;
          if (annotation.type === "minion") {
            extraData.minionType = annotation.value;
          }
        }
      }
    );
    console.log("extraData", extraData);
    returnRequestBody = {
      minionContinue: true,
      ...request,
      ...extraData,
    };
  }

  return next();
};
