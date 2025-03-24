import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { streamText } from "ai";
import {
  defaultCallbackResultBody,
  ServerStreamingFunction,
} from "@repo/ai-utils/router";
import { models } from "../models";
import { findLastElementWith } from "@/utils/helpers/array";
import { createTaskInfo } from "./createTaskInfo";
import { createTaskIntegrations } from "./createTaskIntegrations";
import { createTaskRequiredInfo } from "./createTaskRequired";
import { createTaskStructure } from "./createTaskStructure";

// 1. HELLO
// 2. CONVERT -> GOAL -> reference
// 3. BUILD ->
// 4. ENV_KEYS ->
// 5. Test ->
// 6. DEPLOY ->

// TaskCreator - Convert to IntelligentTieringAccessTier, Goal, Summary & List of platforms, isControllableOnFrontend, rquiresInjectionOnWeb, clientSecrets, more specific details.
//

export const convertfoxRouter: ServerStreamingFunction<
  any,
  defaultCallbackResultBody
> = async (props) => {
  const { dataStream, requestBody, responseBody } = props;
  console.log("hellofoxENdpoint", models.googleGeminiFlash);
  // clean up al messages before starting the conversation
  // console.log("requestBody before", requestBody.messages);
  // VERYY IMPORtANt : SAVES A TON LOT OF TOKENS bypassing the thinking & all other steps
  // filter out every othe message except the ones from convertfox
  let convertMessages: any[] = [];
  let lastHelloMessage = findLastElementWith(requestBody.messages, (m: any) => {
    if (m.annotations.length > 0) {
      if (
        m.annotations[0].type === "minion" &&
        m.annotations[0].value === "hellofox"
      ) {
        return true;
      }
    }
    return false;
  });
  let taskFinalisedSummary = lastHelloMessage.parts.find(
    (p: any) => p.type === "text"
  ).text;

  // 1. Create Task Info
  let taskInfo = await createTaskInfo(props, taskFinalisedSummary);

  // 2. Task Integrations
  let taskIntegrations = await createTaskIntegrations(props, taskInfo);

  // 3. Task Required Info
  let taskRequiredInfo = await createTaskRequiredInfo(
    props,
    taskInfo,
    taskIntegrations
  );

  // 4. Task Structure
  let taskStructure = await createTaskStructure(
    props,
    taskInfo,
    taskIntegrations,
    taskRequiredInfo
  );

  //   convertMessages.map((m: any) => ({
  //     ...m,
  //     parts: [findLastElementWith(m.parts, (p: any) => p.type === "text")],
  //     annotations: [],
  //     toolInvocations: [],
  //   }));
  //   console.log("requestBody after", requestBody.messages);

  return {
    responseBody: {
      ...responseBody,
      taskInfo,
      taskIntegrations,
      taskRequiredInfo,
      taskStructure,
    },
    appendRequestBody: { ...requestBody },
  };
};
