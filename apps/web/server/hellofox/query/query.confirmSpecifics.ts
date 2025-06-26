import { models } from "../../models";
import { streamText, tool } from "ai";
import { z } from "zod";
import { TokenUsageAnalyticsTracker } from "../../analytics/helper";
import { AiToolFactory } from "@repo/ai-utils/router";

type ConfirmSpecificsToolMetadata = {
  loader?: string;
  initialGoal?: string;
  missingDetails?: string[];
};

/** Thinking tool */
export const confirmSpecifics: AiToolFactory<
  ConfirmSpecificsToolMetadata,
  any,
  any,
  any
> = (ctx) => {
  console.log("confirmSpecifics", ctx.executionContext);
  return tool<
    {
      initialGoal: string;
      missingDetails: string[];
    },
    {
      text: string;
    }
  >({
    description:
      "Confirm specifics of the user's goals - make assumptions if needed.",
    inputSchema: z.object({
      initialGoal: z
        .string()
        .describe(
          "The initial goal of the user that is ambiguos & has missing details"
        ),
      missingDetails: z
        .array(z.string())
        .describe("The missing details of the user's goal"),
    }),
    execute: async (
      { initialGoal, missingDetails },
      { messages, toolCallId }
    ) => {
      ctx.response.writeMessageMetadata({
        loader: "Confirming the users needs & specifics...",
      });

      const response = streamText({
        model: models.googleGeminiPro,
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
            userId: ctx.request.userId,
            clientRequestId: ctx.request.clientRequestId,
            originClientRequestId: ctx.request.originClientRequestId,
            model: models.googleGeminiPro.modelId,
            usage: result.usage,
          });
        },
        onError: (error) => {
          console.log("summariseUserGoal error", error);
        },
      });

      ctx.response.merge(response.toUIMessageStream());

      ctx.response.writeMessageMetadata({
        initialGoal: initialGoal,
        missingDetails: missingDetails,
      });

      const responseText = await response.text;

      return {
        text: responseText,
      };
    },
  });
};

// the user has built automations like theese before -
