import { ClientRequest } from "@prisma/client";
import { StreamingFucntionProps } from "@repo/ai-utils/router";
import { TaskInstanceMetaType } from "../convertfox/types";
import { generateText, streamText } from "ai";
import { models } from "../models";
import { codingFunctionPrompt, codingSystemPrompt } from "./prompt.coding";
import {
  INTERNAL_TEMPLATE_ROOT,
  writeToFile,
  writeToFileSystem,
} from "./writeToFile";
import dedent from "dedent";
import path from "path";
import fs from "fs/promises";

export const genCronJobs = async (
  props: StreamingFucntionProps<any, any>,
  taskInstanceMeta: TaskInstanceMetaType,
  clientRequest: ClientRequest
) => {
  const cronExample = await fs.readFile(
    path.join(process.cwd(), INTERNAL_TEMPLATE_ROOT, "cron.txt"),
    "utf8"
  );
  // Generate Cron jobs based on the task requirements
  for (const cronJob of taskInstanceMeta?.taskStructure?.cronJobs ?? []) {
    const prompt = await codingFunctionPrompt({
      type: "cron",
      taskInstanceMeta,
      cron: cronJob,
    });
    console.log("generating cron job", cronJob.name);
    const result = await generateText({
      model: models.claude35Sonnet,
      system: codingSystemPrompt("backend"),
      prompt,
      toolChoice: "auto",
      maxSteps: 1,
      maxTokens: 4000,
      tools: {
        write_to_file: writeToFile(props, clientRequest),
      },
      onStepFinish: (step) => {
        console.log("step", step.usage);
      },
      //   onFinish: async (result) => {
      //     console.log("result", result.usage);
      //   },
      //   onError: (error) => {
      //     console.log("error", error);
      //   },
    });

    props.dataStream.writeMessageAnnotation({
      type: "thinking",
      value: "Finished - " + cronJob.name,
    });

    console.log("result", result.usage);
  }

  return taskInstanceMeta;
};
