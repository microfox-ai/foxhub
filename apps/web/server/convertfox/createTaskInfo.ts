import { generateObject, streamObject, streamText, tool } from "ai";
import { z } from "zod";
import { StreamingFucntionProps } from "@repo/ai-utils/router";
import { taskInfo } from "./types";
import { models } from "../models";

export const createTaskInfo = async (
  props: StreamingFucntionProps<any, any>,
  taskFinalisedSummary: string
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
        ---
        You run in a loop of Thought, Action, PAUSE, Observation.
        At the end of the loop you output an Answer
        Use Thought to describe your thoughts about the question you have been asked.
        Use Action to run one of the actions available to you - then return PAUSE.
        Observation will be the result of running those actions.
        At the end of the loop you output an Answer
    `,
    schema: taskInfo,
    prompt: `
    ${taskFinalisedSummary}
    `,
  });
  // save this info into db.
  dataStream.writeMessageAnnotation({
    type: "ui",
    objectType: "taskInfo",
    object: result.object,
  });

  return result.object;
};
