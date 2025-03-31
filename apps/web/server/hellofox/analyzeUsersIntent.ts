import { models } from "../models";
import { streamText } from "ai";
import { StreamingFucntionProps } from "@repo/ai-utils/router";
import { tool } from "ai";
import { z } from "zod";
import { TokenUsageAnalyticsTracker } from "../analytics/helper";

/** Thinking tool */
export const analyseUserIntent = (props: StreamingFucntionProps<any, any>) => {
  return tool({
    description:
      "Analyse & understand the user's intent & create a plausible plan to achieve the goal.",
    parameters: z.object({
      userIntent: z
        .string()
        .describe("The user's intent based on the previous messages"),
    }),
    execute: async ({ userIntent }, options) => {
      props.dataStream.writeMessageAnnotation({
        type: "thinking",
        toolName: "analyseUserIntent",
        toolCallId: options.toolCallId,
        content: `Analyse & understand the user's intent & confirm the user's goal`,
      });
      const response = streamText({
        model: models.googleGeminiPro,
        messages: options.messages,
        //prompt: `${userIntent}`,
        system: `
        - You are an expert at automations, and a user has come to you with a task.
        - you deep-analyse the users intent & understand or estimate the users final goal/task. 
        - your primary goal is to understand / estimate what to build (& not how to build it).
        - you need not clarify any specific information on how to build it, you only need to clarify the users end-goal
        ---
        You run in a loop of Thought, Action, PAUSE, Observation.
        At the end of the loop you output an Answer
        Use Thought to describe your thoughts about the question you have been asked.
        Use Action to run one of the actions available to you - then return PAUSE.
        Observation will be the result of running those actions.
        At the end of the loop you output an Answer
        ----
        The user's intent is: ${userIntent}.
        ---
    `,
        onFinish: (result) => {
          console.log("analyzeUsersIntent model usage", result.usage);
          TokenUsageAnalyticsTracker.trackUsage({
            ...props.requestBody,
            model: models.googleGeminiPro.modelId,
            usage: result.usage,
          });
        },
        onError: (error) => {
          console.log("analyzeUsersIntent error", error);
        },
      });
      response.mergeIntoDataStream(props.dataStream, {
        experimental_sendFinish: true,
      });
      return response.text;
    },
  });
};
