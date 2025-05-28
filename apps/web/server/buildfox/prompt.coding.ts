import { ClientRequest, ClientSecret } from "@prisma/client";
import dedent from "dedent";
import fs from "fs/promises";
import path from "path";
import {
  codeTemplateType,
  CodeTemplateType,
  TaskInstanceMetaType,
  TaskStructure,
} from "../convertfox/types";
import { baseFilePrompt } from "./prompts/basePrompt";
import { envsPrompt } from "./prompts/envsPrompt";
import { helperFilesContext } from "./prompts/helperFilesContext";
import { packagesPrompt } from "./prompts/packagesPrompt";
import { fetchTemplateDir, readAllGenFilesList } from "./tool/writeToFile";
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
    ${
      step === "frontend" &&
      `
    You are also an expert in building the UI for the same.
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
      - write_code
       - fileName is the name of the file to write to (MUST required)
       - filePath is the The complete file path to write to - relative to the project root (MUST required)
       - fileType is the type of the file to write  - ts, tsx, json, etc (MUST required)
       - fileContent is the content of the file to write and is a MUST required in tool arguments, as it holds the actual code

    CRITICAL: The fileContent parameter is ABSOLUTELY MANDATORY and must contain the complete, actual code content of the file. 
    NEVER call write_code without providing the full fileContent parameter with the actual code inside it.
    The fileContent should contain the entire TypeScript/JavaScript code that you want to write to the file.

    ${
      writingCoreFunctions
        ? `
    - to fetch the docs on a package, use the following tool:
      - fetch_package_docs
    `
        : ""
    }

    ----

    A few things about your workflow:
    - You first carefully analyse the requirements, and then plan what needs to be done.
    - You then critisize your plan, and then refine it to this specific task & keep maximum code in a single file.
    - If you know what packages are going to be used, then you can fetch the docs on it using the fetch_package_docs tool.
    - if a package has ratelimits (mentioned in the docs), carefully check the docs on how to handle multiple requests.
    - if you cant find any info on how to handle ratelimits, assume a default ratelimit, so try to handle multiple requests sequentially with inbetween delays.
    - If a package doc is not available, then you can use your own knowledge to integrate said platform
    - You then finish the task, by writing the code to the file using the write_code tool.

    GROUND RULES
       - Never use theese packages - axios

    SILLY ERROR TO AVOID
    - Make sure function names & identifiers are unique
    - Make sure proper null exception handling is done (?. operator)

    YOU MUST NEVER WRITE ANY MOCK CODE, it should be production ready code.
    even if the packages are not available, you can use your own knowledge to integrate said platform.
    
    - DO NOT write like this:
      - "yourmail@mail.com" // Replace this with your personam mail.
    - WRITE like this:
      - process.env.YOUR_MAIL_ID 

    - Do not use path parameters in the request event of aws lambda functions, 
      - use query parameters or request body instead.

    Critically, you must carefully analyze the results of each tool call you receive. 
    These outputs might mention error messages, files, or symbols you haven't considered yet.
    Mak double sure, you're using ?. format for all anything that could throw a null or undefined error.

    AFTER EACH TOOL CALL, do not output any text, just wait for the next tool call.
    `;
};

// DO NOT self assume or hard code placeholder variables in the code, create envs for information that you dont have access to yet
// - In the file code content, Do not escape with \\ unnecessarily, it will break the code.
// - In open api docs, use a combination of ""+"" to write the code.

export const codingFileTypePrompt = (fileType: string) => {
  if (fileType === "") {
    return `
            Write the package.json file at the end of the task.
        `;
  }
};
//

export const getFunctionNameFromKebabCase = (name_kebab_case: string) => {
  return name_kebab_case
    ?.split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((word, index) =>
      index === 0
        ? word.toLowerCase()
        : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    )
    .join("");
};

export const codingFunctionPrompt = async ({
  type,
  taskInstanceMeta,
  function: _function,
  cron: _cron,
  template_type,
  clientRequest,
  clientSecrets,
}: {
  type: "lambda" | "cron";
  taskInstanceMeta: TaskInstanceMetaType;
  function?: TaskStructure["lambdaFunctions"][0];
  cron?: TaskStructure["cronJobs"][0];
  template_type: CodeTemplateType;
  clientRequest?: ClientRequest;
  clientSecrets: ClientSecret[];
}) => {
  const rootDir = fetchTemplateDir(template_type);

  const lambdaExample = await fs.readFile(
    path.join(process.cwd(), rootDir, "function.txt"),
    "utf8"
  );
  const cronExample = await fs.readFile(
    path.join(process.cwd(), rootDir, "cron.txt"),
    "utf8"
  );

  let files = await readAllGenFilesList(clientRequest!);

  if (!clientRequest) {
    return ``;
  }

  let helperFileContext = await helperFilesContext(
    clientRequest,
    taskInstanceMeta,
    files
  );
  let envsPromptContext = await envsPrompt(
    clientRequest,
    clientSecrets,
    taskInstanceMeta,
    files,
    type
  );

  //console.log("templateEnvs", templateEnvs);
  //console.log("coreEnvs", coreEnvs);
  const nameOfFunction =
    type === "lambda"
      ? getFunctionNameFromKebabCase(_function?.name ?? "")
      : getFunctionNameFromKebabCase(_cron?.name ?? "");

  //  ${helperFileContext}
  //

  return dedent`You are requested to write a serverless function for the following requirement:
            
            Task Summary: ${taskInstanceMeta?.taskInfo?.summary}
            ${baseFilePrompt(type, type === "lambda" ? _function : _cron, false)}

            ${packagesPrompt(taskInstanceMeta)}

            ${envsPromptContext}

            ${helperFileContext}

            Requirements:
            - Use TypeScript
            - Implement proper error handling
            ${
              template_type === codeTemplateType.enum.upstash_sls
                ? "use @upstash/redis for state management - only if data needs to be persisted acrosss function calls"
                : ""
            }
            - Follow Serverless best practices
            - Add proper Docs
            - Add appropriate comments
            - Return properly formatted responses
            - Do not use Promise.all, use sequential processing with await inside a for loop
            - Return the response object with the proper headers like in example (always enable cors by default, & pick json response type by default, unless otherwise specified)

            Complete example for a function stored at src/functions/${type === "lambda" ? "getExternalData" : "dailyMorningJob"}.ts:
            ${dedent`${type === "lambda" ? lambdaExample : cronExample}`}

            - file naming should be like this: 
            ${nameOfFunction}.ts in camelCase
            - function should be exported like this:
            export const ${nameOfFunction}Function = in CamelCase
            - openapi docs export should be like this: 
            export const ${nameOfFunction}Docs = in camelCase 

            Open Api Docs:
            - If this function is a webhook, that can be triggered externally in another platform or app, you must detail in the docs, on how to setup this webhook there.
            - If this function is a cronjob, you must detail what this cron job does, and how to setup the cron job in the target platform.
            - the docs should be a pure string, do not insert any $ characters in the docs setup instructions.
            - only write setup instructions for the functions, not for the cron jobs.
            - only write setup instructions if it is meant to be configured as a webhook in external platform.
          
            The code should be created in the src/functions directory.
            Make sure to use the necessary imports from the packages when needed.
            Always call fetch_package_docs for all the packages needed to better understand how to write the code for the task.
            Only use the packages that are listed above in the project.
            Use named exports for the function.
            Make sure the exports are unique and does not conflict with other imports/exports declerations.
            Also export the doc file for the function.
            Make no assumption of utils, or outside files (other than the ones provided) - Create complete functionality in a single file.
            Do not write any mock code, it should be production ready code.
            Make sure to pay attention the TASK SUMMARY, and the FUNCTION DESCRIPTION & BRIEF, 
            if conflicting follow this priority order, TASK SUMMARY > FUNCTION DESCRIPTION > FUNCTION BRIEF.

          Critically, if the packageDocs are available from fetch_package_docs tool, 
          do not make any assumptions of functions, properties that are not mentioned in the package docs           
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
