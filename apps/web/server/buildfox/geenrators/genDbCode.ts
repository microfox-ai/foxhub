import { ClientRequest } from "@prisma/client";
import { StreamingFucntionProps } from "@repo/ai-utils/router";
import { generateText } from "ai";
import dedent from "dedent";
import { TaskInstanceMetaType } from "../../convertfox/types";
import { models } from "../../models";
import { codingSystemPrompt } from "../prompt.coding";
import {
  fetchTemplateRoot,
  writeToFile,
  writeToFileSystemAndUpdateSteps,
} from "../tool/writeToFile";
import { TokenUsageAnalyticsTracker } from "../../analytics/helper";
import fs from "fs/promises";
import path from "path";
export const genDbCode = async (
  props: StreamingFucntionProps<any, any>,
  taskInstanceMeta: TaskInstanceMetaType,
  clientRequest: ClientRequest
) => {
  // result.mergeIntoDataStream(props.dataStream, {
  //   experimental_sendStart: false,
  //   experimental_sendFinish: false,
  // });

  // await result.text;
  //console.log("result", result.usage);

  if (taskInstanceMeta.taskStructure?.templateType === "upstash") {
    // write helpers/redis.txt for upstash
    // modify the serverless.yml file to support all the functions & cron jobs
    props.dataStream.writeMessageAnnotation({
      type: "thinking",
      content: "Generating redis db setups..",
    });

    const redisHelper = await fs.readFile(
      path.join(
        process.cwd(),
        fetchTemplateRoot(taskInstanceMeta?.taskStructure?.templateType),
        "redis.txt"
      ),
      "utf8"
    );

    const result = await generateText({
      model: models.claude35Sonnet,
      system: codingSystemPrompt("backend"),
      prompt: dedent`You are requested to modify a redis.ts file for the following requirement:
                The following functions are to be generated for the task:
                ${taskInstanceMeta?.taskStructure?.lambdaFunctions?.map((func) => func.name + " - " + func.description).join("\n - ")}

                The following cron jobs are to be generated for the task:
                ${taskInstanceMeta?.taskStructure?.cronJobs?.map((cron) => cron.name + " - " + cron.cronExpression).join("\n - ")}
    
                The following is the task summary:
                ${taskInstanceMeta?.taskInfo?.summary}

                Db documents suggested by the task:
                ${taskInstanceMeta?.taskStructure?.dbSchemas?.map((db) => db.modelName + "\n - JSON schema: \n" + JSON.stringify(db.jsonSchema)).join("\n\n - ")}
    
                The example redis helper file is as follows:
                ${redisHelper}

                Make sure you null check the variables first, before saving them to redis.

                your workflow should be as follows:
                1. understand all the functions & cron jobs that are to be generated for the task.
                2. understand the example redis helper file.
                3. generate any helper functions that might be required inside the functions & cron jobs.
                4. store the file at helpers/redis.ts
    
                make sure you skip the packagesUsed field in the tool call.
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
  }

  return taskInstanceMeta;
};

// props.dataStream.writeMessageAnnotation({
//   type: "thinking",
//   content: "Writing db schema",
// });

// // TODO: Instead of hardcoding, fetch from the template repo.
// writeToFileSystemAndUpdateSteps(
//   {
//     fileName: "prisma.ts",
//     filePath: "src/db",
//     fileType: "ts",
//     content: dedent`import { PrismaClient } from '@prisma/client';
// // Define custom event types to handle Prisma's event system
// declare global {
//   namespace PrismaJson {
//     type EventType = 'error'
//   }
// }
// // Instantiate Prisma client
// const prisma = new PrismaClient({
//   log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
// });
// // Handle connection errors using type assertion
// (prisma as any).$on('error', (e: Error) => {
//   console.error('Prisma Client error:', e);
// });
// export default prisma;`,
//   },
//   clientRequest
// );

// // build each db schema & write/modify related files.
// const result = await generateText({
//   model: models.claude35Sonnet,
//   system: codingSystemPrompt("backend"),
//   prompt: `You are requested to write all the db schema for the following task request:
//           ${taskInstanceMeta.taskInfo?.summary}
//           Here are some specifics:
//           -${taskInstanceMeta?.taskStructure?.dbSchemas
//             ?.map(
//               (dbSchema) =>
//                 `The db schema required is ${dbSchema.modelName} with the following fields: ${dbSchema.jsonSchema}`
//             )
//             .join("\n - ")}

//           -Use the following file for writing setups for the db schema:
//             - prisma (with schema.prisma file at /prisma folder)
//           - Make sure it follows the standard prisma schema format.
//           - All the db schemas are in the same file.
//           `,
//   //toolCallStreaming: true,
//   toolChoice: "auto",
//   maxSteps: 1,
//   maxTokens: 3000,
//   tools: {
//     write_to_file: writeToFile(props, clientRequest),
//   },
//   onStepFinish: (step) => {
//     console.log("step", step.usage);
//   },
//   // onFinish: async (result) => {
//   //   console.log("result", result.usage);
//   // },
//   // onError: (error) => {
//   //   console.log("error", error);
//   // },
// });
// TokenUsageAnalyticsTracker.trackUsage({
//   ...props.requestBody,
//   model: models.claude35Sonnet.modelId,
//   usage: result.usage,
// });

// props.dataStream.writeMessageAnnotation({
//   type: "thinking",
//   text: "Writing db schema",
// });
