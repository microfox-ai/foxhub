import { generateObject } from "ai";
import { StreamingFucntionProps } from "@repo/ai-utils/router";
import { models } from "../models";
import { TaskInfo, taskRequiredInfo, TaskIntegrations } from "./types";

export const createTaskRequiredInfo = async (
  props: StreamingFucntionProps<any, any>,
  taskFinalisedSummary: TaskInfo,
  taskIntegrations: TaskIntegrations
) => {
  const { dataStream, requestBody, responseBody } = props;

  const taskInfo = taskFinalisedSummary;

  dataStream.writeMessageAnnotation({
    type: "thinking",
    contents: "Searching for related existing packages",
  });

  // SEARCH FOR PACKAGES & CLIENT SECRETS
  //   const packages = await searchPackages({
  //     query: taskIntegrations.platforms,
  //   });

  const result = await generateObject({
    model: models.googleGeminiFlash,
    system: `
        You analyze the task information & determine the necessary details from client we need to collect.
        clientSecrets:

         ---
        You run in a loop of Thought, Action, PAUSE, Observation.
        At the end of the loop you output an Answer
        Use Thought to describe your thoughts about the question you have been asked.
        Use Action to run one of the actions available to you - then return PAUSE.
        Observation will be the result of running those actions.
        At the end of the loop you output an Answer
    `,
    schema: taskRequiredInfo.omit({
      packages: true,
    }),
    prompt: `
Task Goal: ${taskInfo.goal}
Task Summary: ${taskInfo.summary}
Task Platforms: ${taskIntegrations.platforms}
    `,
  });

  const _taskRequiredInfo = {
    ...result.object,
    packages: [],
  };

  dataStream.writeMessageAnnotation({
    type: "ui",
    objectType: "taskRequiredInfo",
    object: _taskRequiredInfo,
  });

  return _taskRequiredInfo;
};
