import { StreamingFucntionProps } from "@repo/ai-utils/router";
import {
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
import { updateTaskInstanceMeta } from "@/utils/services/db_functions/updateClientRequest";
import { taskPlanningPrompt } from "./prompt.taskPlanning";
import { createStreamableValue } from "ai/rsc";
import { createReadStream } from "fs";
import { TokenUsageAnalyticsTracker } from "../analytics/helper";

const generatePlatformsPrompt = (taskInstanceMeta: TaskInstanceMetaType) => {
  if (!taskInstanceMeta.taskIntegrations) {
    throw new Error("Task integrations not found");
  }
  return `
    ${taskInstanceMeta.taskIntegrations?.platforms?.map((p) => `name: ${p.name}; reason: ${p.reason}; package: ${p.package}`).join("\n")}
    `;
};

export const createTaskStructure = async (
  props: StreamingFucntionProps<any, any>,
  taskInstanceMeta: TaskInstanceMetaType,
  modification?: string
) => {
  const { dataStream, requestBody, responseBody } = props;

  console.log("sdn", taskInstanceMeta);
  if (!taskInstanceMeta.taskIntegrations || !taskInstanceMeta.taskInfo) {
    throw new Error("Task integrations or task info not found");
  }

  dataStream.writeMessageAnnotation({
    type: "thinking",
    contents: "Thinking on how to structure the task    ",
  });

  const result = streamObject({
    model: models.claude35Sonnet,
    system: taskPlanningPrompt(),
    prompt: `
        Task Goal: ${taskInstanceMeta.taskInfo.goal}
        Task Summary: ${taskInstanceMeta.taskInfo.summary}
        Platforms: ${generatePlatformsPrompt(taskInstanceMeta)}
        ${modification ? `Modifications Requested: ${modification}` : ""}
        `,
    schema: taskStructure,
    onFinish: (result) => {
      TokenUsageAnalyticsTracker.trackUsage({
        ...props.requestBody,
        model: models.claude35Sonnet.modelId,
        usage: result.usage,
      });
    },
  });
  for await (const chunk of result.partialObjectStream) {
    //console.log("chunk", chunk);
    //const object = chunk.;
    //dataStream.write(chunk as any);
  }
  const object = await result.object;

  console.log("result", result);

  dataStream.writeMessageAnnotation({
    type: "thinking",
    contents: "Task Structure Generated   ",
  });
  //   result.mergeIntoDataStream(dataStream, {
  //     experimental_sendFinish: false,
  //   });
  //result.toTextStreamResponse();
  //result.textStream.pipeTo(dataStream);

  //dataStream.merge(result.fullStream)

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
        className: "bg-neutral-200 text-black hover:bg-neutral-300",
      },
      {
        action: "shiftMinion",
        actionText: "Start Building !",
        text: "Start Building !",
        className: "bg-green-500 text-white hover:bg-green-600",
        value: "buildfox",
      },
    ],
  });

  return object;
};
