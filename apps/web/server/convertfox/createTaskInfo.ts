import {
  updateClientRequest,
  updateTaskInstanceMeta,
} from "@/utils/services/db_functions/updateClientRequest";
import { PackageInfoHelper } from "@/utils/services/embeddings/packageSearch";
import { StreamingFucntionProps } from "@repo/ai-utils/router";
import { generateObject } from "ai";
import { TokenUsageAnalyticsTracker } from "../analytics/helper";
import { getMicrofoxCapabilities } from "../hellofox/getMicrofoxCapabilities";
import { models } from "../models";
import { PackageStatus } from "../types";
import { taskInfo, TaskInstanceMetaType } from "./types";

export const createTaskInfo = async (
  props: StreamingFucntionProps<any, any>,
  taskInstanceMeta: TaskInstanceMetaType,
  modification?: string
) => {
  const { dataStream, requestBody, responseBody } = props;

  const messages = requestBody.messages.reduce((acc: any, message: any) => {
    acc += `${message.role}: ${message.content}\n`;
    return acc;
  }, "");
  dataStream.writeMessageAnnotation({
    type: "thinking",
    content: "Creating your automation task",
  });
  const packageList = await PackageInfoHelper.getAllPackages({
    statuses: [
      PackageStatus.STABLE,
      PackageStatus.SEMISTABLE,
      PackageStatus.EXTERNAL,
    ],
  });
  //console.log("taskInstanceMeta", taskInstanceMeta);
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
        ${messages}
        `,
  });
  dataStream.writeMessageAnnotation({
    type: "loading",
    content: "Task info generated !",
  });
  //console.log("result", result);
  await updateTaskInstanceMeta({
    clientRequestId: requestBody.clientRequestId,
    taskInstanceMeta: {
      ...taskInstanceMeta,
      taskInfo: result.object,
    },
  });
  await updateClientRequest({
    clientRequestId: requestBody.clientRequestId,
    title: result.object.name,
  });
  TokenUsageAnalyticsTracker.trackUsage({
    ...props.requestBody,
    model: models.googleGeminiFlash.modelId,
    usage: result.usage,
  });
  // save this info into db.
  dataStream.writeMessageAnnotation({
    type: "ui",
    objectType: "taskInfo",
    object: result.object,
    persona: "taskManager",
    text: modification
      ? `I have modified the task info. Shall we proceed ?`
      : `I have created the task info. Shall we proceed ?`,
    buttons: [
      {
        action: "highlightInput",
        text: "Not Yet",
        type: "deny",
        className: "bg-neutral-200 text-black hover:bg-neutral-300",
      },
      {
        action: "appendMessage",
        text: "Yes, That's Correct!",
        type: "confirm",
        className: "bg-green-500 text-white hover:bg-green-600",
        value: "Yes, That's Correct!",
        minionType: "convertfox",
      },
    ],
  });

  return result.object;
};
