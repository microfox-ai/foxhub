import { StreamingFucntionProps } from "@repo/ai-utils/router";
import { tool } from "ai";
import { z } from "zod";

export const collectUserInfor = (props: StreamingFucntionProps<any, any>) => {
  return tool({
    description: "Collects user information",
    parameters: z.object({
      userIntent: z.string().describe("The user's intent"),
    }),
    execute: async ({ userIntent }, options) => {
      props.dataStream.writeMessageAnnotation({
        type: "thinking",
        toolName: "collectUserInfor",
        toolCallId: options.toolCallId,
        content: `Collecting user information`,
      });
      return "User information collected";
    },
  });
};
