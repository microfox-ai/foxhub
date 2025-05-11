import { StreamingFucntionProps } from "@repo/ai-utils/router";
import {
  CodeTemplateAddon,
  codeTemplateAddon,
  codeTemplateType,
  TaskInfo,
  TaskInstanceMetaType,
  TaskIntegrations,
  TaskRequiredInfo,
  taskStructure,
  TaskStructure,
} from "./types";
import {
  createDataStream,
  generateObject,
  Output,
  streamObject,
  streamText,
} from "ai";
import { models } from "../models";
import {
  updateClientRequest,
  updateTaskInstanceMeta,
} from "@/utils/services/db_functions/updateClientRequest";
import { taskPlanningPrompt } from "./prompt.taskPlanning";
import { createStreamableValue } from "ai/rsc";
import { createReadStream } from "fs";
import { TokenUsageAnalyticsTracker } from "../analytics/helper";
import { getMicrofoxCapabilities } from "../hellofox/getMicrofoxCapabilities";
import { getServiceName } from "../buildfox/helper/getServiceName";
const generatePlatformsPrompt = (taskInstanceMeta: TaskInstanceMetaType) => {
  if (!taskInstanceMeta.taskIntegrations) {
    throw new Error("Task integrations not found");
  }
  return `
    ${taskInstanceMeta.taskIntegrations?.platforms?.map((p) => `name: ${p.name};\nreason: ${p.reason};\npackage: ${p.package}`).join("\n")}
    `;
};

export const createTaskStructure = async (
  props: StreamingFucntionProps<any, any>,
  taskInstanceMeta: TaskInstanceMetaType,
  modification?: string
) => {
  const { dataStream, requestBody, responseBody } = props;

  //console.log("sdn", taskInstanceMeta);
  if (!taskInstanceMeta.taskIntegrations || !taskInstanceMeta.taskInfo) {
    throw new Error("Task integrations or task info not found");
  }

  dataStream.writeMessageAnnotation({
    type: "thinking",
    content: "Thinking on how to structure your task",
  });

  try {
    const result = generateObject({
      model: models.claude35Sonnet,
      system: taskPlanningPrompt(),
      prompt: `
        You are a sr. developer, who is tasked with creating a plan of action for a task.
        Task Goal: ${taskInstanceMeta.taskInfo.goal}
        Task Summary: ${taskInstanceMeta.taskInfo.summary}
        Platforms: ${generatePlatformsPrompt(taskInstanceMeta)}
        ${modification ? `Modifications Requested: ${modification}` : ""}
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
        `,
      schema: taskStructure,
      maxRetries: 3,
    });

    // for await (const chunk of result.partialObjectStream) {
    //   //console.log("chunk", chunk);
    //   //const object = chunk.;
    //   //dataStream.write(chunk as any);
    // }
    const response = await result;

    TokenUsageAnalyticsTracker.trackUsage({
      ...props.requestBody,
      model: models.googleGeminiTwoFive.modelId,
      usage: response.usage,
    });

    const object = { ...response.object };
    let templateAddons: CodeTemplateAddon[] = [];
    if (
      taskInstanceMeta.taskIntegrations?.platforms.some((p) =>
        p.name.includes("puppeteer")
      )
    ) {
      templateAddons.push(codeTemplateAddon.enum.sls_puppeteer_chrome);
    }
    if (
      taskInstanceMeta.taskStructure?.templateType ===
      codeTemplateType.enum.upstash_sls
    ) {
      templateAddons.push(codeTemplateAddon.enum.sls_upstash_redis);
    }
    object.templateAddons = templateAddons;

    console.log("result", object);

    dataStream.writeMessageAnnotation({
      type: "thinking",
      content: "Task Structure Generated.",
    });
    //const object = await result.object;
    // console.log("object", object);
    await updateTaskInstanceMeta({
      clientRequestId: requestBody.clientRequestId,
      taskInstanceMeta: {
        ...taskInstanceMeta,
        taskStructure: object,
      },
    });

    dataStream.writeMessageAnnotation({
      type: "ui",
      objectType: "taskStructure",
      object: object as any,
      persona: "taskManager",
      text: `Ready to Build ?`,
      buttons: [
        {
          action: "highlightInput",
          text: "Not Yet",
          type: "deny",
          className: "bg-neutral-200 text-black hover:bg-neutral-300",
        },
        {
          action: "shiftMinion",
          actionText: "Start Building !",
          text: "Start Building !",
          type: "confirm",
          className: "bg-green-500 text-white hover:bg-green-600",
          value: "buildfox",
        },
      ],
    });

    return object;
  } catch (error) {
    console.error("Error creating task structure", error);
    return null;
  }
};
