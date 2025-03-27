import { StreamingFucntionProps } from "@repo/ai-utils/router";
import { streamText, tool } from "ai";
import { z } from "zod";
import { models } from "../models";

export const isTaskBuildable = (props: StreamingFucntionProps<any, any>) => {
  return tool({
    description: "Checks if the user's task is buildable by us.",
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
            actionText: "Sure!, let's proceed!",
          },
        ],
      };
    },
  });
};
