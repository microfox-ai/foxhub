import {
  updateClientRequest,
  updateTaskInstanceMeta,
} from "@/utils/services/db_functions/updateClientRequest";
import { PackageInfoHelper } from "@/utils/services/embeddings/packageSearch";
import { generateObject, tool } from "ai";
import { z } from "zod";
import { TokenUsageAnalyticsTracker } from "../../../analytics/helper";
import { getMicrofoxCapabilities } from "../../../hellofox/_prompts";
import { models } from "../../../models";
import { PackageStatus } from "../../../types";
import {
  taskInfo,
  taskInstance,
  TaskInstanceMetaType,
} from "../../helpers/types";
import { AiToolFactory } from "@repo/ai-utils/router";
import { uiTool } from "@/server/ui/uiTool";

type CreateTaskInfoToolMetadata = {
  loader?: string;
  taskInstanceMeta?: TaskInstanceMetaType;
  modification?: string;
  convertfox_job?: string;
};

export const createTaskInfo: AiToolFactory<
  CreateTaskInfoToolMetadata,
  any,
  any,
  any
> = (ctx) => {
  const { classification } = ctx.request.params || {};
  return tool<
    {
      taskInstanceMeta?: any;
      modification?: string;
    },
    {
      taskInfo: any;
    }
  >({
    description:
      classification === "modification"
        ? "Modifies task information based on user requirements and available packages."
        : "Creates task information based on user requirements and available packages.",
    inputSchema:
      classification === "modification"
        ? z.object({
            taskInstanceMeta: taskInstance.or(z.any()),
            modification: z.string().optional(),
          })
        : z.object({
            taskInstanceMeta: taskInstance.or(z.any()),
          }),
    execute: async (
      { taskInstanceMeta, modification },
      { messages, toolCallId }
    ) => {
      ctx.response.writeMessageMetadata({
        loader: "Creating your automation task",
      });

      const messagesText = messages.reduce((acc: any, message: any) => {
        acc += `${message.role}: ${message.content}\n`;
        return acc;
      }, "");

      const packageList = await PackageInfoHelper.getAllPackages({
        statuses: [
          PackageStatus.STABLE,
          PackageStatus.SEMISTABLE,
          PackageStatus.EXTERNAL,
        ],
      });

      const result = await generateObject({
        model: models.googleGeminiPro,
        system: modification
          ? `You are a task expert and also have developer experience.
            You know all about the task.
            You know our capabilities & limitations.
            You are given a task summary and a user query to modify the task.
            You need to re-create a task info based on the previous Info and the user query.
            ----
            ${getMicrofoxCapabilities()}
            Packages/Platforms we support:
            ${packageList.map((pkg) => pkg.package_name).join(", ")}
            `
          : `
            You are a task expert and also have developer experience.
            You know our capabilities & limitations.
            You create a task info based on the summary given to you
            Make sure you read task summary, platforms properly, & our capabilities before you can generate the task details
            ----
            ${getMicrofoxCapabilities()}
                    Packages/Platforms we support:
            ${packageList.map((pkg) => pkg.package_name).join(", ")}
            ----
            webhooks, api calls, ai tools, etcs are all done via lambda functions.
            schedueld tasks, background jobs, etcs are all done via cron jobs.
        `,
        schema: taskInfo,
        prompt: modification
          ? `
            previous task info: ${JSON.stringify(taskInstanceMeta.taskInfo)}
            user query: ${modification}
            `
          : `
            task summary: ${taskInstanceMeta.initialSummary}
            Initial chat with users: 
            ${messagesText}
            `,
      });

      ctx.response.writeMessageMetadata({
        loader: "Task info generated !",
      });

      await updateTaskInstanceMeta({
        clientRequestId: ctx.request.clientRequestId,
        taskInstanceMeta: {
          ...taskInstanceMeta,
          taskInfo: result.object,
        },
      });

      await updateClientRequest({
        clientRequestId: ctx.request.clientRequestId,
        title: result.object.name,
      });

      TokenUsageAnalyticsTracker.trackUsage({
        userId: ctx.request.userId,
        clientRequestId: ctx.request.clientRequestId,
        originClientRequestId: ctx.request.originClientRequestId,
        model: models.googleGeminiFlash.modelId,
        usage: result.usage,
      });

      ctx.response.writeCustomTool(
        uiTool.construct<"card">("convertfox", "task_info", {
          uiType: "card",
          text: modification
            ? `I have modified the task info. Shall we proceed ?`
            : `I have created the task info. Shall we proceed ?`,
          object: {
            objectType: "task_info",
            object: result.object,
          },
          buttons: [
            {
              text: "Yes, That's Correct!",
              type: "confirm",
              action: {
                id: "appendMessage",
                actionText: "Yes, That's Correct!",
              },
            },
          ],
        })
      );

      if (ctx.state.taskInstanceMeta) {
        ctx.state.taskInstanceMeta.taskInfo = result.object;
      }

      ctx.response.writeMessageMetadata({
        convertfox_job: "task_info",
      });

      return {
        taskInfo: result.object,
      };
    },
  });
};
