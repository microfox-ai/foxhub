import { generateObject, streamText, tool } from "ai";
import { z } from "zod";
import { models } from "../../models";
import { getMicrofoxCapabilities } from "../_prompts";
import { TokenUsageAnalyticsTracker } from "../../analytics/helper";
import {
  updateClientRequest,
  updateTaskInstanceMeta,
} from "@/utils/services/db_functions/updateClientRequest";
import {
  MICROFOX_LOGO,
  MySlackChannels,
  slackBotSdk,
} from "@/utils/services/slackBotSdk";
import { getClientRequest } from "@/utils/services/db_functions/getClientRequest";
import {
  AiMiddleware,
  AiToolFactory,
  AiToolHandler,
} from "@repo/ai-utils/router";
import { DefaultMessageMetadata } from "../../microfoxRouter";
import { uiTool } from "@/server/ui/uiTool";

type TaskBuildableToolMetadata = {
  loader?: string;
  task?: string;
  clientRequestTitle?: string;
  capabilities?: string[];
  platforms?: string[];
};

export const isTaskBuildable: AiToolFactory<
  TaskBuildableToolMetadata,
  any,
  any,
  any
> = (ctx) => {
  return tool<
    {
      task: string;
      capabilities?: string[];
      platforms?: string[];
    },
    {
      text: string;
      reason: string;
    }
  >({
    description: "Checks if the user's task is buildable by Microfox.",
    inputSchema: z.object({
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
      ctx.response.writeMessageMetadata({
        loader: "Let me verify if this is possible...",
      });
      await updateClientRequest({
        clientRequestId: ctx.request.clientRequestId,
        title: task,
      });
      ctx.response.writeMessageMetadata({
        clientRequestTitle: task,
      });
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
        - The capabilities we might need to build the user's task are: ${
          capabilities?.join(", ") || "None"
        }
        - The platforms we might need to build the user's task are: ${
          platforms?.join(", ") || "None"
        }
        `,
      });
      TokenUsageAnalyticsTracker.trackUsage({
        userId: ctx.request.userId,
        clientRequestId: ctx.request.clientRequestId,
        originClientRequestId: ctx.request.originClientRequestId,
        model: models.googleGeminiPro.modelId,
        usage: result.usage,
      });

      if (result.object.isBuildable) {
        ctx.response.writeMessageMetadata({
          loader: "Just confirmed it is possible.",
        });
        await updateTaskInstanceMeta({
          clientRequestId: ctx.request.clientRequestId,
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
            ${platforms?.join(", ") || "None"}
            ----
            Capabilities:
            ${capabilities?.join(", ") || "None"}
            `,
          },
        });
        ctx.response.writeCustomTool(
          uiTool.constructButtonsList("hellofox", "isTaskBuildable", {
            header: "Yes, I can build this task. Do you wish to proceed ?",
            shiftMinion: "convertfox",
            isUISticky: true,
          })
        );
      } else {
        ctx.response.writeMessageMetadata({
          loader: "Its not possible, but I will let my makers know.",
        });
        const clientRequest = await getClientRequest(
          ctx.request.clientRequestId
        );
        slackBotSdk.sendMessage({
          text: `Hello, makers of mine!, \n\n A user has hit a snag when trying to create a task. \n\n Task: ${task} \n\n Reason: ${result.object.reason} \n\n Please help them out! I'm attaching the link. <${clientRequest?.repoName}|git-repo>. The pull request is not created yet, as the task was deemed not buildable by me.`,
          channel: MySlackChannels.microfox_updates,
          icon_url: MICROFOX_LOGO,
          username: "Microfox",
        });
        ctx.response.writeCustomTool(
          uiTool.construct<"card">("hellofox", "isTaskNotBuildable", {
            uiType: "card",
            isUISticky: true,
            text: `I am sorry, at this moment I cannot build the task. But worry not, Your requested features will be added within 24-48 hrs by makers. I've passed on the details to them. \n\n Reason: ${result.object.reason}`,
            description: result.object.taskSummary,
            reason: result.object.reason,
          })
        );
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
