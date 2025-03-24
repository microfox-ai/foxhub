import { StreamingFucntionProps } from "@repo/ai-utils/router";
import { streamText, tool } from "ai";
import { z } from "zod";
import { models } from "../models";

export const isTaskBuildable = (props: StreamingFucntionProps<any, any>) => {
  return tool({
    description: "Checks if the user's task is buildable by Microfox.",
    parameters: z.object({
      task: z.string().describe("The user's task"),
      capabilities: z
        .array(z.string())
        .describe(
          "The capabilities of Microfox that are relevant to the user's task"
        )
        .default([]),
      missingCapabilities: z
        .array(z.string())
        .describe(
          "The capabilities of Microfox that are missing to build the user's task"
        )
        .default([]),
    }),
    execute: async (
      { task, capabilities, missingCapabilities },
      { messages, toolCallId }
    ) => {
      if (missingCapabilities.length > 0) {
        return `I am not capable of building this task. Shall we try something else ?`;
      }
      props.dataStream.writeData({
        type: "shiftMinion",
        capabilities: capabilities,
        missingCapabilities: missingCapabilities,
        reason: `Microfox is capable of building the task.`,
        isBuildable: true,
        shiftMinionTo: "convertfox",
        toolName: "isTaskBuildable",
        toolCallId: toolCallId,
      });
      //     const response = streamText({
      //       model: models.googleGeminiFlash,
      //       system: `
      //       - you deep-analyse the users goal from his intent.
      //       - you respond back with questions if needed more clarity
      //       - if the goal is clear, you just explain & summarize the users end-goal with steps to take & info to collect later.
      //       The user's intent is: ${userIntent}. Reference the previous messages to understand the user's intent better.
      //       ---
      //       You run in a loop of Thought, Action, PAUSE, Observation.
      //       At the end of the loop you output an Answer
      //       Use Thought to describe your thoughts about the question you have been asked.
      //       Use Action to run one of the actions available to you - then return PAUSE.
      //       Observation will be the result of running those actions.
      //       At the end of the loop you output an Answer
      //   `,
      //       onError: (error) => {
      //         console.log("analyzeUsersIntent error", error);
      //       },
      //     });
      //     response.mergeIntoDataStream(props.dataStream, {
      //       experimental_sendFinish: true,
      //     });
      return {
        text: `${task} \n\nI am capable of building the above task. Shall we proceed ?`,
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
          },
        ],
      };
    },
  });
};
