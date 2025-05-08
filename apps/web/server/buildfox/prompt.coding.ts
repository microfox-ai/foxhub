import dedent from "dedent";
import { TaskInstanceMetaType } from "../convertfox/types";
import { TaskStructure } from "../convertfox/types";
import path from "path";
import {
  INTERNAL_TEMPLATE_PLAIN_ROOT,
  INTERNAL_TEMPLATE_UPSTASH_ROOT,
  INTERNAL_TEMPLATE_MONGODB_ROOT,
  readAllGenFilesList,
} from "./tool/writeToFile";
import fs from "fs/promises";
import { ClientRequest } from "@prisma/client";
import { envsFromTaskIntegrations } from "./helper/coreEnvsFromTaskIntegrations";
import { templateEnvsFromTaskIntegrations } from "./helper/templateEnvsFromTaskIntegrations";
import { prisma } from "@/prisma/prisma";
import { ClientSecretVariable } from "../types";

export const codingSystemPrompt = (
  step: "backend" | "frontend",
  writingCoreFunctions: boolean = false
) => {
  // also inset expertise in theese packages -  @upstash/redis, @mongoose (if mongodb is used),
  return dedent`
    You are a highly skilled fullstack developer with extensive knoledge in typescript, ${
      step === "frontend"
        ? "vite shadcn/ui and tailwindcss"
        : step === "backend"
          ? "serverless framework, node.js, "
          : ""
    }.
    You experise in writing microservices in typescript & deploy them to aws lambda functions using serverless framework.
    You are also an expert in building the UI for the same.
    ${
      step === "frontend" &&
      `
        `
    }
    ${
      step === "backend" &&
      ` Make sure to add/include the endpoint in index.ts file once each function is written.
        Make sure to add any new dependencies in package.json file.
        Make sure to write proper comments for the code.
        Make sure you properly handle errors, and pass them to the client via response object.

        The file structure is as follows (observed from the project root):
        [root]
        - src/
          - index.ts (This file is the entry point for the lambda function)
          - functions (Write any lambda function / cron job code in this folder)
            - functionName.ts (This file should hold the key lambda function code, refer to )
          - db (Write any db related code file in this folder)
          - utils (Write any utility functions in this folder)
          - types (Write any types in this folder)
        - package.json (Write this file only when all other files are written)
        - tsconfig.json
        `
    }
    ----
    
    Tool use:

    - to write the code, use the following tools:
      - write_to_file
    ${
      writingCoreFunctions
        ? `
    - to fetch the docs on a package, use the following tool:
      - fetch_package_docs (only supports @microfox packages for now)
    `
        : ""
    }

    A few things about your workflow:
    - You first carefully analyse the requirements, and then plan what needs to be done.
    - You then critisize your plan, and then refine it to this specific task & keep maximum code in a single file.
    - You always try to use @microfox/ packages, unless that package is not available.
    - If you know a package is going to be used, then you can fetch the docs on it using the fetch_package_docs tool.
    - If a package doc is not available, then you can use your own knowledge to integrate said platform
    - You then write the code for the task
    - You then modify other files of project if needed to support the new code
    - You finally finish the task.

    GROUND RULES
       - Never use theese packages - axios

    SILLY ERROR TO AVOID
    - Make sure function names & identifiers are unique
    - Make sure proper null exception handling is done (?. operator)

    YOU MUST NEVER WRITE ANY MOCK CODE, it should be production ready code.
    even if the packages are not available, you can use your own knowledge to integrate said platform.

    Critically, you must carefully analyze the results of each tool call you receive. 
    These outputs might mention error messages, files, or symbols you haven't considered yet.
    Mak double sure, you're using ?. format for all anything that could throw a null or undefined error.

    package.json should never be written by you, it should be written by the write_to_file tool.
    write_to_file will update the package.json file as long as you pass in the packagesUsed array.

    AFTER EACH TOOL CALL, do not output any text, just wait for the next tool call.
    `;
};

export const codingFileTypePrompt = (fileType: string) => {
  if (fileType === "") {
    return `
            Write the package.json file at the end of the task.
        `;
  }
};
//
export const codingFunctionPrompt = async ({
  type,
  taskInstanceMeta,
  function: _function,
  cron: _cron,
  template_type,
  clientRequest,
}: {
  type: "lambda" | "cron";
  taskInstanceMeta: TaskInstanceMetaType;
  function?: TaskStructure["lambdaFunctions"][0];
  cron?: TaskStructure["cronJobs"][0];
  template_type: "plain" | "upstash" | "mongodb";
  clientRequest?: ClientRequest;
}) => {
  const rootDir =
    template_type === "plain"
      ? INTERNAL_TEMPLATE_PLAIN_ROOT
      : template_type === "upstash"
        ? INTERNAL_TEMPLATE_UPSTASH_ROOT
        : INTERNAL_TEMPLATE_MONGODB_ROOT;

  const lambdaExample = await fs.readFile(
    path.join(process.cwd(), rootDir, "function.txt"),
    "utf8"
  );
  const cronExample = await fs.readFile(
    path.join(process.cwd(), rootDir, "cron.txt"),
    "utf8"
  );

  // TODO: for redis, create a standard pattern just like prisma
  let writtenHelperFilesContent: string | null = null;
  let previousEnvs: string[] = [];
  if (clientRequest && template_type != "plain") {
    const files = await readAllGenFilesList(clientRequest);
    previousEnvs = previousEnvs.concat(
      files.flatMap((file) => (file.meta as any).envVariablesUsed)
    );
    const redisFile = files.filter((file) =>
      file.filePath.includes("/helpers/redis")
    );
    if (redisFile.length > 0) {
      const redisFilePath = redisFile[0]?.filePath;
      if (redisFilePath) {
        writtenHelperFilesContent = await fs.readFile(
          path.join(process.cwd(), redisFilePath),
          "utf8"
        );
      }
    }
  }

  const templateEnvs = await templateEnvsFromTaskIntegrations(template_type);
  let coreEnvs: string[] = [];
  const requiredEnvs = taskInstanceMeta.taskIntegrations
    ? envsFromTaskIntegrations(
        taskInstanceMeta.taskIntegrations,
        "requiredKeys"
      )
    : [];
  coreEnvs = coreEnvs.concat(requiredEnvs);
  const oauthEnvs = taskInstanceMeta.taskIntegrations
    ? envsFromTaskIntegrations(
        taskInstanceMeta.taskIntegrations,
        "internalKeys"
      )
    : [];
  coreEnvs = coreEnvs.concat(oauthEnvs);
  let configEnvs = taskInstanceMeta.taskIntegrations
    ? envsFromTaskIntegrations(taskInstanceMeta.taskIntegrations, "botConfig")
    : [];
  if (
    configEnvs.length > 0 &&
    clientRequest &&
    clientRequest?.mentionedClientSecretIds?.length > 0
  ) {
    const clientSecrets = await prisma.clientSecret.findMany({
      where: {
        id: {
          in: clientRequest?.mentionedClientSecretIds,
        },
      },
    });
    const filletBotConfig: ClientSecretVariable[] = clientSecrets.flatMap(
      (secret) => secret.botConfig
    ) as any[];
    console.log("filled botconfigs", filletBotConfig);
    configEnvs = configEnvs.filter(
      (env) =>
        filletBotConfig.find(
          (c) => c && c.key === env && c.value != undefined && c.value != null
        ) != undefined
    );
    console.log("configEnvs filtered", configEnvs);
    coreEnvs = coreEnvs.concat(configEnvs);
  }

  previousEnvs = previousEnvs.filter(
    (env) => !templateEnvs.includes(env) && !coreEnvs.includes(env)
  );

  //console.log("templateEnvs", templateEnvs);
  //console.log("coreEnvs", coreEnvs);

  return dedent`You are requested to write a serverless function for the following requirement:
            Task Summary: ${taskInstanceMeta?.taskInfo?.summary}
            
            ${
              type === "lambda"
                ? `Function:
            - Name: ${_function?.name}
            - Description: ${_function?.description}
            - Brief: ${_function?.brief}
            Endpoint Details:
            - Path: ${_function?.path}
            - Method: ${_function?.method}`
                : `Cron Job:
            - Name: ${_cron?.name}
            - Description & Schedule: ${_cron?.description}
            - Result of the cron job: ${_cron?.endResult}
            - Cron Expression: ${_cron?.cronExpression}
            - Brief: ${_cron?.brief}
            `
            }

            The following packages are installed in the project:
            - ${taskInstanceMeta?.taskIntegrations?.platforms
              ?.filter((platform) => platform?.package != "@microfox/null")
              .map((platform) => platform?.package)
              .join("\n - ")}
            ${
              template_type === "mongodb"
                ? "- @mongoose"
                : template_type === "upstash"
                  ? "- @upstash/redis"
                  : ""
            }
            - dotenv
            - @types/aws-lambda

            The following env variables are already present in the project:
            ${templateEnvs.map((env: any) => `- ${env.key}`).join("\n")}
            ${coreEnvs.map((env) => `- ${env}`).join("\n")}
            ${previousEnvs.map((env) => `- ${env}`).join("\n")}

            ${
              /** TODO: this requires improving because cron would still add new variables, as it doesnt have a way to collect them,  so use redis as env var storage across all functions */
              type === "cron"
                ? "if new env variables are needed, other than theese, you can add them to the project."
                : `
            if new variables are needed, other than those above, add new env variables in the same format as above, 
            or use queryStringparameters or even body from the incoming aws event object 
            to get theese variables from user side.
            
            input request body or query parameters are preferred over process.env variables.

            for example:
              process.env.VARIABLE_NAME should be avoided,
            and instead
              const body = event.body ? JSON.parse(event.body) : {};
              const { variableName } = body;
            should be used.
            `
            }
            only create/use process.env variables, if absolutely needed security wise, or if this is a cron job where request body is not available
            otherwise use input parameters or request body from the event object to get theese variables from user side.
            

            ${
              writtenHelperFilesContent
                ? `The following redis helper functions are exported from helpers/redis.js, make use of them if needed:
            ${writtenHelperFilesContent}
            `
                : ""
            }
            ${
              template_type === "upstash"
                ? `
            - If any extra redis saving is needed, make sure you null check the variables first, before saving them to redis.
            `
                : ""
            }
            make sure the imports follow the '.js' extension like this for imports from other folders:
            import { exampleHelper } from '../helpers/exampleHelper.js'

            Requirements:
            - Use TypeScript
            - Implement proper error handling
            ${
              template_type === "mongodb"
                ? "- Use Mongoose client (import mongoose from 'mongoose') for database operations"
                : template_type === "upstash"
                  ? "use @upstash/redis for state management - only if data needs to be persisted acrosss function calls"
                  : ""
            }
            - Follow Serverless best practices
            - Add proper Docs
            - Add appropriate comments
            - Return properly formatted responses
            - Return the response object with the proper headers like in example (always enable cors by default, & pick json response type by default, unless otherwise specified)

            Complete example for a function stored at src/functions/${type === "lambda" ? "getExternalData" : "dailyMorningJob"}.ts:
            ${dedent`${type === "lambda" ? lambdaExample : cronExample}`}

            functionNaming should be like this:
            ${type === "lambda" ? _function?.name?.replaceAll(/[^a-zA-Z0-9]/g, "") : _cron?.name?.replaceAll(/[^a-zA-Z0-9]/g, "")}.ts
          
            The code should be created in the src/functions directory.
            Make sure to use the necessary imports from the packages when needed.
            Always call fetch_package_docs for the packages that start with @microfox to better understand how to use them.
            Use named exports for the function.
            Also export the doc file for the function.
            Only use the packages that are listed above in the project.
            Make no assumption of utils, or outside files - Create complete functionality in a single file.
            Do not write any mock code, it should be production ready code.
            Make sure to pay attention the TASK SUMMARY, and the FUNCTION DESCRIPTION & BRIEF, if conflicting, TASK SUMMARY > FUNCTION DESCRIPTION > FUNCTION BRIEF.


          Critically, if the packageDocs are available from fetch_package_docs tool, 
          do not make any assumptions of functions, properties that are not mentioned in the package docs.

            Some instructions for docs
            - If this function is a webhook, that can be triggered externally in another platform or app, you must detail in the docs, on how to setup this webhook there.
            - If this function is a cronjob, you must detail what this cron job does, and how to setup the cron job in the target platform.
            - the docs should be a pure string, do not insert any $ characters in the docs setup instructions.
            - only write setup instructions for the functions, not for the cron jobs.
            - only write setup instructions if it is meant to be configured as a webhook in external platform.
            `;
};

// todo: replace lambdaExample and cronExample for isDbsetup cases
//
//- If other files of project are needed or if will be of help, you can use list_files to fetch them.

// create example.env.json for testing needs, you can fetch envs from clientSecrets

// Provide the readme.md of each package, here, so it can know

// If a tool output references a new file or component that could be critical to the plan,
//     investigate it and consider using add_interested_file if it is indeed important.
//     Always pay close attention to these outputs to update your understanding of the codebase
//     and identify new relationships and dependencies.

// - to check how to use a package, use the following tool:
// - check_package_docs
// - to check for similar code for inspiration, use the following tool:
// - check_for_similar_code
// - to fetch existing files of project, that could matter for the task, use the following tool:
// - list_files
// - to read other files relative to the project root, use the following tool:
// - read_file
// - to modify other files relative to the project root, use the following tool:
// - edit_file
// - to finish the task, use the following tool:
// - finish_task

//If it mentions a new file or component that could be critical to the plan,
// keep that in mind & consider read_file to read if it is indeed important for the next file to write/modify.

// # Tool Use Formatting

//     Tool use is formatted using XML-style tags. The tool name is enclosed in opening and closing tags, and each parameter is similarly enclosed within its own set of tags. Here's the structure:

//     <tool_name>
//     <parameter1_name>value1</parameter1_name>
//     <parameter2_name>value2</parameter2_name>
//     ...</tool_name>

//     For example:

//     <read_file>
//     <path>src/main.js</path>
//     </read_file>

//     Always adhere to this format for the tool use to ensure proper parsing and execution, this is a strict rule and must be followed at all times.
//     When placing a tool call inside of action you must always end it like this: <kodu_action><tool_name><parameter1_name>value1</parameter1_name></tool_name></kodu_action> this is a strict rule and must be followed at all times.
