import { tool } from "ai";
import { z } from "zod";
import { findLastElement } from "@repo/ai-utils/helper";
import { AiToolFactory } from "@microfox/ai-router";

type SendStruckLogsToolMetadata = {
  struckpoint?: string;
};

export const sendStruckLogsTool: AiToolFactory<
  SendStruckLogsToolMetadata,
  any,
  any,
  any
> = (ctx) => {
  return tool<
    {
      struckpoint: string;
    },
    {
      resolution: string;
      minionToShiftTo: string;
      struckpoint: string;
      message: any;
    }
  >({
    description: "Sends the stuck logs to the user",
    inputSchema: z.object({
      struckpoint: z.string().describe("Where are you struck"),
    }),
    execute: async ({ struckpoint }, { messages }) => {
      ctx.response.writeMessageMetadata({
        struckpoint: struckpoint,
      });

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
