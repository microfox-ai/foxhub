import { StreamingFucntionProps } from "@repo/ai-utils/router";
import {
  codeTemplateAddon,
  TaskInstanceMetaType,
} from "../../../convertfox/types";
import { ClientRequest } from "@prisma/client";
import { generateText } from "ai";
import {
  fetchAddonDir,
  fetchTemplateDir,
  getFilePath,
  writeToFile,
} from "../../tool/writeToFile";
import { models } from "../../../models";
import { codingSystemPrompt } from "../../prompt.coding";
import dedent from "dedent";
import { TokenUsageAnalyticsTracker } from "../../../analytics/helper";
import { getServiceName } from "../../helper/getServiceName";
import YAML from "yaml";
import path from "path";
import fs from "fs/promises";
import { updateYMLFile } from "../../helper/updateYMLFile";

// Validation function to check serverless.yml configuration
const validateServerlessYML = (
  yamlContent: string
): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  let isValid = true;

  try {
    const config = YAML.parse(yamlContent);

    // Check if functions section exists
    if (!config.functions) {
      errors.push("No functions section found in serverless.yml");
      isValid = false;
      return { isValid, errors };
    }

    // Check each function
    Object.entries(config.functions).forEach(
      ([functionName, functionConfig]: [string, any]) => {
        // Skip getDocs function as it's a special case
        if (functionName === "getDocs") return;

        // Check if events exist
        if (!functionConfig.events || !Array.isArray(functionConfig.events)) {
          errors.push(`Function ${functionName} has no events defined`);
          isValid = false;
          return;
        }

        // Check if there's at least one HTTP event
        const hasHttpEvent = functionConfig.events.some(
          (event: any) => event.http
        );
        if (!hasHttpEvent) {
          errors.push(`Function ${functionName} has no HTTP event defined`);
          isValid = false;
        }

        // Check if handler exists
        if (!functionConfig.handler) {
          errors.push(`Function ${functionName} has no handler defined`);
          isValid = false;
        }
      }
    );
  } catch (error) {
    errors.push(
      `Failed to parse serverless.yml: ${error instanceof Error ? error.message : "Unknown error"}`
    );
    isValid = false;
  }

  return { isValid, errors };
};

export const genServerlessYML = async (
  props: StreamingFucntionProps<any, any>,
  taskInstanceMeta: TaskInstanceMetaType,
  clientRequest: ClientRequest,
  allGenFilesList: any[] // Consider defining a more specific type
) => {
  const serverlessYmlPath = path.join(
    process.cwd(),
    fetchTemplateDir(taskInstanceMeta?.taskStructure?.templateType),
    "serverless.yml"
  );
  const serverlessYml = await fs.readFile(serverlessYmlPath, "utf8");

  const result = await generateText({
    model: models.claude35Sonnet,
    system: codingSystemPrompt("backend"),
    prompt: dedent`You are requested to modify a serverless.yml file for the following requirement:
          The following functions are generated for the task:
          ${allGenFilesList
            ?.filter((file: any) => file.filePath.includes("/functions"))
            .map((file: any) => file.fileName)
            .join("\n - ")}

          if for cron jobs, use theses cron expressions:
          ${taskInstanceMeta?.taskStructure?.cronJobs
            ?.map(
              (cron) =>
                cron.name +
                " - " +
                cron.cronExpression +
                "\n because: " +
                cron.endResult
            )
            .join("\n\n - ")}

          The input serverless.yml file is as follows:
          ${serverlessYml}

          The following is the task summary:
          ${taskInstanceMeta?.taskInfo?.summary}

          The service name should be:
          service: ${getServiceName(clientRequest, taskInstanceMeta)}

          your workflow should be as follows:
          1. read the serverless.yml file
          2. remove all the old functions & cron jobs from the serverless.yml file.
          3. add the new functions & cron jobs to the serverless.yml file.
          4. store the file at the root of the project.

          CRITCIALLY
          make sure the cron expressions are exactly the same as the the ones provided above.
          make sure to have http in all the functions & events
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

  const fileArgs = result.steps[0]?.toolCalls[0]?.args;
  if (!fileArgs) {
    throw new Error("Failed to get file args from result");
  }
  const { fileWritePath: generatedFilePath } = await getFilePath(
    clientRequest,
    {
      fileName: fileArgs?.fileName,
      filePath: fileArgs?.filePath,
      fileType: fileArgs?.fileType,
    }
  );
  if (!generatedFilePath) {
    throw new Error("Failed to get generated file path from result");
  }

  // Read and validate the generated serverless.yml content
  const generatedContent = await fs.readFile(generatedFilePath, "utf8");
  const validation = validateServerlessYML(generatedContent);

  await updateYMLFile(
    generatedFilePath.replace("/serverless.yml", ""),
    "serverless.yml",
    (config) => {
      let newConfig = { ...config };
      newConfig.plugins = {
        ...newConfig.plugins,
        exclude: [
          ...(newConfig.plugins?.exclude ?? []),
          "node_modules/puppeteer/.local-browsers/**",
        ],
      };
      return newConfig;
    },
    clientRequest
  );

  if (!validation.isValid) {
    console.error("Serverless.yml validation errors:", validation.errors);
    throw new Error(
      `Serverless.yml validation failed: ${validation.errors.join(", ")}`
    );
  }

  TokenUsageAnalyticsTracker.trackUsage({
    ...props.requestBody,
    model: models.claude35Sonnet.modelId,
    usage: result.usage,
  });
};
