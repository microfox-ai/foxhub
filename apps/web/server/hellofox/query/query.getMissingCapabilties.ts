import { tool, streamText } from "ai";
import { z } from "zod";
import { models } from "../../models";
import { getMicrofoxCapabilities } from "../_prompts";
import { TokenUsageAnalyticsTracker } from "../../analytics/helper";
import { AiToolFactory } from "@microfox/ai-router";

type GetMissingCapabilitiesToolMetadata = {
  loader?: string;
  task?: string;
};

export const getMissingCapabilties: AiToolFactory<
  GetMissingCapabilitiesToolMetadata,
  any,
  any,
  any
> = (ctx) => {
  return tool<
    {
      task: string;
    },
    {
      text: string;
      missingCapabilities: string;
    }
  >({
    description:
      "Fetches & Sends infrormation about Microfox's capabilities that are missing to build the user's task",
    inputSchema: z.object({
      task: z.string().describe("The user's goal or task"),
    }),
    execute: async ({ task }, { messages, toolCallId }) => {
      ctx.response.writeMessageMetadata({
        loader:
          "Thinking about the missing capabilities of Microfox to build the user's task",
      });

      const response = streamText({
        model: models.googleGeminiFlash,
        prompt: `Task is ${task}`,
        system: `
        By analysing the user's goal or task, you can determine the missing capabilities of Microfox to build the user's task.
        current capabilities: ${getMicrofoxCapabilities()}
        ---
        You run in a loop of Thought, Action, PAUSE, Observation.
        At the end of the loop you output an Answer
        Use Thought to describe your thoughts about the question you have been asked.
        Use Action to run one of the actions available to you - then return PAUSE.
        Observation will be the result of running those actions.
        At the end of the loop you output an Answer
        `,
        onFinish: (result) => {
          console.log("getMissingCapabilties model usage", result.usage);
          TokenUsageAnalyticsTracker.trackUsage({
            userId: ctx.request.userId,
            clientRequestId: ctx.request.clientRequestId,
            originClientRequestId: ctx.request.originClientRequestId,
            model: models.googleGeminiFlash.modelId,
            usage: result.usage,
          });
        },
        onError: (error) => {
          console.log("getMissingCapabilties error", error);
        },
      });

      ctx.response.writeMessageMetadata({
        task: task,
      });

      const responseText = await response.text;

      return {
        text: responseText,
        missingCapabilities: responseText,
      };
    },
  });
};
