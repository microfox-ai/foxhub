import { findLastElementWith } from "@/utils/helpers/array";
import {
  defaultCallbackResultBody,
  ServerStreamingFunction,
} from "@repo/ai-utils/router";
import { generateObject, streamText } from "ai";
import { z } from "zod";
import { TokenUsageAnalyticsTracker } from "../analytics/helper";
import { models } from "../models";
import { aboutMicrofoxInfo } from "./aboutMicrofox";
import { analyseUserIntent } from "./analyzeUsersIntent";
import { getMicrofoxCharacter } from "./default";
import { getMicrofoxCapabilities } from "./getMicrofoxCapabilities";
import { guideUserToDoableGoal } from "./guideUserToDoableGoal";
import { isTaskBuildable } from "./isTaskBuildable";
import { confirmSpecifics } from "./summarizeUserGoal";
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
      type: z.enum(["casual", "task-query", "task-confirmation"]),
      complexity: z.enum(["simple", "complex"]),
      taskClarity: z.enum(["clear", "ambiguous", "clueless"]),
      //queryType: z.enum(["query", "modification", "answer", "confirmation"]),
    }),
    messages: lastFewMessages,
    system: `Classify the current users Query based on the conversation history.
    
    Determine:
    1. Query type (casual, task-query, task-confirmation)
    2. Complexity (simple, complex)
    3. Brief reasoning for classification
    4. Task Clarity (clear, ambiguous, clueless)
      a. clear - intent is clear with platforms mentioned
      b. ambiguous - intent is clear but platforms are not mentioned
      c. clueless - intent itself is not clear`,
  }); // 4. Query type (query, modification, answer, confirmation)

  //console.log("classification", classification);
  dataStream.writeMessageAnnotation({
    type: "metadata",
    object: classification,
    objectType: "classification",
  });

  let result = null;
  // if (classification.type === "task-confirmation") {
  //   const response = streamText({
  //     model: models.googleGeminiPro,
  //     messages: lastFewMessages,
  //     system: `
  //     - You are called Microfox,
  //     - You are a smart assistant that summarises the user's goals from the conversation history.
  //     - You output a summary of the user's goals in a suggestive manner.
  //     - Your summary is very specific & small short format - easy to read, quick to digest, only covering the important stuff.
  //     - You do not summarize How the task will be built, but only the specific details (like steps to build, platforms to integrate, etc...)
  //     that would be needed to build the task.
  //     - You are capable of building the task, if the user agrees to it.
  //     - ALWAYS speak in the first person (as if you are microfox).
  // `,
  //     onFinish: (result) => {
  //       console.log("summariseUserGoal model usage", result.usage);
  //       TokenUsageAnalyticsTracker.trackUsage({
  //         ...props.requestBody,
  //         model: models.googleGeminiPro.modelId,
  //         usage: result.usage,
  //       });
  //     },
  //     onError: (error) => {
  //       console.log("summariseUserGoal error", error);
  //     },
  //   });
  //   response.mergeIntoDataStream(props.dataStream, {
  //     experimental_sendFinish: true,
  //   });

  //   dataStream.writeMessageAnnotation({
  //     type: "ui",
  //     objectType: "buttons",
  //     persona: "hellofox",
  //     text: `Let's Go!`,
  //     value: await response.text,
  //     buttons: [
  //       {
  //         action: "removeThisPart",
  //         text: "Not Yet",
  //         className: "bg-neutral-200 text-black hover:bg-neutral-300",
  //       },
  //       {
  //         action: "shiftMinion",
  //         text: "Sure",
  //         className: "bg-green-500 text-white hover:bg-green-600",
  //         value: "convertfox",
  //         actionText: "Sure!, let's proceed!",
  //       },
  //     ],
  //   });
  // } else
  if (
    classification.type === "task-query" ||
    classification.type === "task-confirmation"
  ) {
    lastFewMessages =
      requestBody.messages.length > 8
        ? requestBody.messages.slice(-8)
        : requestBody.messages;

    let toolUsage = ``;
    if (classification.taskClarity === "clear") {
      // call isTaskBuildable tool
      toolUsage = `- isTaskBuildable: Check if the user's task is buildable & then confirm the task. (make sure to pass in the platforms & requirements)`;
    } else if (classification.taskClarity === "ambiguous") {
      // call analyseUserIntent tool
      toolUsage = `
      - analyseUserIntent: Analyse the user's intent.
      - confirmSpecifics: Confirm the specific details of the task.
      `;
    } else {
      // call guideUserToDoableGoal tool
      toolUsage = `
      - analyseUserIntent: Analyse the user's intent.
      - guideUserToDoableGoal: Guide the user to a doable goal.
      - confirmSpecifics: Confirm the specific details of the task.`;
    }
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
      - ALWAYS speak in the first person (as if you are microfox).
      ----
      Tool usage:
      ${toolUsage}
      ----
      A few things about your workflow:
      - You first think carefully about the users last messages & the tools you have, and analyse what needs to be done.
      - You call the tools given based on your analysis in a pattern that is most likely to give you the best results.
      - The tools will only help you think, & you will have to make the final call on what to respond back to the user.
  
      Critically, you must never ask for any specific details from the user.
      specific details examples:
       - what is the name/url/email of the website/app/repo/etc?
       - can you provide API keys/tokens/etc of your slack/whatsapp/etc?

       You can ask for moderate details, like:
       - do you wish to integrate you web app / backend with another service ?
       - do you want to integrate with slack/whatsapp/etc ?

      DO NOT CALL ANY OTHER TOOL further, if isTaskBuildable is called.
      `,
      messages: lastFewMessages,
      toolCallStreaming: true,
      maxSteps: 3,
      toolChoice: "auto", // force the model to call a tool
      tools: {
        ...(classification.taskClarity === "clear"
          ? {
              isTaskBuildable: isTaskBuildable(props),
            }
          : classification.taskClarity === "ambiguous"
            ? {
                analyseUserIntent: analyseUserIntent(props),
                confirmSpecifics: confirmSpecifics(props),
              }
            : {
                analyseUserIntent: analyseUserIntent(props),
                guideUserToDoableGoal: guideUserToDoableGoal(props),
                confirmSpecifics: confirmSpecifics(props),
              }),
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
            ? `${aboutMicrofoxInfo()}\n\n${getMicrofoxCapabilities()}`
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
