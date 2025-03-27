import { models } from "../models";
import { streamText } from "ai";
import { StreamingFucntionProps } from "@repo/ai-utils/router";
import { tool } from "ai";
import { z } from "zod";
import { TokenUsageAnalyticsTracker } from "../analytics/helper";

/** Thinking tool */
export const selfSummariseUserGoal = (
  props: StreamingFucntionProps<any, any>
) => {
  return tool({
    description:
      "Self Summarise the user's goals - make assumptions if needed.",
    parameters: z.object({
      initialIntent: z.string().describe("The initial intent of the user"),
    }),
    execute: async ({ initialIntent }, options) => {
      props.dataStream.writeMessageAnnotation({
        type: "thinking",
        toolName: "selfSummariseUserGoal",
        toolCallId: options.toolCallId,
        content: `Self Summarise the user's goals - make assumptions if needed.`,
      });
      const response = streamText({
        model: models.googleGeminiPro,
        //messages: options.messages,
        prompt: `${initialIntent}`,
        system: `
        - You are called Microfox,
        - you are a helpful assistant that summarises the user's goals.
        - you make assumptions if needed.
        - you can think from the perspective of the user.
        - and make assumptions that are best suited for the user.
        - You output a summary of the user's goals in a suggestive manner.
    `,
        onFinish: (result) => {
          console.log("summariseUserGoal model usage", result.usage);
          TokenUsageAnalyticsTracker.trackUsage({
            ...props.requestBody,
            model: models.googleGeminiFlash.modelId,
            usage: result.usage,
          });
        },
        onError: (error) => {
          console.log("summariseUserGoal error", error);
        },
      });
      response.mergeIntoDataStream(props.dataStream, {
        experimental_sendFinish: true,
      });
      return {
        text: response.text,
        buttons: [
          {
            action: "removeThisPart",
            text: "Not Yet",
            className: "bg-neutral-200 text-black hover:bg-neutral-300",
          },
          {
            action: "shiftMinion",
            text: "Sure",
            className: "bg-green-500 text-white hover:bg-green-600",
            value: "convertfox",
            actionText: "Sure!, let's proceed!",
          },
        ],
      };
    },
  });
};
