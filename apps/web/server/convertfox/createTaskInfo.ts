import { generateObject, Message, streamObject, streamText, tool } from "ai";
import { z } from "zod";
import { StreamingFucntionProps } from "@repo/ai-utils/router";
import { taskInfo, TaskInstanceMetaType } from "./types";
import { models } from "../models";
import { TaskInstanceMeta } from "@prisma/client";
import { updateTaskInstanceMeta } from "@/utils/services/db_functions/updateClientRequest";
import { TokenUsageAnalyticsTracker } from "../analytics/helper";
import { getMicrofoxCapabilities } from "../hellofox/getMicrofoxCapabilities";
import { getPackageList } from "./getInternalPackages";

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
  const packageList = await getPackageList();
  const stablePackageNames = packageList.stablePackages;
  const semiStablePackageNames = packageList.semiStablePackages;
  const externalPackageNames = packageList.externalPackages;
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
        ${stablePackageNames.join(", ")}
        ${semiStablePackageNames.join(", ")}
        ${externalPackageNames.join(", ")}
        `
      : `
        You are a task expert and also have developer experience.
        You know our capabilities & limitations.
        You create a task info based on the summary given to you
        Make sure you read task summary, platforms properly, & our capabilities before you can generate the task details
        ----
        ${getMicrofoxCapabilities()}
                Packages/Platforms we support:
        ${stablePackageNames.join(", ")}
        ${semiStablePackageNames.join(", ")}
        ${externalPackageNames.join(", ")}
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
