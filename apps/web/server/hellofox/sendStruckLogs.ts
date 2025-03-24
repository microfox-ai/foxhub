import { StreamingFucntionProps } from "@repo/ai-utils/router";
import { findLastElement } from "@repo/ai-utils/helper";
import { tool } from "ai";
import { z } from "zod";

export const sendStruckLogsTool = (props: StreamingFucntionProps<any, any>) => {
  return tool({
    description: "Sends the stuck logs to the user",
    parameters: z.object({
      struckpoint: z.string().describe("Where are you struck"),
    }),
    execute: async ({ struckpoint }, { messages }) => {
      return {
        resolution:
          "At this point, I am not sure how to solve your request. Shall we restart ?",
        minionToShiftTo: "refresh",
        struckpoint: struckpoint,
        message: findLastElement(messages),
      };
    },
  });
};
