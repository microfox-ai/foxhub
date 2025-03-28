import { tool } from "ai";

import { StreamingFucntionProps } from "@repo/ai-utils/router";
import { streamText } from "ai";
import { models } from "../models";
import { z } from "zod";
import { getMicrofoxCapabilities } from "./getMicrofoxCapabilities";
import { TokenUsageAnalyticsTracker } from "../analytics/helper";
export const getMissingCapabilties = (
  props: StreamingFucntionProps<any, any>
) => {
  return tool({
    description:
      "Fetches & Sends infrormation about Microfox's capabilities that are missing to build the user's task",
    parameters: z.object({
      task: z.string().describe("The user's goal or task"),
    }),
    execute: async ({ task }, options) => {
      props.dataStream.writeMessageAnnotation({
        type: "thinking",
        toolName: "getMissingCapabilties",
        toolCallId: options.toolCallId,
        content: `Thinking about the missing capabilities of Microfox to build the user's task`,
      });
      const response = streamText({
        model: models.googleGeminiFlash,
        //messages: options.messages,
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
            ...props.requestBody,
            model: models.googleGeminiFlash.modelId,
            usage: result.usage,
          });
        },
        onError: (error) => {
          console.log("getMissingCapabilties error", error);
        },
      });
      response.mergeIntoDataStream(props.dataStream, {
        experimental_sendFinish: true,
      });
      return response.text;
    },
  });
};
