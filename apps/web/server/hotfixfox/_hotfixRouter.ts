import {
  getClientRequest,
  getTaskInstanceMeta,
} from "@/utils/services/db_functions/getClientRequest";
import { updateTaskInstanceMeta } from "@/utils/services/db_functions/updateClientRequest";
import {
  MICROFOX_LOGO,
  MySlackChannels,
  slackBotSdk,
} from "@/utils/services/slackBotSdk";
import { DEPLOY_STAGE } from "@prisma/client";
import {
  defaultCallbackResultBody,
  ServerStreamingFunction,
} from "@repo/ai-utils/router";
import { generateObject, generateText } from "ai";
import { models } from "../models";
import { z } from "zod";
import { TokenUsageAnalyticsTracker } from "../analytics/helper";
import { codingSystemPrompt } from "../buildfox/prompt.coding";
import { editFile, readFile } from "./tool/editFile";

// TODO: add support for modifying an unkonwn file not passed in the files list,
// for example, changing schedule means modifying the serverless.yml file
// it also has to update the taskInstanceMeta
export const hotfixFoxRouter: ServerStreamingFunction<
  any,
  defaultCallbackResultBody
> = async (props) => {
  const { dataStream, requestBody, responseBody } = props;
  const { clientRequestId, api_errors } = requestBody;

  let clientRequest = await getClientRequest(clientRequestId);
  let taskInstanceMeta = await getTaskInstanceMeta(clientRequestId);

  if (!clientRequest || !taskInstanceMeta?.taskInfo) {
    return {
      responseBody: { ...responseBody },
      appendRequestBody: { ...requestBody },
    };
  }

  if (!api_errors) {
    props.dataStream.writeMessageAnnotation({
      type: "error",
      content: "No api_errors provided",
    });
    return {
      responseBody: { ...responseBody },
      appendRequestBody: { ...requestBody },
    };
  }

  const files = taskInstanceMeta.buildingStep?.files?.map((file) => {
    return file.filePath;
  });

  props.dataStream.writeMessageAnnotation({
    type: "loading",
    text: "Debugging the errors",
  });

  const result = await generateObject({
    model: models.claude35Sonnet,
    schema: z.object({
      filesToFix: z.array(
        z.object({
          filePath: z
            .string()
            .describe("The path to the file that needs to be fixed"),
          errorContext: z
            .string()
            .describe(
              "The exact context of the error along with the detailed logs"
            ),
          modification: z
            .string()
            .describe(
              "The exact modification to be made to the file, along the reason for the modification"
            ),
        })
      ),
    }),
    system: `
    You are a highly skilled fullstack developer with extensive knoledge in typescript, nodejs, etc...

    You are given a list of files that need to be fixed along with the error context and the modification to be made.
    You need to return a list of files that need to be fixed.

    Only write a modification for those api_errors that provide a clear modification instructions.

    Your workflow:
    - Read the api_errors completely (the request, the response, the logs, the modification if provided)
    - Pay double attention on logs, if there is no modification provided
    - Pick the files that might need editing basing on the full context provided
    - attach the exact error contect or the exact modification requested to be made to the file
    `,
    prompt: `
    The files in the codebase are as follows:
    ${files?.join("\n")}

    Read the following api_errors:
    ${JSON.stringify(api_errors)}
    `,
  });
  TokenUsageAnalyticsTracker.trackUsage({
    ...props.requestBody,
    model: models.claude35Sonnet.modelId,
    usage: result.usage,
  });

  const filesToFix = result.object.filesToFix;
  //console.log(filesToFix);

  props.dataStream.writeMessageAnnotation({
    type: "loading",
    text: `Fixing errors across ${filesToFix.length} files`,
  });

  for (const fileToFix of filesToFix) {
    try {
      const fileFixResult = await generateText({
        model: models.claude35Sonnet,
        system: `
        You are a highly skilled fullstack developer with extensive knoledge in typescript, nodejs, etc...


        Tool use:
        - to edit the code, use the following tools:
            - edit_file
        - to read the code, use the following tools:
            - read_file

        Your workflow:
        - Read the file
        - Read the error context (if provided)
        - Read the modification to be made (if provided)
        - Edit the file
        `,
        prompt: `
        You are given a file that needs to be fixed along with the error context and the modification to be made.
        You need to return the modified file.

        File to fix:
        ${fileToFix.filePath}

        Error context:
        ${fileToFix.errorContext}

        Modification to be made:
        ${fileToFix.modification}
        `,
        tools: {
          read_file: readFile(props, clientRequest),
          edit_file: editFile(props, clientRequest),
        },
        toolChoice: "auto",
        maxSteps: 2,
        onStepFinish: (step) => {
          console.log(step.usage);
        },
      });

      props.dataStream.writeMessageAnnotation({
        type: "loading",
        text: `Fixed ${fileToFix.filePath.split("/").pop()}`,
      });

      TokenUsageAnalyticsTracker.trackUsage({
        ...props.requestBody,
        model: models.claude35Sonnet.modelId,
        usage: result.usage,
      });
    } catch (error) {
      console.log(error);
    }
  }

  props.dataStream.writeMessageAnnotation({
    type: "ui",
    objectType: "hotFixes",
    persona: "buildfox",
    text: `Finished fixing errors`,
    filesFixed: filesToFix,
    buttons: [
      {
        action: "highlightInput",
        text: "Make changes",
        type: "deny",
        className: "bg-neutral-200 text-black hover:bg-neutral-300",
      },
      {
        action: "shiftMinion",
        actionText: "Retry Testing !",
        type: "confirm",
        text: "Retry Testing !",
        className: "bg-green-500 text-white hover:bg-green-600",
        value: "deployfox",
      },
    ],
  });

  return {
    responseBody: { ...responseBody },
    appendRequestBody: { ...requestBody },
  };
};
