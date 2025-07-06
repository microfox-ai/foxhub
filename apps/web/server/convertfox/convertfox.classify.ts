import {
  cleanUiMessageParts,
  findLastElementWith,
} from "@/utils/helpers/array";
import {
  getClientRequest,
  getTaskInstanceMeta,
} from "@/utils/services/db_functions/getClientRequest";
import { AiMiddleware } from "@microfox/ai-router";
import { TokenUsageAnalyticsTracker } from "../analytics/helper";
import { createPullRequest } from "../buildfox/createPullRequest";
import { models } from "../models";
import { z } from "zod";
import { convertToModelMessages, generateObject } from "ai";
import { updateTaskInstanceMeta } from "@/utils/services/db_functions/updateClientRequest";

export const convertfoxClassify: AiMiddleware<any, any, any, any> = async (
  ctx
) => {
  const { request, state, response } = ctx;

  console.log("convertfoxRouter", state);

  // Clean up messages to save tokens
  request.messages = cleanUiMessageParts(request.messages, {
    onlyLastText: true,
  });
  response.writeMessageMetadata({
    loader: "Checking up on the task progress...",
  });

  let taskInstanceMeta = await getTaskInstanceMeta(request.clientRequestId);
  if (!taskInstanceMeta) {
    taskInstanceMeta = {
      originClientRequestId: request.clientRequestId,
    };
  }

  // Only update if the summary is not already set
  if (!taskInstanceMeta?.initialSummary) {
    let lastHelloMessage = findLastElementWith(
      request.messages,
      (m: any) =>
        m.annotations?.length > 0 &&
        m.annotations[0]?.type === "minionType" &&
        m.annotations[0]?.value === "hellofox"
    );

    if (lastHelloMessage) {
      let taskFinalisedSummary = findLastElementWith(
        lastHelloMessage.parts,
        (p: any) => p.type === "text"
      );

      if (taskFinalisedSummary && "text" in taskFinalisedSummary) {
        console.log("taskFinalisedSummary", taskFinalisedSummary);
        taskInstanceMeta.initialSummary = taskFinalisedSummary.text;
      }
    }
  }

  response.writeMessageMetadata({
    loader: "Understanding users intent...",
  });

  // Classify the user's query
  const lastUserMessage = findLastElementWith(
    request.messages,
    (m: any) => m.role === "user"
  );

  if (!lastUserMessage) {
    throw new Error("No user message found");
  }

  const { object: classification, usage } = await generateObject({
    model: models.googleGeminiFlash,
    schema: z.object({
      reasoning: z.string(),
      intent: z.enum(["confirmation", "modification", "question"]),
      modificationType: z
        .enum(["taskInfo", "taskIntegrations", "taskStructure"])
        .optional(),
    }),
    messages: convertToModelMessages([lastUserMessage as any]),
    system: `Classify the users message.
      
      Determine:
      1. User intent (confirmation, modification, query)
      2. Brief reasoning for classification
      3. If modification, specify the type of modification 
         a. taskInfo - change some task info level details (goal, summary, more specific details), 
         b. taskIntegrations - change the integrations & platforms to be used 
         c. taskStructure - change the final code structure/pattern of the task`,
  });

  TokenUsageAnalyticsTracker.trackUsage({
    userId: request.userId || "unknown",
    clientRequestId: request.clientRequestId,
    model: models.googleGeminiFlash.modelId,
    usage: usage,
  });

  // Check if we need to create a pull request
  if (taskInstanceMeta.taskInfo) {
    const clientRequest = await getClientRequest(request.clientRequestId);
    if (clientRequest && !clientRequest.prUrl) {
      response.writeMessageMetadata({
        loader: "Building a new codebase for your task...",
      });
      await createPullRequest({
        clientRequestId: request.clientRequestId,
        description: taskInstanceMeta.taskInfo?.summary,
        title: taskInstanceMeta.taskInfo?.name,
      });
    }
  }

  // Determine the last assistant job
  const lastAssistantMessage = findLastElementWith(
    request.messages,
    (m: any) => m.role === "assistant"
  );
  let convertfox_job = (lastAssistantMessage as any)?.metadata?.convertfox_job;

  // Handle modification at later stages
  if (taskInstanceMeta.taskStructure && !convertfox_job) {
    if (classification.modificationType) {
      convertfox_job = "taskInfo";
      response.writeMessageMetadata({
        loader: "Modifying the task " + convertfox_job,
        data: classification,
      });
    } else {
      response.writeMessageMetadata({
        error: "Unknown intent observed. Please try again.",
        data: classification,
      });
      throw new Error("Unknown intent observed. Please try again.");
    }
  }

  response.writeMessageMetadata({
    loader: classification.intent + " observed. Processing...",
    data: classification,
  });

  // Store classification and task instance meta in state
  ctx.state.classification = classification;
  ctx.state.taskInstanceMeta = taskInstanceMeta;
  ctx.state.convertfox_job = convertfox_job;

  console.log("classification", classification, convertfox_job);
  await ctx.next.callAgent("/" + classification.intent);

  //   let _taskInstanceMeta = await updateTaskInstanceMeta(taskInstanceMeta);
  //   // Update state
  //   ctx.state.taskInstanceMeta = _taskInstanceMeta;
};
