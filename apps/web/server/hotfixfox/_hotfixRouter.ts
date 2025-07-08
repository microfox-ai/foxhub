import {
  getClientRequest,
  getTaskInstanceMeta,
} from "@/utils/services/db_functions/getClientRequest";
import { generateObject, generateText } from "ai";
import { z } from "zod";
import { TokenUsageAnalyticsTracker } from "../analytics/helper";
import { models } from "../models";
import { editFile, readFile } from "./tool/editFile";
import { AiRouter } from "@microfox/ai-router";
import { DefaultMessageMetadata } from "../microfoxRouter";
import { uiTool } from "../ui/uiTool";

// TODO: add support for modifying an unkonwn file not passed in the files list,
// for example, changing schedule means modifying the serverless.yml file
// it also has to update the taskInstanceMeta
const hotfixFoxAgent = new AiRouter<DefaultMessageMetadata, any, any, any>();

hotfixFoxAgent.agent("/", async (ctx) => {
  const { request, response } = ctx;
  const { clientRequestId, api_errors } = request;

  let clientRequest = await getClientRequest(clientRequestId);
  let taskInstanceMeta = await getTaskInstanceMeta(clientRequestId);

  if (!clientRequest || !taskInstanceMeta?.taskInfo) {
    response.writeMessageMetadata({
      error: "Client request or task instance meta not found",
    });
    return;
  }

  if (!api_errors) {
    response.writeMessageMetadata({
      error: "No api_errors provided",
    });
    return;
  }

  const files = taskInstanceMeta.buildingStep?.files?.map((file) => {
    return file.filePath;
  });

  response.writeMessageMetadata({
    loader: "Debugging the errors",
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
    userId: request.userId,
    clientRequestId: request.clientRequestId,
    originClientRequestId: request.originClientRequestId,
    model: models.claude35Sonnet.modelId,
    usage: result.usage,
  });

  const filesToFix = result.object.filesToFix;
  //console.log(filesToFix);

  response.writeMessageMetadata({
    loader: `Fixing errors across ${filesToFix.length} files`,
  });

  for (const fileToFix of filesToFix) {
    try {
      const fileFixResult = await generateText({
        model: models.claude35Sonnet,
        system: `
        You are a highly skilled fullstack developer with extensive knoledge in typescript, nodejs, etc...

        Ground rules:
        - make sure the imports follow the '.js' extension like this for imports from other folders:
        import { exampleHelper } from '../helpers/fileName.js'
        

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
          read_file: readFile(ctx, clientRequest),
          edit_file: editFile(ctx, clientRequest),
        },
        toolChoice: "auto",
        onStepFinish: (step) => {
          console.log(step.usage);
        },
      });

      response.writeMessageMetadata({
        loader: `Fixed ${fileToFix.filePath.split("/").pop()}`,
      });

      TokenUsageAnalyticsTracker.trackUsage({
        userId: request.userId,
        clientRequestId: request.clientRequestId,
        originClientRequestId: request.originClientRequestId,
        model: models.claude35Sonnet.modelId,
        usage: result.usage,
      });
    } catch (error) {
      console.log(error);
    }
  }

  response.writeCustomTool(
    uiTool.construct<"card">("hotfixfox", "hotfixes", {
      uiType: "card",
      text: `Finished fixing errors`,
      object: {
        objectType: "hotfixes",
        object: {
          filesFixed: filesToFix,
        },
      },
      buttons: [
        {
          text: "Make changes",
          type: "deny",
        },
        {
          action: {
            id: "shiftMinion",
            props: "deployfox",
            actionText: "Retry Testing !",
          },
          text: "Retry Testing !",
          type: "confirm",
        },
      ],
    })
  );
});

export { hotfixFoxAgent };
