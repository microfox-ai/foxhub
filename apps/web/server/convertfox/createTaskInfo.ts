import { generateObject, streamObject, streamText, tool } from "ai";
import { z } from "zod";
import { StreamingFucntionProps } from "@repo/ai-utils/router";
import { taskInfo, TaskInstanceMetaType } from "./types";
import { models } from "../models";
import { TaskInstanceMeta } from "@prisma/client";
import { updateTaskInstanceMeta } from "@/utils/services/db_functions/updateClientRequest";

export const createTaskInfo = async (
  props: StreamingFucntionProps<any, any>,
  taskInstanceMeta: TaskInstanceMetaType
) => {
  const { dataStream, requestBody, responseBody } = props;

  dataStream.writeMessageAnnotation({
    type: "thinking",
    contents: "I am creating your task info",
  });
  const result = await generateObject({
    model: models.googleGeminiFlash,
    system: `
        You are a task info creator.
        You create a task info for the following summary:
    `,
    schema: taskInfo,
    prompt: `
    summary: ${taskInstanceMeta.initialSummary}
    `,
  });
  await updateTaskInstanceMeta({
    clientRequestId: requestBody.clientRequestId,
    taskInstanceMeta: {
      ...taskInstanceMeta,
      taskInfo: taskInfo,
    },
  });
  // save this info into db.
  dataStream.writeMessageAnnotation({
    type: "ui",
    objectType: "taskInfo",
    object: result.object,
  });

  dataStream.writeMessageAnnotation({
    text: `I have summarised the task. Shall we proceed ?`,
    buttons: [
      //   {
      //     action: "removeThisPart",
      //     text: "Not Yet",
      //     className: "bg-neutral-200 text-black hover:bg-neutral-300",
      //   },
      {
        action: "appendMessage",
        text: "Sure!",
        className: "bg-green-500 text-white hover:bg-green-600",
        value: "Sure! Let's proceed",
      },
    ],
  });

  return result.object;
};
