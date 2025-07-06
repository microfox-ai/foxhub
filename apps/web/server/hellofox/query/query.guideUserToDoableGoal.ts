import { models } from "../../models";
import { streamText, tool } from "ai";
import { z } from "zod";
import { TokenUsageAnalyticsTracker } from "../../analytics/helper";
import { AiToolFactory } from "@repo/ai-utils/router";

type GuideUserToDoableGoalToolMetadata = {
  loader?: string;
  initialGoal?: string;
  missingCapabilities?: string;
};

export const guideUserToDoableGoal: AiToolFactory<
  GuideUserToDoableGoalToolMetadata,
  any,
  any,
  any
> = (ctx) => {
  return tool<
    {
      initialGoal: string;
      missingCapabilities: string;
    },
    {
      text: string;
      guidance: string;
    }
  >({
    description: "Knows how to guide the user to a doable goal",
    inputSchema: z.object({
      initialGoal: z
        .string()
        .describe("The initial unclear/non-executable goal of the user"),
      missingCapabilities: z
        .string()
        .describe(
          "The capabilities of Microfox that are missing to build the user's task"
        ),
    }),
    execute: async (
      { initialGoal, missingCapabilities },
      { messages, toolCallId }
    ) => {
      ctx.response.writeMessageMetadata({
        loader: "Thinking how to guide the user to a doable goal.",
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
            userId: ctx.request.userId,
            clientRequestId: ctx.request.clientRequestId,
            originClientRequestId: ctx.request.originClientRequestId,
            model: models.googleGeminiFlash.modelId,
            usage: result.usage,
          });
        },
        onError: (error) => {
          console.log("guideUserToDoableGoal error", error);
        },
      });

      ctx.response.merge(response.toUIMessageStream());

      ctx.response.writeMessageMetadata({
        initialGoal: initialGoal,
        missingCapabilities: missingCapabilities,
      });

      const responseText = await response.text;

      return {
        text: responseText,
        guidance: responseText,
      };
    },
  });
};
