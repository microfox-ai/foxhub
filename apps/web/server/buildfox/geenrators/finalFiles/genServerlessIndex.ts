import { TokenUsageAnalyticsTracker } from "@/server/analytics/helper";
import { models } from "@/server/models";
import {
  fetchTemplateDir,
  getFilePath,
  writeToFile,
} from "../../tool/writeToFile";
import { ClientRequest } from "@prisma/client";
import { AiContext } from "@microfox/ai-router";
import { TaskInstanceMetaType } from "@/server/convertfox/helpers/types";
import path from "path";
import fs from "fs/promises";
import { generateText } from "ai";
import dedent from "dedent";
import { codingSystemPrompt } from "../../prompt.coding";
import YAML from "yaml";

export const genServerlessIndex = async (
  ctx: AiContext<any, any, any, any>,
  taskInstanceMeta: TaskInstanceMetaType,
  clientRequest: ClientRequest,
  allGenFilesList: any[]
) => {
  const indexTsPath = path.join(
    process.cwd(),
    fetchTemplateDir(taskInstanceMeta?.taskStructure?.templateType),
    "index.txt"
  );
  const indexTs = await fs.readFile(indexTsPath, "utf8");
  const allFilesRelativeToRoot = await Promise.all(
    allGenFilesList?.map(async (file: any) => {
      const { rootDir } = await getFilePath(clientRequest, {
        fileName: file.fileName,
        filePath: file.filePath,
        fileType: file.fileType,
      });
      const fileContent = await fs.readFile(file.filePath, "utf8");
      // Match all exports including functions, constants, and types
      const exports = fileContent.match(
        /export (?:const|type|interface|class|function) (\w+)/g
      );
      const relativePath = file.filePath.replace(rootDir, "");
      return {
        ...file,
        filePath: relativePath,
        exports: exports || [],
      };
    })
  );

  const serverlessYmlFInal = allGenFilesList?.find(
    (file: any) =>
      file.fileName?.includes("serverless.yml") ||
      file.filePath?.includes("serverless.yml")
  );
  if (!serverlessYmlFInal) {
    throw new Error("Serverless.yml file not found");
  }
  const serverlessYmlContent = await fs.readFile(
    serverlessYmlFInal?.filePath,
    "utf8"
  );

  // Parse serverless.yml to get function paths
  const serverlessConfig = YAML.parse(serverlessYmlContent);
  const functionPaths = Object.entries(serverlessConfig.functions || {}).map(
    ([name, config]: [string, any]) => {
      const httpEvents =
        config.events?.filter((event: any) => event.http) || [];
      return {
        name,
        paths: httpEvents.map((event: any) => ({
          path: event.http.path,
          method: event.http.method,
        })),
      };
    }
  );
  console.log("Parsed function paths:", functionPaths);

  ctx.response.writeMessageMetadata({
    loader: "Writing the function & cron job mapper..",
  });

  const result2 = await generateText({
    model: models.claude35Sonnet,
    system: codingSystemPrompt("backend"),
    prompt: dedent`You are requested to create an index.ts file for the following requirement & example:
  
            The following are the function paths from the serverless.yml file for your reference when writing the docs in index.ts file:
            ${functionPaths
              .map(
                (func) =>
                  `Name: ${func.name}Function - Path: ${func.paths.map((p: { method: string; path: string }) => `${p.method} ${p.path}`).join("\n - ")}`
              )
              .join("\n - ")}

            The example index.ts file is as follows:
            ${indexTs}

            The exports from the generated files are as follows:
            ${allFilesRelativeToRoot
              ?.filter((file: any) => file.filePath?.includes("functions"))
              ?.map(
                (file: any) =>
                  `Name: ${file.fileName} - Path: ${file.filePath}\nExports: ${file.exports?.join(", ") || "None"}`
              )
              .join("\n - ")}

            CRITICALLY:
            make sure the imports follow the '.js' extension like this:
            like this:          
            import { externalDataDocs } from './functions/ExternalData.js'
  
            your workflow should be as follows:
            1. read the example index.ts file & keep it as a reference for how to write code.
            2. remove all the old functions & cron jobs & imports & exports from the index.ts file
            3. add the new imports & exports for the new functions.
            4. add a proper apiDocs object & export it in the getDocs function just like in the example index.ts file.
            5. store the index.ts file is writen in "src/" folder.
  
            make sure you replace $$$clientRequestId$$$ with the ${clientRequest?.id} in the index.ts file inside apiDocs object.
            make sure that the docs are properly setup in the index.ts file based on docs imported from the function files.
            make sure you rewrite the entire file instead of any diffs.
            `,
    tools: {
      write_code: writeToFile(ctx, clientRequest),
    },
    toolChoice: "required",
    onStepFinish: (step) => {
      console.log("step", step.usage);
    },
  });
  console.log("result2", result2.usage);
  TokenUsageAnalyticsTracker.trackUsage({
    userId: ctx.request.userId,
    clientRequestId: ctx.request.clientRequestId,
    model: models.claude35Sonnet.modelId,
    usage: result2.usage,
  });
};
