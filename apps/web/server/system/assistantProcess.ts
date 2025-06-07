import {
  defaultCallbackResultBody,
  ServerStreamingFunction,
  StreamingFucntionProps,
} from "@repo/ai-utils/router";

export const assistantMessageProcessor: ServerStreamingFunction<
  any,
  defaultCallbackResultBody
> = async (props) => {
  const { dataStream, requestBody, responseBody } = props;

  const { messages } = requestBody;
  let returnRequestBody = {
    ...requestBody,
  };

  if (messages[messages.length - 1]?.role === "assistant") {
    let annotations = messages[messages.length - 1]?.annotations;
    let extraData: Record<string, any> = {};
    annotations.forEach((annotation: any) => {
      let keys = Object.keys(annotation);
      if (keys.includes("type") && keys.includes("value")) {
        extraData[annotation.type] = annotation.value;
        if (annotation.type === "minion") {
          extraData.minionType = annotation.value;
        }
      }
    });
    console.log("extraData", extraData);
    returnRequestBody = {
      minionContinue: true,
      ...requestBody,
      ...extraData,
    };
  }

  return {
    responseBody: { ...responseBody },
    appendRequestBody: { ...returnRequestBody },
  };
};
