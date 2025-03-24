import { generateObject } from "ai";
import { StreamingFucntionProps } from "@repo/ai-utils/router";
import { models } from "../models";
import { TaskInfo, taskIntegrations } from "./types";
import { object } from "zod";

export const createTaskIntegrations = async (
  props: StreamingFucntionProps<any, any>,
  taskFinalisedSummary: TaskInfo
) => {
  const { dataStream, requestBody, responseBody } = props;

  const taskInfo = taskFinalisedSummary;

  dataStream.writeMessageAnnotation({
    type: "thinking",
    contents: "I am searching for platforms we need to integrate with",
  });

  const result = await generateObject({
    model: models.googleGeminiFlash,
    system: `
        You analyse the task information & find the platforms we need to integrate with.
        You return all the platforms we need to integrate with (along with specific needs for each platform).
        ___
         ---
        You run in a loop of Thought, Action, PAUSE, Observation.
        At the end of the loop you output an Answer
        Use Thought to describe your thoughts about the question you have been asked.
        Use Action to run one of the actions available to you - then return PAUSE.
        Observation will be the result of running those actions.
        At the end of the loop you output an Answer
    `,
    schema: taskIntegrations,
    prompt: `
Name: ${taskInfo.name}
Description: ${taskInfo.description}
Goal: ${taskInfo.goal}
Summary: ${taskInfo.summary}
    `,
  });

  dataStream.writeMessageAnnotation({
    type: "ui",
    objectType: "taskIntegrations",
    object: result.object,
  });

  return result.object;
};
