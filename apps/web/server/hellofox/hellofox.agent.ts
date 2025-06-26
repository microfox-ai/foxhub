import { findLastElementWith } from "@/utils/helpers/array";
import {
  convertToModelMessages,
  generateObject,
  streamText,
  stepCountIs,
} from "ai";
import { z } from "zod";
import { TokenUsageAnalyticsTracker } from "../analytics/helper";
import { models } from "../models";
import { aboutMicrofoxInfo } from "./_prompts";
import { analyseUserIntent } from "./query/query.analyzeUsersIntent";
import { getMicrofoxCharacter } from "./_prompts";
import { getMicrofoxCapabilities } from "./_prompts";
import { guideUserToDoableGoal } from "./query/query.guideUserToDoableGoal";
import { isTaskBuildable } from "./query/query.isTaskBuildable";
import { confirmSpecifics } from "./query/query.confirmSpecifics";
import { AiAgentKit, AiHandler, AiMiddleware } from "@repo/ai-utils/router";
import hellofoxQueryAgent from "./query/query.agent";
import casualHelloFoxAgent from "./casual/casual.agent";

const helloFoxAgent = new AiAgentKit<any, any, any, any>();

helloFoxAgent.use("/", (ctx, next) => {
  const { request, state, response } = ctx;
  response.writeMessageMetadata({
    minionType: "hellofox",
  });
  return next();
});

helloFoxAgent.actAsTool("/", {
  description: "Analyze the user's message and determine the type of query",
  inputSchema: z.object({
    query: z.string(),
  }),
});

helloFoxAgent.agent("/task-query", hellofoxQueryAgent);
helloFoxAgent.agent("/casual", casualHelloFoxAgent);

helloFoxAgent.agent("/", async (ctx) => {
  const { request, state, response } = ctx;

  console.log("hellofox - agent", state);

  // VERYY IMPORtANt : SAVES A TON LOT OF TOKENS bypassing the thinking & all other steps
  request.messages = request.messages
    .map((m: any) => {
      const lastTextPart = findLastElementWith(
        m.parts,
        (p: any) => p?.type === "text"
      );
      if (!lastTextPart) return null; // Return null if no text part is found
      return {
        ...m,
        parts: [lastTextPart],
        toolInvocations: [],
      };
    })
    .filter(Boolean); // Filter out any null messages

  let lastFewMessages =
    request.messages.length > 8 ? request.messages.slice(-8) : request.messages;
  response.writeMessageMetadata({
    loader: "Analyzing your message...",
  });

  try {
    const classificationResponse = await generateObject({
      model: models.googleGeminiFlash,
      schema: z.object({
        reasoning: z.string(),
        type: z.enum(["casual", "task-query", "task-confirmation"]),
        complexity: z.enum(["simple", "complex"]),
        taskClarity: z.enum(["clear", "ambiguous", "clueless"]),
        //queryType: z.enum(["query", "modification", "answer", "confirmation"]),
      }),
      messages: convertToModelMessages(lastFewMessages),
      system: `Classify the current users Query based on the conversation history.
    
    Determine:
    1. Query type (casual, task-query, task-confirmation)
    2. Complexity (simple, complex)
    3. Brief reasoning for classification
    4. Task Clarity (clear, ambiguous, clueless)
      a. clear - intent is clear with platforms mentioned
      b. ambiguous - intent is clear but platforms are not mentioned
      c. clueless - intent itself is not clear
    `,
    });

    response.writeObjectAsTool({
      toolName: "classification",
      result: classificationResponse,
    });
    response.writeMessageMetadata({
      loader:
        classificationResponse.object?.type === "task-query"
          ? "Thinking about your task..."
          : classificationResponse.object?.type === "task-confirmation"
            ? "Confirming your task..."
            : "Hmm, let me think...",
    });

    let classification = classificationResponse.object;

    ctx.state.classification = classification;

    console.log("helloFox - agent", ctx.state);

    if (classification.type === "task-query") {
      await ctx.next.callAgent("/task-query", request.params);
    } else if (classification.type === "casual") {
      await ctx.next.callAgent("/casual", request.params);
    }
  } catch (error) {
    console.log("error", error);
  }
});

export default helloFoxAgent;

// export const hellofoxRouter: AiMiddleware<any, any, any, any> = async (ctx) => {
//   const { request, state, response } = ctx;
//   console.log("hellofoxRouter");

//   // if (classification.type === "task-confirmation") {
//   //   const response = streamText({
//   //     model: models.googleGeminiPro,
//   //     messages: lastFewMessages,
//   //     system: `
//   //     - You are called Microfox,
//   //     - You are a smart assistant that summarises the user's goals from the conversation history.
//   //     - You output a summary of the user's goals in a suggestive manner.
//   //     - Your summary is very specific & small short format - easy to read, quick to digest, only covering the important stuff.
//   //     - You do not summarize How the task will be built, but only the specific details (like steps to build, platforms to integrate, etc...)
//   //     that would be needed to build the task.
//   //     - You are capable of building the task, if the user agrees to it.
//   //     - ALWAYS speak in the first person (as if you are microfox).
//   // `,
//   //     onFinish: (result) => {
//   //       console.log("summariseUserGoal model usage", result.usage);
//   //       TokenUsageAnalyticsTracker.trackUsage({
//   //         ...props.requestBody,
//   //         model: models.googleGeminiPro.modelId,
//   //         usage: result.usage,
//   //       });
//   //     },
//   //     onError: (error) => {
//   //       console.log("summariseUserGoal error", error);
//   //     },
//   //   });
//   //   response.mergeIntoDataStream(props.dataStream, {
//   //     experimental_sendFinish: true,
//   //   });

//   //   dataStream.writeMessageAnnotation({
//   //     type: "ui",
//   //     objectType: "buttons",
//   //     persona: "hellofox",
//   //     text: `Let's Go!`,
//   //     value: await response.text,
//   //     buttons: [
//   //       {
//   //         action: "removeThisPart",
//   //         text: "Not Yet",
//   //         className: "bg-neutral-200 text-black hover:bg-neutral-300",
//   //       },
//   //       {
//   //         action: "shiftMinion",
//   //         text: "Sure",
//   //         className: "bg-green-500 text-white hover:bg-green-600",
//   //         value: "convertfox",
//   //         actionText: "Sure!, let's proceed!",
//   //       },
//   //     ],
//   //   });
//   // } else

//   // do some shit

//   //if user's goal is not specific to certain platforms & tools, call tool - analyseUserIntent.
// };
