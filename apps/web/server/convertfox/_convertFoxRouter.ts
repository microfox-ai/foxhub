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
import { updateClientRequest } from "@/utils/services/db_functions/updateClientRequest";
import {
  getClientRequest,
  getTaskInstanceMeta,
} from "@/utils/services/db_functions/getClientRequest";

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
  console.log("convertFoxRouter");
  // clean up al messages before starting the conversation
  // console.log("requestBody before", requestBody.messages);
  // VERYY IMPORtANt : SAVES A TON LOT OF TOKENS bypassing the thinking & all other steps
  // filter out every othe message except the ones from convertfox
  // let convertMessages: any[] = [];
  //console.log("requestBody.messages", requestBody.messages);
  let lastHelloMessage = findLastElementWith(requestBody.messages, (m: any) => {
    if (m.annotations?.length > 0) {
      if (
        m.annotations[0]?.type === "minion" &&
        m.annotations[0]?.value === "hellofox"
      ) {
        return true;
      }
    }
    return false;
  });
  console.log("lastHelloMessage", lastHelloMessage);
  let taskFinalisedSummary = findLastElementWith(
    lastHelloMessage.parts,
    (p: any) => p.type === "text"
  );
  console.log("taskFinalisedSummary", taskFinalisedSummary);

  const taskInstanceMeta = await getTaskInstanceMeta(
    requestBody.clientRequestId
  );
  if (!taskInstanceMeta.initialSummary) {
    taskInstanceMeta.initialSummary = taskFinalisedSummary;
  }
  // router => if(no task info, then create task info, if change in task info, then update task info
  // no integrations, )
  // 1. Create Task Info
  let job;
  if (!taskInstanceMeta?.taskInfo) job = "taskInfo";
  else if (!taskInstanceMeta?.taskIntegrations) job = "taskIntegrations";
  else if (!taskInstanceMeta?.taskStructure) job = "taskStructure";
  else if (!taskInstanceMeta?.taskRequiredInfo) job = "taskRequiredInfo";

  switch (job) {
    case "taskInfo":
      let taskInfo = await createTaskInfo(props, taskInstanceMeta);
      taskInstanceMeta.taskInfo = taskInfo;
      break;
    case "taskIntegrations":
      let taskIntegrations = await createTaskIntegrations(
        props,
        taskInstanceMeta
      );
      taskInstanceMeta.taskIntegrations = taskIntegrations;
      break;
    case "taskStructure":
      let taskStructure = await createTaskStructure(props, taskInstanceMeta);
      taskInstanceMeta.taskStructure = taskStructure;
      break;
    // case "taskRequiredInfo":
    //   let taskRequiredInfo = await createTaskRequiredInfo(
    //     props,
    //     taskInstanceMeta
    //   );
    //   taskInstanceMeta.taskRequiredInfo = taskRequiredInfo;
    //   break;
    default:
      throw new Error("Invalid job");
  }
  return {
    responseBody: {
      ...responseBody,
      taskInstanceMeta: taskInstanceMeta,
    },
    appendRequestBody: { ...requestBody },
  };
};
