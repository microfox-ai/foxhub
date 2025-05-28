import { ClientRequest } from "@prisma/client";
import { StreamingFucntionProps } from "@repo/ai-utils/router";
import { generateText } from "ai";
import dedent from "dedent";
import fs from "fs/promises";
import path from "path";
import { TokenUsageAnalyticsTracker } from "../../../analytics/helper";
import { TaskInstanceMetaType } from "../../../convertfox/types";
import { models } from "../../../models";
import { codingSystemPrompt } from "../../prompt.coding";
import { fetchTemplateDir, writeToFile } from "../../tool/writeToFile";
import { envsPrompt } from "../../prompts/envsPrompt";
import { prisma } from "@/prisma/prisma";
import { fetchPackageDocs } from "../../tool/fetchPackageDocs";

// I need a helper mapper for file to fetch from (use addons to support this)

export const genDbRedisHelper = async (
  props: StreamingFucntionProps<any, any>,
  taskInstanceMeta: TaskInstanceMetaType,
  clientRequest: ClientRequest
) => {
  // result.mergeIntoDataStream(props.dataStream, {
  //   experimental_sendStart: false,
  //   experimental_sendFinish: false,
  // });

  // await result.text;
  // console.log("result", result.usage);

  // write helpers/redis.txt for upstash
  // modify the serverless.yml file to support all the functions & cron jobs
  props.dataStream.writeMessageAnnotation({
    type: "thinking",
    content: "Generating redis db setups..",
  });

  const redisHelper = await fs.readFile(
    path.join(
      process.cwd(),
      fetchTemplateDir(taskInstanceMeta?.taskStructure?.templateType),
      "redis.txt"
    ),
    "utf8"
  );

  const clientSecrets = await prisma.clientSecret.findMany({
    where: {
      clientRequestIds: {
        has: clientRequest.id,
      },
    },
  });

  try {
    const result = await generateText({
      model: models.claude35Sonnet,
      system: codingSystemPrompt("backend"),
      prompt: dedent`You are requested to modify a redis.ts helper file for the following requirements so that it supports the following functions & cron jobs:

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

                make sure the imports follow the '.js' extension like this for imports from other folders:
                import { exampleHelper } from '../helpers/exampleHelper.js'

                Make sure you null check the variables first, before saving them to redis.

                your workflow should be as follows:
                1. understand all the functions & cron jobs that are to be generated for the task.
                2. understand the example redis helper file.
                3. generate any helper functions that might be required inside the functions & cron jobs.
                4. store the file at helpers/redis.ts

                Key rules:-
                1. this is only a helper for redis - so only getters, setters
                2. some level of data processing is also good.
                3. never use any external package in this helper other that @upstash/redis, 
                4. create fallbacks for empty, null, undefined values.
                5. do proper try, catch blcoks for json parse & stringify
                6. if JSON.parse, always typecheck if its a string before doing JSON.parse, if its not string and an object instead directly return the object.
    
                make sure you skip the packagesUsed field in the tool call.
                `,
      tools: {
        write_code: writeToFile(
          props,
          clientRequest,
          taskInstanceMeta?.taskStructure?.templateType
        ),
        fetch_package_docs: fetchPackageDocs(
          props,
          clientRequest,
          taskInstanceMeta
        ),
      },
      toolChoice: "required",
      maxSteps: 1,
      maxRetries: 3,
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
  } catch (error) {
    console.error("error", error);
    throw error;
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
