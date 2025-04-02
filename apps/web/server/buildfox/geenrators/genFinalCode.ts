import { StreamingFucntionProps } from "@repo/ai-utils/router";
import { TaskInstanceMetaType } from "../../convertfox/types";
import { ClientRequest } from "@prisma/client";
import { generateText, streamText } from "ai";
import {
  fetchTemplateRoot,
  getFilePath,
  INTERNAL_TEMPLATE_PLAIN_ROOT,
  readAllGenFilesList,
  writeToFile,
  writeToFileSystemAndUpdateSteps,
} from "../tool/writeToFile";
import { readFile } from "fs/promises";
import path from "path";
import { models } from "../../models";
import { codingSystemPrompt } from "../prompt.coding";
import { promises as fs } from "fs";
import dedent from "dedent";
import { TokenUsageAnalyticsTracker } from "../../analytics/helper";

// IMPROTANT TODO: serverless.yml being written has no idea what env variables are needed..
export const genFinalCode = async (
  props: StreamingFucntionProps<any, any>,
  taskInstanceMeta: TaskInstanceMetaType,
  clientRequest: ClientRequest
) => {
  try {
    props.dataStream.writeMessageAnnotation({
      type: "thinking",
      content: "Writing final code pieces",
    });

    const allGenFilesList = await readAllGenFilesList(clientRequest, true);

    // modify the serverless.yml file to support all the functions & cron jobs
    const serverlessYml = await fs.readFile(
      path.join(process.cwd(), INTERNAL_TEMPLATE_PLAIN_ROOT, "serverless.yml"),
      "utf8"
    );
    const result = await generateText({
      model: models.claude35Sonnet,
      system: codingSystemPrompt("backend"),
      prompt: dedent`You are requested to modify a serverless.yml file for the following requirement:
            The following functions are generated for the task:
            ${allGenFilesList
              ?.filter((file: any) => file.filePath.includes("/functions"))
              .map((file: any) => file.fileName)
              .join("\n - ")}

            if for cron jobs, refer theses:
            ${taskInstanceMeta?.taskStructure?.cronJobs?.map((cron) => cron.name + " - " + cron.cronExpression).join("\n - ")}

            The input serverless.yml file is as follows:
            ${serverlessYml}

            The following is the task summary:
            ${taskInstanceMeta?.taskInfo?.summary}

            The service name should be:
            service: ${taskInstanceMeta?.taskStructure?.templateType.substring(0, 1)}-${clientRequest?.requestDir?.split("-").pop()?.replaceAll("/", "-")}

            your workflow should be as follows:
            1. read the serverless.yml file
            2. remove all the old functions & cron jobs from the serverless.yml file.
            3. add the new functions & cron jobs to the serverless.yml file.
            4. store the file at the root of the project.

            make sure you skip the packagesUsed field in the tool call.
            make sure you must include the getDocs function, it is very important - it is available at dist/index.getDocs
            `,
      tools: {
        write_to_file: writeToFile(
          props,
          clientRequest,
          taskInstanceMeta?.taskStructure?.templateType
        ),
      },
      toolChoice: "required",
      maxSteps: 1,
      maxTokens: 3000,
      maxRetries: 1,
      onStepFinish: (step) => {
        console.log("step", step.usage);
      },
    });
    console.log("result", result.usage);
    TokenUsageAnalyticsTracker.trackUsage({
      ...props.requestBody,
      model: models.claude35Sonnet.modelId,
      usage: result.usage,
    });
    // modify the package.json file to support all the functions & cron jobs

    const packageJson = await fs.readFile(
      path.join(
        process.cwd(),
        fetchTemplateRoot(taskInstanceMeta?.taskStructure?.templateType),
        "package.json"
      ),
      "utf8"
    );
    const packageJsonContent = JSON.parse(packageJson);
    taskInstanceMeta.taskIntegrations?.platforms?.forEach((platform) => {
      if (platform.package && platform.package != "@microfox/null") {
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
      path.join(
        process.cwd(),
        fetchTemplateRoot(taskInstanceMeta?.taskStructure?.templateType),
        "index.txt"
      ),
      "utf8"
    );
    const allFilesRelativeToRoot = await Promise.all(
      allGenFilesList?.map(async (file: any) => {
        const { rootDir } = await getFilePath(clientRequest, {
          fileName: file.fileName,
          filePath: file.filePath,
          fileType: file.fileType,
        });
        const relativePath = file.filePath.replace(rootDir, "");
        return {
          ...file,
          filePath: relativePath,
        };
      })
    );
    console.log("allFilesRelativeToRoot", allFilesRelativeToRoot);
    const result2 = await generateText({
      model: models.claude35Sonnet,
      system: codingSystemPrompt("backend"),
      prompt: dedent`You are requested to create an index.ts file for the following requirement & example:

            The following files are already generated for the task:
            ${allFilesRelativeToRoot?.map((file: any) => `Name: ${file.fileName} - Path: ${file.filePath}`).join("\n - ")}

            The example index.ts file is as follows:
            ${indexTs}
            
            make sure the imports follow the '.js' extension like this:
            import { getExternalData } from './functions/getExternalData.js'

            make sure that all the functions are imported and re-exported in the index.ts file.
            make sure that the docs are properly setup in the index.ts file.
            make sure you rewrite the entire file instead of any diffs.
            make sure that index.ts file is writen in "src/" folder.
            `,
      tools: {
        write_to_file: writeToFile(props, clientRequest),
      },
      toolChoice: "required",
      maxSteps: 1,
      maxTokens: 3000,
      onStepFinish: (step) => {
        console.log("step", step.usage);
      },
    });
    console.log("result2", result2.usage);
    TokenUsageAnalyticsTracker.trackUsage({
      ...props.requestBody,
      model: models.claude35Sonnet.modelId,
      usage: result2.usage,
    });
  } catch (error) {
    console.error("Error generating final code", error);
  }

  return taskInstanceMeta;
};
