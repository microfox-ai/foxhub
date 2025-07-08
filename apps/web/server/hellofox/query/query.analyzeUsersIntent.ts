import { streamText, tool } from "ai";
import { z } from "zod";
import { models } from "../../models";
import { TokenUsageAnalyticsTracker } from "../../analytics/helper";
import { AiToolFactory } from "@microfox/ai-router";

type AnalyzeUserIntentToolMetadata = {
  loader?: string;
  userIntent?: string;
};

export const analyseUserIntent: AiToolFactory<
  AnalyzeUserIntentToolMetadata,
  any,
  any,
  any
> = (ctx) => {
  console.log("analyseUserIntent", ctx.executionContext);
  return tool<
    {
      userIntent: string;
    },
    {
      text: string;
      analysis: string;
    }
  >({
    description:
      "Analyse & understand the user's intent & create a plausible plan to achieve the goal.",
    inputSchema: z.object({
      userIntent: z
        .string()
        .describe("The user's intent based on the previous messages"),
    }),
    execute: async ({ userIntent }, { messages, toolCallId }) => {
      ctx.response.writeMessageMetadata({
        loader: "Deep-Thinking about the user's intent...",
      });

      const response = streamText({
        model: models.googleGeminiPro,
        messages: messages,
        system: `
        - You are an expert at automations, and a user has come to you with a task.
        - you deep-analyse the users intent & understand or estimate the users final goal/task. 
        - your primary goal is to understand / estimate what to build (& not how to build it).
        - you need not clarify any specific information on how to build it, you only need to clarify the users end-goal
        - You build automation, not apps, you build it via serverless functions in node.js, deployed on aws-lambda.
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
            userId: ctx.request.userId,
            clientRequestId: ctx.request.clientRequestId,
            originClientRequestId: ctx.request.originClientRequestId,
            model: models.googleGeminiPro.modelId,
            usage: result.usage,
          });
        },
        onError: (error) => {
          console.log("analyzeUsersIntent error", error);
        },
      });
      ctx.response.merge(response.toUIMessageStream());

      ctx.response.writeMessageMetadata({
        userIntent: userIntent,
      });

      const responseText = await response.text;

      return {
        text: responseText,
        analysis: responseText,
      };
    },
  });
};
