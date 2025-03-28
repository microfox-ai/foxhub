import { StreamingFucntionProps } from "@repo/ai-utils/router";
import { generateObject, streamText, tool } from "ai";
import { z } from "zod";
import { models } from "../models";
import { getMicrofoxCapabilities } from "./getMicrofoxCapabilities";
import { TokenUsageAnalyticsTracker } from "../analytics/helper";
import { updateTaskInstanceMeta } from "@/utils/services/db_functions/updateClientRequest";
import {
  MICROFOX_LOGO,
  MySlackChannels,
  slackBotSdk,
} from "@/utils/services/slackBotSdk";
import { getClientRequest } from "@/utils/services/db_functions/getClientRequest";

export const isTaskBuildable = (props: StreamingFucntionProps<any, any>) => {
  return tool({
    description: "Checks if the user's task is buildable by Microfox.",
    parameters: z.object({
      task: z.string().describe("The user's task"),
      capabilities: z
        .array(z.string())
        .describe("The capabilities we might need to build the user's task")
        .default([]),
      platforms: z
        .array(z.string())
        .describe("The platforms we might need to build the user's task")
        .default([]),
    }),
    execute: async (
      { task, capabilities, platforms },
      { messages, toolCallId }
    ) => {
      const result = await generateObject({
        model: models.googleGeminiPro,
        schema: z.object({
          isBuildable: z.boolean().describe("Whether the task is buildable"),
          reason: z.string().describe("The reason for the buildability check"),
          taskSummary: z.string().describe("A summary of the user's task that"),
        }),
        system: `
        - You are an expert product manager, who is tasked with checking if the user's task is buildable by Microfox.
        ----
        Microfox capabilities are:
        ${getMicrofoxCapabilities()}
        `,
        prompt: `
        - The user's task is: ${task}
        - The capabilities we might need to build the user's task are: ${capabilities.join(", ")}
        - The platforms we might need to build the user's task are: ${platforms.join(", ")}
        `,
      });
      TokenUsageAnalyticsTracker.trackUsage({
        ...props.requestBody,
        model: models.googleGeminiPro.modelId,
        usage: result.usage,
      });

      if (result.object.isBuildable) {
        await updateTaskInstanceMeta({
          clientRequestId: props.requestBody.clientRequestId,
          taskInstanceMeta: {
            initialSummary: `
            Task:
            ${task}
            ----
            Task Summary:
            ${result.object.taskSummary}
            ----
            Reason:
            ${result.object.reason}
            ----
            Platforms:
            ${platforms.join(", ")}
            ----
            Capabilities:
            ${capabilities.join(", ")}
            `,
          },
        });
        props.dataStream.writeMessageAnnotation({
          type: "ui",
          objectType: "buttons",
          persona: "hellofox",
          text: `Yes, we can build the task`,
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
        });
      } else {
        const clientRequest = await getClientRequest(
          props.requestBody.clientRequestId
        );
        slackBotSdk.sendMessage({
          text: `Hello, makers of mine!, \n\n A user has hit a snag when trying to create a task. \n\n Task: ${task} \n\n Reason: ${result.object.reason} \n\n Please help them out! I'm attaching the link. <${clientRequest?.repoName}|git-repo>. The pull request is not created yet, as the task was deemed not buildable by me.`,
          channel: MySlackChannels.microfox_updates,
          icon_url: MICROFOX_LOGO,
          username: "Microfox",
        });
        props.dataStream.writeMessageAnnotation({
          type: "ui",
          objectType: "isTaskBuildable",
          persona: "hellofox",
          text: `I am sorry, at this moment we cannot build the task. But worry not, Your requested features will be added within 24-48 hrs.`,
          description: result.object.taskSummary,
          reason: result.object.reason,
        });
      }

      return {
        text: result.object.isBuildable
          ? `Yes, we can build the task`
          : `No, we cannot build the task`,
        reason: result.object.reason,
      };
    },
  });
};
