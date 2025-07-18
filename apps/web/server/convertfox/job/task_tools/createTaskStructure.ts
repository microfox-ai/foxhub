import {
  CodeTemplateAddon,
  codeTemplateAddon,
  codeTemplateType,
  TaskInfo,
  taskInstance,
  TaskInstanceMetaType,
  TaskIntegrations,
  TaskRequiredInfo,
  taskStructure,
  TaskStructure,
} from "../../helpers/types";
import { generateObject } from "ai";
import { models } from "../../../models";
import {
  updateClientRequest,
  updateTaskInstanceMeta,
} from "@/utils/services/db_functions/updateClientRequest";
import { taskPlanningPrompt } from "../../helpers/prompt.taskPlanning";
import { TokenUsageAnalyticsTracker } from "../../../analytics/helper";
import { getMicrofoxCapabilities } from "../../../hellofox/_prompts";
import { getServiceName } from "../../../buildfox/helper/getServiceName";
import { getFunctionNameFromKebabCase } from "../../../buildfox/prompt.coding";
import { AiToolFactory } from "@microfox/ai-router";
import { tool } from "ai";
import { z } from "zod";
import { uiTool } from "@/components/screens/Chat/message/uiTool/mappers/uiTool";

type CreateTaskStructureToolMetadata = {
  loader?: string;
  taskInstanceMeta?: TaskInstanceMetaType;
  modification?: string;
  convertfox_job?: string;
};

const generatePlatformsPrompt = (taskInstanceMeta: TaskInstanceMetaType) => {
  if (!taskInstanceMeta.taskIntegrations) {
    throw new Error("Task integrations not found");
  }
  return `
    ${taskInstanceMeta.taskIntegrations?.platforms?.map((p) => `name: ${p.name};\nreason: ${p.reason};\npackage: ${p.package}`).join("\n")}
    `;
};

export const createTaskStructure: AiToolFactory<
  CreateTaskStructureToolMetadata,
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
      taskStructure: any;
    }
  >({
    description:
      classification === "modification"
        ? "Modifies task structure by planning the architecture and components needed."
        : "Creates task structure by planning the architecture and components needed.",
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
      //console.log("sdn", taskInstanceMeta);
      if (!taskInstanceMeta.taskIntegrations || !taskInstanceMeta.taskInfo) {
        throw new Error("Task integrations or task info not found");
      }

      ctx.response.writeMessageMetadata({
        loader: "Thinking on how to structure your task",
      });

      try {
        const result = generateObject({
          model: models.claude4Sonnet,
          system: taskPlanningPrompt(),
          prompt: `
            You are a sr. full stack developer with high experience in building backend APIs, 
            You are tasked with creating a plan of action for a task.
            Task Goal: ${taskInstanceMeta.taskInfo.goal}
            Task Summary: ${taskInstanceMeta.taskInfo.summary}
            Platforms: ${generatePlatformsPrompt(taskInstanceMeta)}
            ${modification ? `Modifications Requested: ${modification}, PUT A HIGH EMPHASIS ON THESE MODIFICATIONS` : ""}
            ---
            while designing & planning the task, keep our capabilities & limitations in mind.
            ${getMicrofoxCapabilities()}
            ----
            your workflow
            - before you start, you think if a db setup is really required for this job.
            - you only create dbSchema if it is truly required for the task. 
            - if it is minor state management, you use redis inside the serverless functions.
            - then you divide all the functionalities that are needed to achieve the task into 2 types: - lambda functions (API endpoints) & cron jobs (scheduled tasks).
            - if a cron job does the job, no need to create a lambda function, unless it is truly required.
            - you create the required cron jobs, if any.
            - you then create the lambda functions, if any.
            - if the code file might require packages other than the ones mentioned here, also include them in the genrated functions & cronJobs
            - you also decide the template type to use for the task.
              - plain_sls: for simple tasks that do not require a db or a state in the serverless function.
              - upstash_sls: for tasks that require a state/minor database in the serverless function.
            - create dbSchemas only if is truly required to share data across the lifecyle or multiple different lambda functions (like cron jobs).
            ---
            some rules
            - Never use theese packages - axios
            - Cron functions cannot call the created lambda functions.
            - MAKE SURE THAT CRON JOBS BRIEF DOES NOT MENTION ANY LAMBDA FUNCTIONS.
            - paths dont have dynamic slugs, they are static.
            - Keep the entire structure lean & sinple, with each function/cronjob doing end-to-end jobs 
            - do not divide a job into multiple functions unless it absolutely makes sense
            ---
            name should always be in camel case, without any extension.
            brief: should be as detailed as possible of the code step by step
            ----
            webhooks, api calls, ai tools, etcs are all done via lambda functions.
            schedueld tasks, background jobs, etcs are all done via cron jobs.
            `,
          schema: taskStructure,
          maxRetries: 3,
        });

        const response = await result;

        TokenUsageAnalyticsTracker.trackUsage({
          userId: ctx.request.userId,
          clientRequestId: ctx.request.clientRequestId,
          originClientRequestId: ctx.request.originClientRequestId,
          model: models.claude4Sonnet.modelId,
          usage: response.usage,
        });

        const object = { ...response.object };
        let templateAddons: CodeTemplateAddon[] = [];
        if (object?.templateType === codeTemplateType.enum.upstash_sls) {
          templateAddons.push(codeTemplateAddon.enum.sls_upstash_redis);
        }
        object.templateAddons = templateAddons;

        ctx.response.writeMessageMetadata({
          loader: "Task Structure Generated.",
        });

        await updateTaskInstanceMeta({
          clientRequestId: ctx.request.clientRequestId,
          taskInstanceMeta: {
            ...taskInstanceMeta,
            taskStructure: {
              ...object,
              lambdaFunctions: object.lambdaFunctions?.map((lambda) => ({
                ...lambda,
                name: getFunctionNameFromKebabCase(lambda.name),
              })),
              cronJobs: object.cronJobs?.map((cron) => ({
                ...cron,
                name: getFunctionNameFromKebabCase(cron.name),
              })),
              dbSchemas: object.dbSchemas?.map((db) => ({
                ...db,
                modelName: getFunctionNameFromKebabCase(db.modelName),
              })),
            },
          },
        });

        ctx.response.writeCustomTool(
          uiTool.construct<"card">("convertfox", "task_structure", {
            uiType: "card",
            text: "Ready to Build ?",
            object: {
              objectType: "task_structure",
              object: object as any,
            },
            buttons: [
              {
                action: {
                  id: "shiftMinion",
                  props: "buildfox",
                  actionText: "Start Building !",
                },
                text: "Start Building !",
                type: "confirm",
              },
            ],
          })
        );

        if (ctx.state.taskInstanceMeta) {
          ctx.state.taskInstanceMeta.taskStructure = object;
        }

        ctx.response.writeMessageMetadata({
          convertfox_job: "task_structure",
        });

        return {
          taskStructure: object,
        };
      } catch (error) {
        console.error("Error creating task structure", error);
        return {
          taskStructure: null,
        };
      }
    },
  });
};
