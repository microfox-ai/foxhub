import { ClientRequest, ClientSecret } from "@prisma/client";
import { generateText, stepCountIs } from "ai";
import {
  codeTemplateType,
  TaskInstanceMetaType,
} from "../../convertfox/helpers/types";
import { models } from "../../models";
import { codingFunctionPrompt, codingSystemPrompt } from "../prompt.coding";
import { writeToFile } from "../tool/writeToFile";
import { fetchPackageDocs } from "../tool/fetchPackageDocs";
import { TokenUsageAnalyticsTracker } from "../../analytics/helper";
import { AiContext } from "@repo/ai-utils/router";

// IMPORTANT TODO: decide to fetch package Info or fetch example based on previous builds (& then, only then required info is fetched)
export const genLambdaCode = async (
  ctx: AiContext<any, any, any, any>,
  taskInstanceMeta: TaskInstanceMetaType,
  clientRequest: ClientRequest,
  clientSecrets: ClientSecret[]
) => {
  ctx.response.writeMessageMetadata({
    loader: "Writing lambda functions",
  });

  try {
    // Generate Lambda functions based on the task requirements
    for (const _function of taskInstanceMeta?.taskStructure?.lambdaFunctions ??
      []) {
      const prompt = await codingFunctionPrompt({
        type: "lambda",
        taskInstanceMeta,
        function: _function,
        template_type:
          taskInstanceMeta.taskStructure?.templateType ??
          codeTemplateType.enum.upstash_sls,
        clientRequest,
        clientSecrets,
      });
      console.log("generating lambda function", _function.name);
      const result = await generateText({
        model: models.claude35Sonnet,
        system: codingSystemPrompt("backend", true),
        prompt,
        toolChoice: "required",
        stopWhen: stepCountIs(2),
        //maxRetries: 3,
        //maxTokens: 5000,
        tools: {
          write_code: writeToFile(
            ctx,
            clientRequest,
            taskInstanceMeta?.taskStructure?.templateType
          ),
          fetch_package_docs: fetchPackageDocs(
            ctx,
            clientRequest,
            taskInstanceMeta,
            {
              clientSecrets,
              type: "lambda",
              _function,
            }
          ),
        },
        onStepFinish: (step) => {
          console.log("step", step.usage);
        },
        // onFinish: async (result) => {
        //   console.log("result", result.usage);
        // },
        //   onError: (error) => {
        //     console.log("error", error);
        //   },
      });
      TokenUsageAnalyticsTracker.trackUsage({
        userId: ctx.request.userId,
        clientRequestId: ctx.request.clientRequestId,
        model: models.claude35Sonnet.modelId,
        usage: result.usage,
      });
      ctx.response.writeMessageMetadata({
        loader: "Finished coding - " + _function.name,
      });

      console.log("result", result.usage);
    }

    return taskInstanceMeta;
  } catch (err) {
    console.log("error", err);
    ctx.response.writeMessageMetadata({
      error: "Error generating lambda function",
    });
    throw err;
  }
  // result.mergeIntoDataStream(props.dataStream, {
  //   experimental_sendStart: false,
  //   experimental_sendFinish: false,
  // });

  //await result.text;
};
