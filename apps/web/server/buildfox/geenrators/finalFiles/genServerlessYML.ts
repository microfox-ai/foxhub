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
import {
  codingSystemPrompt,
  getFunctionNameFromKebabCase,
} from "../../prompt.coding";
import dedent from "dedent";
import { TokenUsageAnalyticsTracker } from "../../../analytics/helper";
import { getServiceName } from "../../helper/getServiceName";
import YAML from "yaml";
import path from "path";
import fs from "fs/promises";
import { updateYMLFile } from "../../helper/updateYMLFile";
import {
  validateServerlessYML,
  mutateServerlessYML,
} from "@microfox/serverless-yml";

const processImportsFromFiles = (allGenFilesList: any[]) => {
  return allGenFilesList
    ?.filter((file: any) => file.filePath.includes("/functions"))
    .map((file: any) => {
      const imports = file.meta?.importsUsed;

      const isPuppet = imports?.some(
        (imp: string) =>
          imp.includes("helpers/chromeScript.js") ||
          imp.includes("puppeteer") ||
          imp.includes("chrome")
      );

      return {
        fileName: file.fileName?.split(".")[0],
        filePath: file.filePath,
        imports,
        isPuppet,
      };
    });
};

export const genServerlessYML = async (
  props: StreamingFucntionProps<any, any>,
  taskInstanceMeta: TaskInstanceMetaType,
  clientRequest: ClientRequest,
  allGenFilesList: any[] // Consider defining a more specific type
) => {
  try {
    const serverlessYmlPath = path.join(
      process.cwd(),
      fetchTemplateDir(taskInstanceMeta?.taskStructure?.templateType),
      "serverless.yml"
    );
    const serverlessYml = await fs.readFile(serverlessYmlPath, "utf8");

    const imports = processImportsFromFiles(allGenFilesList);

    const result = await generateText({
      model: models.claude35Sonnet,
      system: codingSystemPrompt("backend"),
      prompt: dedent`You are requested to modify a serverless.yml file for the following requirement:

          The following functions are generated for the task:
          ${taskInstanceMeta?.taskStructure?.lambdaFunctions
            ?.map(
              (lambda) =>
                ` name: ${lambda.name} \n
              path: ${lambda.path}\n
              method: ${lambda.method}\n
              handler: dist/functions/${getFunctionNameFromKebabCase(lambda.name)}.${getFunctionNameFromKebabCase(lambda.name)}Function.js`
            )
            .join("\n\n - ")}
          ${taskInstanceMeta?.taskStructure?.cronJobs
            ?.map(
              (cron) => `
              name: ${cron.name} \n
              method: post\n 
              handler: dist/functions/${getFunctionNameFromKebabCase(cron.name)}.${getFunctionNameFromKebabCase(cron.name)}Function.js\n 
              - schedule:\n
                rate: ${cron.cronExpression}`
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
        write_code: writeToFile(
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
    // console.log("result", result.usage);

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

    // MSUT BE SHIFTED TO FIRST AI GENERATION oF YML FILE ONLY, with the correct context being passed,and rules given from packagages instead of the current way
    await updateYMLFile(
      generatedFilePath
        .replace("/serverless.yml", "")
        .replace("\\serverless.yml", ""),
      "serverless.yml",
      async (config) => {
        let oldConfig = YAML.parse(config);
        oldConfig.provider.timeout = 60;
        console.log("oldConfig", oldConfig);
        console.log("imports", imports);
        let newConfigString = await mutateServerlessYML(
          YAML.stringify(oldConfig),
          imports
        );
        let newConfig = YAML.parse(newConfigString);
        return YAML.stringify(newConfig);
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
  } catch (error) {
    console.error("Error generating serverless.yml:", error);
    throw error;
  }
};
