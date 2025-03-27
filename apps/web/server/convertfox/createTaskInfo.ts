import { generateObject, Message, streamObject, streamText, tool } from "ai";
import { z } from "zod";
import { StreamingFucntionProps } from "@repo/ai-utils/router";
import { taskInfo, TaskInstanceMetaType } from "./types";
import { models } from "../models";
import { TaskInstanceMeta } from "@prisma/client";
import { updateTaskInstanceMeta } from "@/utils/services/db_functions/updateClientRequest";
import { TokenUsageAnalyticsTracker } from "../analytics/helper";

export const createTaskInfo = async (
  props: StreamingFucntionProps<any, any>,
  taskInstanceMeta: TaskInstanceMetaType,
  modification?: string
) => {
  const { dataStream, requestBody, responseBody } = props;

  dataStream.writeMessageAnnotation({
    type: "thinking",
    contents: "Creating your automation task",
  });
  //console.log("taskInstanceMeta", taskInstanceMeta);
  const result = await generateObject({
    model: models.googleGeminiFlash,
    system: modification
      ? `You are a task experet.
        You are given a task summary and a user query to modify the task.
        You need to re-create a task info based on the prevvious Info and the user query.
        `
      : `
        You are a task expert.
        You create a task info based on the summary in prompt:
    `,
    schema: taskInfo,
    prompt: modification
      ? `
        summary: ${taskInstanceMeta.initialSummary}
        previous task info: ${JSON.stringify(taskInstanceMeta.taskInfo)}
        user query: ${modification}
        `
      : `
        summary: ${taskInstanceMeta.initialSummary}
        `,
  });
  console.log("result", result);
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
        className: "bg-neutral-200 text-black hover:bg-neutral-300",
      },
      {
        action: "appendMessage",
        text: "Yes, That's Correct!",
        className: "bg-green-500 text-white hover:bg-green-600",
        value: "Yes, That's Correct!",
      },
    ],
  });

  return result.object;
};
