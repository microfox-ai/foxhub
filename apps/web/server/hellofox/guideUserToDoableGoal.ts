import { models } from "../models";
import { streamText } from "ai";
import { StreamingFucntionProps } from "@repo/ai-utils/router";
import { tool } from "ai";
import { z } from "zod";

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
        You are an expert in what our software is capable of doing, & can either guide or clarify the user's goal.
        The user does not understand all the complex code & technical jargon, so you need to guide the user in a way that is easy to understand
          `,
        prompt: `The user's initial goal is: ${initialGoal}. Missing capabilities are: ${missingCapabilities}.
        Think what to clarify with the user to get a basic & clear understanding of the goal.
        Return the question that you think is most likely to help in clarifying the user's goal.
        `,
        onFinish: (result) => {
          console.log("guideUserToDoableGoal usage", result);
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
