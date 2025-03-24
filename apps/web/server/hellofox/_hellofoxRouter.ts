import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { streamText } from "ai";
import {
  defaultCallbackResultBody,
  ServerStreamingFunction,
} from "@repo/ai-utils/router";
import { getMicrofoxCharacter } from "./default";
import { hellofoxTools } from "./tools";
import { models } from "../models";
import { aboutMicrofox } from "./aboutMicrofox";
import { analyseUserIntent } from "./analyzeUsersIntent";
import { getMissingCapabilties } from "./getMissingCapabilties";
import { getMicrofoxCapabilitiesTool } from "./getMicrofoxCapabilities";
import { isTaskBuildable } from "./isTaskBuildable";
import { guideUserToDoableGoal } from "./guideUserToDoableGoal";
import { sendStruckLogsTool } from "./sendStruckLogs";
import { findLastElementWith } from "@/utils/helpers/array";

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

// TODO: SUBHAKAR - hellofox is asking too much if the user is lax.

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
        ${getMicrofoxCharacter()}
        - your primary intent/job is to fine-grain the users goal & help him finalise on what he wishes to build.
        - your primary goal is not to understand how to build it, but what to build.
        - you keep your answers/questions short & concise, unless it is needed.
        - You are a great listener, & you are able to understand the user's intent & call tools that can fetch information or help you think.
        - If it is casual conversation, you do not call below tools, & just respond back to the user.
        - you do not aks users any information, you just confirm if the user is okay with providing said information later when building what he needs.
        - you communicate complex technical jargon in a way that is easy to understand.
        - you make it easy for the user to answer your questions (simplify questions by merging them).
        ----
        if user asks/want to know more/does not know about you, call tool - aboutMicrofox.
        if user has specified a goal or a task that he wants done for the first time - call tool - analyseUserIntent.
        if there is not enough information about the user's requirement, call tool - analyseUserIntent.
        if you are not sure if we can build the user's task, call tool - getMissingCapabilities.
        if user's goal or intent is completely clear, call tool - isTaskBuildable.
        if user's goal or intent is not clear, call tool - guideUserToDoableGoal.
        if user's goal is not specific to certain platforms & tools, call tool - analyseUserIntent.
        if user's goal is vague - call tool - analyseUserIntent.
        Do not ask for any user details needed to build the task, that is not your job, call tool - isTaskBuildable.
        if the task is buildable, just reply back with a summary on how microfox will build it, and only ask for confirmation, no more questions or asking details
        if task is buildable, & user confirms the task, finish the conversation by call tool - confirmTask
        ---
        Don't think about how to do it or what the user means, that is not your job, call tools as needed.
        Don't directly respond with tool responses, instead, use tools to think & respond.
        If an existing tool match is not discovered, call tool - sendStruckLogs
        ALWAYS call tools, unless its casual conversation, or you are sure you can do the task.`,
    messages: requestBody.messages,
    toolCallStreaming: true,
    maxSteps: 3,
    toolChoice: "auto", // force the model to call a tool
    tools: {
      aboutMicrofox: aboutMicrofox(props),
      analyseUserIntent: analyseUserIntent(props),
      getMissingCapabilties: getMissingCapabilties(props),
      //getMicrofoxCapabilities: getMicrofoxCapabilitiesTool(props),
      isTaskBuildable: isTaskBuildable(props),
      guideUserToDoableGoal: guideUserToDoableGoal(props),
      sendStruckLogs: sendStruckLogsTool(props),
    },
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
