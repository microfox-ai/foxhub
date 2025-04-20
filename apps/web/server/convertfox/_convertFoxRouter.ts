import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateObject, streamText } from "ai";
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
import { z } from "zod";
import { TokenUsageAnalyticsTracker } from "../analytics/helper";
import { createPullRequest } from "../buildfox/createPullRequest";
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
  const lastAssistantMessage = findLastElementWith(
    requestBody.messages,
    (m: any) => m.role === "assistant"
  );
  let lastAssistantJob = lastAssistantMessage.annotations.find(
    (a: any) => a.persona === "taskManager"
  )?.objectType;
  const lastUserMessage = findLastElementWith(
    requestBody.messages,
    (m: any) => m.role === "user"
  );

  dataStream.writeMessageAnnotation({
    type: "loading",
    content: "Checking up on the task progress...",
  });

  let taskInstanceMeta = await getTaskInstanceMeta(requestBody.clientRequestId);
  if (!taskInstanceMeta) {
    taskInstanceMeta = {
      originClientRequestId: requestBody.clientRequestId,
    };
  }
  // only update if the summary is not already set (otherwise take whatever is the last saved version of the summary)
  if (!taskInstanceMeta?.initialSummary) {
    let lastHelloMessage = findLastElementWith(
      requestBody.messages,
      (m: any) =>
        m.annotations?.length > 0 &&
        m.annotations[0]?.type === "minion" &&
        m.annotations[0]?.value === "hellofox"
    );
    let taskFinalisedSummary = findLastElementWith(
      lastHelloMessage.parts,
      (p: any) => p.type === "text"
    );
    console.log("taskFinalisedSummary", taskFinalisedSummary);
    taskInstanceMeta.initialSummary = taskFinalisedSummary.text;
  }

  dataStream.writeMessageAnnotation({
    type: "minion",
    value: "convertfox",
  });

  dataStream.writeMessageAnnotation({
    type: "loading",
    content: "Understanding users intent...",
  });
  // classify the users query
  const { object: classification, usage } = await generateObject({
    model: models.googleGeminiFlash,
    schema: z.object({
      reasoning: z.string(),
      intent: z.enum(["confirmation", "modification", "question"]), // answer, query
      modificationType: z
        .enum(["taskInfo", "taskIntegrations", "taskStructure"])
        .optional(),
      //complexity: z.enum(["simple", "complex"]),
      //queryType: z.enum(["query", "modification", "answer", "confirmation"]),
    }),
    messages: [lastUserMessage],
    system: `Classify the users message.
    
    Determine:
    1. User intent (confirmation, modification, query)
    2. Brief reasoning for classification
    3. If modification, specify the type of modification (taskInfo - change some task level details, taskIntegrations - change the integrations, taskStructure - change the structure/pattern of the task)`,
  });
  TokenUsageAnalyticsTracker.trackUsage({
    ...props.requestBody,
    model: models.googleGeminiFlash.modelId,
    usage: usage,
  });

  if (taskInstanceMeta.taskInfo) {
    const clientRequest = await getClientRequest(requestBody.clientRequestId);
    if (clientRequest && !clientRequest.prUrl) {
      dataStream.writeMessageAnnotation({
        type: "thinking",
        content: "Building a new codebase for your task...",
      });
      await createPullRequest({
        clientRequestId: requestBody.clientRequestId,
        description: taskInstanceMeta.taskInfo?.summary,
        title: taskInstanceMeta.taskInfo?.name,
      });
    }
  }

  console.log("classification", classification, lastAssistantMessage);

  // if the last message of assistant is not t=convertfox, then in the case that taskInstanceMeta.taskInfo already exists,
  // then we can confirm that this is a modification at a later point.
  if (taskInstanceMeta.taskStructure && !lastAssistantJob) {
    if (classification.modificationType) {
      lastAssistantJob = "taskInfo";
      dataStream.writeMessageAnnotation({
        type: "loading",
        text: "Modifying the task " + lastAssistantJob,
        data: classification,
      });
    } else {
      dataStream.writeMessageAnnotation({
        type: "error",
        text: "Unknown intent observered. Please try again.",
        data: classification,
      });
      throw new Error("Unknown intent observered. Please try again.");
    }
  }

  dataStream.writeMessageAnnotation({
    type: "loading",
    text: classification.intent + " observered. Processing...",
    data: classification,
  });

  switch (classification.intent) {
    case "question":
      /// TODO: answer the users query - pass in last 3 messages
      break;
    case "confirmation":
      /// TODO: confirm the task info
      switch (lastAssistantJob) {
        case undefined:
          console.log("Creating task info");
          let taskInfo = await createTaskInfo(props, taskInstanceMeta);
          taskInstanceMeta.taskInfo = taskInfo;
          break;
        case "taskInfo":
          console.log("Creating task integrations");
          let taskIntegrations = await createTaskIntegrations(
            props,
            taskInstanceMeta
          );
          taskInstanceMeta.taskIntegrations = taskIntegrations;
          break;
        case "taskIntegrations":
          console.log("Creating task structure");
          let taskStructure = await createTaskStructure(
            props,
            taskInstanceMeta
          );
          // taskInstanceMeta.taskStructure = taskStructure;
          break;
      }
      break;
    case "modification":
      /// TODO: modify the task info
      switch (lastAssistantJob) {
        case "taskInfo":
          console.log("Modifying task info");
          let taskInfo = await createTaskInfo(
            props,
            taskInstanceMeta,
            lastUserMessage.content
          );
          taskInstanceMeta.taskInfo = taskInfo;
          break;
        case "taskIntegrations":
          console.log("Modifying task integrations");
          let taskIntegrations = await createTaskIntegrations(
            props,
            taskInstanceMeta,
            lastUserMessage.content
          );
          taskInstanceMeta.taskIntegrations = taskIntegrations;
          break;
        case "taskStructure":
          console.log("Modifying task structure");
          let taskStructure = await createTaskStructure(
            props,
            taskInstanceMeta,
            lastUserMessage.content
          );
          if (taskStructure) {
            taskInstanceMeta.taskStructure = taskStructure;
          }
          break;
      }
      break;
    case null:
      console.log("No intent found");
      break;
  }

  return {
    responseBody: {
      ...responseBody,
      taskInstanceMeta: taskInstanceMeta,
    },
    appendRequestBody: { ...requestBody },
  };
};
