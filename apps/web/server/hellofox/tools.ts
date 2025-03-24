import { StreamingFucntionProps } from "@repo/ai-utils/router";
import { tool, ToolCallUnion, ToolResultUnion } from "ai";
import { z } from "zod";

// whatToClarify vs. whatWeAreCapableOf
// prompt & messages cant be defined at the same time.

export const hellofoxTools = (props: StreamingFucntionProps<any, any>) => {
  const _functions = {
    // CHECK IF THE USER'S TASK IS BUILDABLE BASED ON THE CAPABILITIES OF MICROFOX - NEEDS FURTHER OPTIMISATIONS

    endConversation: tool({
      description: "confirms the user's task & ends the conversation.",
      parameters: z.object({
        taskTitle: z.string().describe("A short title for the user's task"),
        taskintent: z.string().describe("The intent of the user's task"),
        desctiption: z.string().describe("A complete description of the task"),
      }),
      execute: async ({ taskTitle, desctiption }, { messages, toolCallId }) => {
        props.dataStream.writeMessageAnnotation({
          type: "building",
          toolName: "endConversation",
          toolCallId: toolCallId,
          content: `Creating setups required for the automation`,
        });
        // TODO: VISHWAJEET - create the pull request over here
        // TODO: In future, selectively shift the minion based on the task. because some tasks dont need convertfox, & may
        props.dataStream.writeData({
          taskTitle: taskTitle,
          taskDescription: desctiption,
          toolCallId: toolCallId,
          shiftMinionTo: "convertfox",
        });
        return {
          text: `Thank you for confirming your task. I have created the setups required for the automation. Are you ready to proceed ?`,
        };
      },
    }),
  };

  return {
    ..._functions,
  };
};

export type HelloFoxToolCall = ToolCallUnion<ReturnType<typeof hellofoxTools>>;
export type HelloFoxToolResult = ToolResultUnion<
  ReturnType<typeof hellofoxTools>
>;
