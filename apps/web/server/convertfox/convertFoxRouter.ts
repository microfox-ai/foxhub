import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { streamText } from "ai";
import {
  defaultCallbackResultBody,
  ServerStreamingFunction,
} from "@repo/ai-utils/router";
import { models } from "../models";
import { findLastElementWith } from "@/utils/helpers/array";

// 1. HELLO
// 2. CONVERT -> GOAL -> reference
// 3. BUILD ->
// 4. ENV_KEYS ->
// 5. Test ->
// 6. DEPLOY ->

export const hellofoxRouter: ServerStreamingFunction<
  any,
  defaultCallbackResultBody
> = async (props) => {
  const { dataStream, requestBody, responseBody } = props;
  console.log("hellofoxENdpoint", models.googleGeminiFlash);
  // clean up al messages before starting the conversation
  // console.log("requestBody before", requestBody.messages);
  // VERYY IMPORtANt : SAVES A TON LOT OF TOKENS bypassing the thinking & all other steps
  requestBody.messages = requestBody.messages.map((m: any) => ({
    ...m,
    parts: [findLastElementWith(m.parts, (p: any) => p.type === "text")],
    annotations: [],
    toolInvocations: [],
  }));
  console.log("requestBody after", requestBody.messages);
  const result1 = streamText({
    model: models.claude35Sonnet,
    system: `
        
    `,
    messages: requestBody.messages,
    toolCallStreaming: true,
    maxSteps: 3,
    toolChoice: "auto", // force the model to call a tool
    tools: {},
    onStepFinish: (step) => {
      console.log("step", step.usage);
    },
    onFinish: (result) => {
      console.log("result", result.usage);
    },
    onError: (error) => {
      console.log(
        "error",
        error,
        (error.error as any)?.requestBodyValues?.contents
      );
    },
  });

  //console.log("result1", result1.toolCalls);

  result1.mergeIntoDataStream(dataStream, {
    experimental_sendStart: false,
  });

  return {
    responseBody: { ...responseBody },
    appendRequestBody: { ...requestBody },
  };
};
