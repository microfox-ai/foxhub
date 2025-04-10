import { models } from "../models";
import { streamText } from "ai";
import { StreamingFucntionProps } from "@repo/ai-utils/router";
import { tool } from "ai";
import { z } from "zod";
import { TokenUsageAnalyticsTracker } from "../analytics/helper";

/** Thinking tool */
export const confirmSpecifics = (props: StreamingFucntionProps<any, any>) => {
  return tool({
    description:
      "Confirm specifics of the user's goals - make assumptions if needed.",
    parameters: z.object({
      initialGoal: z
        .string()
        .describe(
          "The initial goal of the user that is ambiguos & has missing details"
        ),
      missingDetails: z
        .array(z.string())
        .describe("The missing details of the user's goal"),
    }),
    execute: async ({ initialGoal, missingDetails }, options) => {
      props.dataStream.writeMessageAnnotation({
        type: "thinking",
        toolName: "confirmSpecifics",
        toolCallId: options.toolCallId,
        content: `Confirming the users needs & specifics...`,
      });
      const response = streamText({
        model: models.googleGeminiPro,
        //messages: options.messages,
        prompt: `Users Goal: ${initialGoal}, Missing Details: ${missingDetails.join(
          ", "
        )}`,
        system: `
        - You are called Microfox,
        - You are given an initial goal of the user that is ambiguos & has missing details.
        - You are tasked with confirming the specifics of the user's goals.
        - you make assumptions if needed for the specifics.
        - you can think from the perspective of the user to make better assumptions.
        - and make assumptions that are best suited for the user.
        - You output a summary of the user's goals in a suggestive manner along with the filled-in details & platforms.
        - you NEVER ask for specific details, you auto-assume the details, based on users initial goal (user can confirm / modify your assumptions later).
    `,
        onFinish: (result) => {
          console.log("confirm specifics model usage", result.usage);
          TokenUsageAnalyticsTracker.trackUsage({
            ...props.requestBody,
            model: models.googleGeminiPro.modelId,
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
        text: await response.text,
      };
    },
  });
};

// the user has built automations like theese before -
