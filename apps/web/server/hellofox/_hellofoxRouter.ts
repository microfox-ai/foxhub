import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateObject, streamText } from "ai";
import {
  defaultCallbackResultBody,
  ServerStreamingFunction,
} from "@repo/ai-utils/router";
import { getMicrofoxCharacter } from "./default";
import { hellofoxTools } from "./tools";
import { models } from "../models";
import { aboutMicrofox, aboutMicrofoxInfo } from "./aboutMicrofox";
import { analyseUserIntent } from "./analyzeUsersIntent";
import { getMissingCapabilties } from "./getMissingCapabilties";
import {
  getMicrofoxCapabilities,
  getMicrofoxCapabilitiesTool,
} from "./getMicrofoxCapabilities";
import { isTaskBuildable } from "./isTaskBuildable";
import { guideUserToDoableGoal } from "./guideUserToDoableGoal";
import { sendStruckLogsTool } from "./sendStruckLogs";
import { findLastElementWith } from "@/utils/helpers/array";
import { object, z } from "zod";
import { updateClientRequest } from "@/utils/services/db_functions/updateClientRequest";
import { createMessage } from "@/utils/services/db_functions/messages";
import { prisma } from "@/prisma/prisma";
import { getFox } from "@/utils/services/db_functions/foxes";
import { TokenUsageAnalyticsTracker } from "../analytics/helper";
// 1. HELLO
// 2. CONVERT -> GOAL -> reference
// 3. BUILD ->
// 4. ENV_KEYS ->
// 5. Test ->
// 6. DEPLOY ->
// const google = createGoogleGenerativeAI({
//   apiKey: process.env.GEMINI_API_KEY!,
// });

// HELLO FOX <--> NextFox => CONVERTFox

// if the users task is too simple like one-step, then guide the user to expand his goal, as you can do more than just that. = requires Sequential Thinking to better suggest Ideas
// TODO: SUBHAKAR - give examples of what can be done with microfox.
// TODO: SUBHAKAR - try single tool call for routing purposes & save on token optimisations
// TODO: SUBHAKAR - add tool to confirm the task, & then build it.

// hellofox listens to what the user asks,
// analyses the user's intent
// confirms if the users goal is clear
// & is currently posiibble to build with mirofox capapbilities or not.
// If not, it guides the user to a doable goal.
// If it is too simple, it guides the user to expand his goal.

// THE HELLO ROUTER SETUP IS BAD - THE ANSWER HAS TO GO THROUGH DIRECTLY FROM THE INSIDE OF THE TOOLS (No need to come back & convert & again reprint the same information)
//

// TODO: SUBHAKAR - hellofox is asking too much if the user is lax.

export const hellofoxRouter: ServerStreamingFunction<
  any,
  defaultCallbackResultBody
> = async (props) => {
  const { dataStream, requestBody, responseBody } = props;
  console.log("hellofoxRouter");

  // clean up al messages before starting the conversation
  // VERYY IMPORtANt : SAVES A TON LOT OF TOKENS bypassing the thinking & all other steps
  requestBody.messages = requestBody.messages.map((m: any) => ({
    ...m,
    parts: [findLastElementWith(m.parts, (p: any) => p.type === "text")],
    annotations: [],
    toolInvocations: [],
  }));
  //console.log("requestBody after", requestBody.messages);
  dataStream.writeMessageAnnotation({
    type: "minion",
    value: "hellofox",
  });
  let lastFewMessages =
    requestBody.messages.length > 3
      ? requestBody.messages.slice(-3)
      : requestBody.messages;
  dataStream.writeMessageAnnotation({
    type: "loading",
    text: "Thinking...",
  });
  const { object: classification } = await generateObject({
    model: models.googleGeminiFlash,
    schema: z.object({
      reasoning: z.string(),
      type: z.enum(["casual", "task-related"]),
      complexity: z.enum(["simple", "complex"]),
      //queryType: z.enum(["query", "modification", "answer", "confirmation"]),
    }),
    messages: lastFewMessages,
    system: `Classify the current users Query.
    
    Determine:
    1. Query type (casual, task-related)
    2. Complexity (simple, complex)
    3. Brief reasoning for classification`,
  }); // 4. Query type (query, modification, answer, confirmation)

  //console.log("classification", classification);
  dataStream.writeMessageAnnotation({
    type: "metadata",
    object: classification,
    objectType: "classification",
  });

  let result = null;
  if (classification.type === "task-related") {
    lastFewMessages =
      requestBody.messages.length > 5
        ? requestBody.messages.slice(-5)
        : requestBody.messages;
    // do some shit
    result = streamText({
      model: models.googleGeminiPro,
      system: `
      - You are called Microfox, 
      - your primary intent/job is to fine-grain the users goal & help him finalise on what he wishes to build.
      - you keep your answers/questions short & concise, unless it is needed.
      - you are a great listener, & you are able to understand the user's intent 
      - you call tools that can fetch information or help you think.
      - you communicate complex technical jargon in a easy to understand manner.
      - ALWAYS speak in the first person (as if you aremicrofox).
      ____
      First, analyse the user's intent - call tool - analyseUserIntent.
      If user's task final goal is completely clear, call tool - isTaskBuildable.
      if user's task final goal is completely impossible, call tool - guideUserToDoableGoal.
      ____
      If the task is buildable, just reply back with a summary on how microfox will build it, and ask for confirmation (information can be collected later).
      `,
      messages: lastFewMessages,
      toolCallStreaming: true,
      maxSteps: 3,
      toolChoice: "auto", // force the model to call a tool
      tools: {
        analyseUserIntent: analyseUserIntent(props),
        isTaskBuildable: isTaskBuildable(props),
        guideUserToDoableGoal: guideUserToDoableGoal(props),
      },
      onStepFinish: (step) => {
        console.log("step", step.usage);
      },
      onFinish: async (result) => {
        console.log("result", result.usage);
        TokenUsageAnalyticsTracker.trackUsage({
          ...props.requestBody,
          model: models.googleGeminiPro.modelId,
          usage: result.usage,
        });
      },
      onError: (error) => {
        console.log(
          "error",
          error,
          (error.error as any)?.requestBodyValues?.contents
        );
      },
    });
    //if user's goal is not specific to certain platforms & tools, call tool - analyseUserIntent.
  } else {
    result = streamText({
      model: models.googleGeminiFlash,
      system: `
        ${getMicrofoxCharacter()}
        - always speak in the first person (as microfox).
        ___
        Info About Microfox:
        ${
          classification.complexity === "complex"
            ? getMicrofoxCapabilities()
            : aboutMicrofoxInfo()
        }
        ___
        Respond to the user's query in a short & concise manner.
        End the conversation asking on how you can be of help to the user.
        Never tell about your technicalities, unless asked.
        `,
      messages: lastFewMessages,
      onFinish: (result) => {
        console.log("result", result.usage);
        TokenUsageAnalyticsTracker.trackUsage({
          ...props.requestBody,
          model: models.googleGeminiFlash.modelId,
          usage: result.usage,
        });
      },
    });
  }

  if (result != null) {
    result.mergeIntoDataStream(dataStream, {
      experimental_sendStart: false,
    });
  }

  return {
    responseBody: { ...responseBody },
    appendRequestBody: { ...requestBody },
  };
};
