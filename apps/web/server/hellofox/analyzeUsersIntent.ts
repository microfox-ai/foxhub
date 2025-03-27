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
      userIntent: z.string().describe("The user's intent"),
    }),
    execute: async ({ userIntent }, options) => {
      props.dataStream.writeMessageAnnotation({
        type: "thinking",
        toolName: "analyseUserIntent",
        toolCallId: options.toolCallId,
        content: `Analyse & understand the user's intent & confirm the user's goal`,
      });
      const response = streamText({
        model: models.googleGeminiFlash,
        //messages: options.messages,
        prompt: `${userIntent}`,
        system: `
        - you deep-analyse the users intent & understand or estimate the users goal. 
        - your primary goal is not to understand how to build users goal, but what to build.
        - you do not ask for specific details, you auto-assume the details, based on users intent, and just ask for confirmation.
        - you respond back with simple questions if users goal is not clear yet.
        - if the goal is clear, you just explain & summarize the users end-goal with steps to take & info to collect later. 
        The user's intent is: ${userIntent}. Reference the previous messages to understand the user's intent better.
        ---
        You run in a loop of Thought, Action, PAUSE, Observation.
        At the end of the loop you output an Answer
        Use Thought to describe your thoughts about the question you have been asked.
        Use Action to run one of the actions available to you - then return PAUSE.
        Observation will be the result of running those actions.
        At the end of the loop you output an Answer
    `,
        onFinish: (result) => {
          console.log("analyzeUsersIntent model usage", result.usage);
          TokenUsageAnalyticsTracker.trackUsage({
            ...props.requestBody,
            model: models.googleGeminiFlash.modelId,
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
