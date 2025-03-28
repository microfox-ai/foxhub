import { models } from "../models";
import { streamText } from "ai";
import { StreamingFucntionProps } from "@repo/ai-utils/router";
import { tool } from "ai";
import { z } from "zod";
import { TokenUsageAnalyticsTracker } from "../analytics/helper";

export const guideUserToDoableGoal = (
  props: StreamingFucntionProps<any, any>
) => {
  return tool({
    description: "Knows how to guide the user to a doable goal",
    parameters: z.object({
      initialGoal: z
        .string()
        .describe("The initial unclear/non-executable goal of the user"),
      missingCapabilities: z
        .string()
        .describe(
          "The capabilities of Microfox that are missing to build the user's task"
        ),
    }),
    execute: async ({ initialGoal, missingCapabilities }, options) => {
      props.dataStream.writeMessageAnnotation({
        type: "thinking",
        toolName: "guideUserToDoableGoal",
        toolCallId: options.toolCallId,
        content: `Thinking how to guide the user to a doable goal.`,
      });
      const response = streamText({
        model: models.googleGeminiFlash,
        system: `
        - You are called Microfox,
        - You are a smart assistant with high EQ that can guide the user to a doable goal.
        - You are an expert in microserverices & lambda functions is capable of doing, & guide the user to a doable goal.
        - you make assumptions if needed.
        - you can think from the perspective of the user.
        - and make assumptions that are best suited for the user.
        - The user does not technical jargon, you need to guide the user in a way that is easy to understand
        - Keep your answers very short & concise.
          `,
        prompt: `The user's initial goal is: ${initialGoal}. Missing capabilities are: ${missingCapabilities}.
        Think what to clarify with the user to get a basic & clear understanding of the goal.
        Return the question that you think is most likely to help in clarifying the user's goal.
        `,
        onFinish: (result) => {
          console.log("guideUserToDoableGoal usage", result);
          TokenUsageAnalyticsTracker.trackUsage({
            ...props.requestBody,
            model: models.googleGeminiFlash.modelId,
            usage: result.usage,
          });
        },
        onError: (error) => {
          console.log("guideUserToDoableGoal error", error);
        },
      });
      response.mergeIntoDataStream(props.dataStream, {
        experimental_sendFinish: true,
      });
      return response.text;
    },
  });
};
