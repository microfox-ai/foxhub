import { StreamingFucntionProps } from "@repo/ai-utils/router";
import {
  TaskInfo,
  TaskIntegrations,
  TaskRequiredInfo,
  taskStructure,
  TaskStructure,
} from "./types";
import { generateObject } from "ai";
import { models } from "../models";

export const createTaskStructure = async (
  props: StreamingFucntionProps<any, any>,
  taskInfo: TaskInfo,
  taskIntegrations: TaskIntegrations,
  taskRequiredInfo: TaskRequiredInfo
) => {
  const { dataStream, requestBody, responseBody } = props;

  dataStream.writeMessageAnnotation({
    type: "thinking",
    contents: "Thinking on how to structure the task    ",
  });

  const result = await generateObject({
    model: models.googleGeminiFlash,
    system: `
        You are a task structure creator.
        You create a task structure for the following task info:
        ---
        You run in a loop of Thought, Action, PAUSE, Observation.
        At the end of the loop you output an Answer
        Use Thought to describe your thoughts about the question you have been asked.
        Use Action to run one of the actions available to you - then return PAUSE.
        Observation will be the result of running those actions.
        At the end of the loop you output an Answer
    `,
    schema: taskStructure,
    prompt: `
        Task Goal: ${taskInfo.goal}
        Task Summary: ${taskInfo.summary}
        Task Platforms: ${taskIntegrations.platforms}
        Task : ${taskRequiredInfo}
        `,
  });

  dataStream.writeMessageAnnotation({
    type: "ui",
    objectType: "taskStructure",
    object: result.object,
  });

  return result.object;
};
