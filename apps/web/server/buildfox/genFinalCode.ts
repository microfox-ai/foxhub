import { StreamingFucntionProps } from "@repo/ai-utils/router";
import { TaskInstanceMetaType } from "../convertfox/types";
import { ClientRequest } from "@prisma/client";
import { generateText, streamText } from "ai";
import {
  INTERNAL_TEMPLATE_ROOT,
  readAllGenFilesList,
  writeToFile,
  writeToFileSystemAndUpdateSteps,
} from "./writeToFile";
import { readFile } from "fs/promises";
import path from "path";
import { models } from "../models";
import { codingSystemPrompt } from "./prompt.coding";
import { promises as fs } from "fs";
import dedent from "dedent";

export const genFinalCode = async (
  props: StreamingFucntionProps<any, any>,
  taskInstanceMeta: TaskInstanceMetaType,
  clientRequest: ClientRequest
) => {
  const allGenFilesList = await readAllGenFilesList(clientRequest);

  // modify the serverless.yml file to support all the functions & cron jobs
  const serverlessYml = await fs.readFile(
    path.join(process.cwd(), INTERNAL_TEMPLATE_ROOT, "serverless.yml"),
    "utf8"
  );
  const result = await generateText({
    model: models.claude35Sonnet,
    system: codingSystemPrompt("backend"),
    prompt: `You are requested to modify a serverless.yml file for the following requirement:
            The following files are generated for the task:
            ${allGenFilesList?.map((file: any) => file.fileName).join("\n - ")}
            The serverless.yml file is as follows:
            ${serverlessYml}
            The following is the task summary:
            ${taskInstanceMeta?.taskInfo?.summary}
            `,
    tools: {
      write_to_file: writeToFile(props, clientRequest),
    },
    toolChoice: "auto",
    maxSteps: 1,
    maxTokens: 3000,
    onStepFinish: (step) => {
      console.log("step", step.usage);
    },
  });
  // modify the package.json file to support all the functions & cron jobs

  const packageJson = await fs.readFile(
    path.join(process.cwd(), INTERNAL_TEMPLATE_ROOT, "package.json"),
    "utf8"
  );
  const packageJsonContent = JSON.parse(packageJson);
  taskInstanceMeta.taskIntegrations?.platforms?.forEach((platform) => {
    if (platform.package) {
      packageJsonContent.dependencies[platform.package] = "*";
    }
  });
  writeToFileSystemAndUpdateSteps(
    {
      fileName: "package.json",
      filePath: "",
      fileType: "json",
      content: dedent`${JSON.stringify(packageJsonContent)}`,
    },
    clientRequest
  );

  // modify the index.ts file to support all the functions & cron jobs
  const indexTs = await fs.readFile(
    path.join(process.cwd(), INTERNAL_TEMPLATE_ROOT, "index.txt"),
    "utf8"
  );
  const result2 = await generateText({
    model: models.claude35Sonnet,
    system: codingSystemPrompt("backend"),
    prompt: `You are requested to create an index.ts file for the following requirement & example:

            The following files are already generated for the task:
            ${allGenFilesList?.map((file: any) => JSON.stringify(file)).join("\n - ")}

            The example index.ts file is as follows:
            ${indexTs}
            
            make sure that all the functions are imported and re-exported in the index.ts file.
            make sure that the docs are properly setup in the index.ts file.
            make sure you rewrite the entire file instead of any diffs.
            make sure that file is writed in src/ folder.
            `,
    tools: {
      write_to_file: writeToFile(props, clientRequest),
    },
    toolChoice: "auto",
    maxSteps: 1,
    maxTokens: 3000,
    onStepFinish: (step) => {
      console.log("step", step.usage);
    },
  });

  return taskInstanceMeta;
};
