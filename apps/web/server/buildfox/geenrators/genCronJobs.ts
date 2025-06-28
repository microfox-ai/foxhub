import { ClientRequest, ClientSecret } from "@prisma/client";
import { AiContext } from "@repo/ai-utils/router";
import { generateText, stepCountIs } from "ai";
import { TokenUsageAnalyticsTracker } from "../../analytics/helper";
import {
  codeTemplateType,
  TaskInstanceMetaType,
} from "../../convertfox/helpers/types";
import { models } from "../../models";
import { codingFunctionPrompt, codingSystemPrompt } from "../prompt.coding";
import { fetchPackageDocs } from "../tool/fetchPackageDocs";
import { writeToFile } from "../tool/writeToFile";

export const genCronJobs = async (
  ctx: AiContext<any, any, any, any>,
  taskInstanceMeta: TaskInstanceMetaType,
  clientRequest: ClientRequest,
  clientSecrets: ClientSecret[]
) => {
  ctx.response.writeMessageMetadata({
    loader: "Writing cron jobs",
  });
  try {
    console.log("taskInstanceMeta", taskInstanceMeta.taskStructure?.cronJobs);
    // Generate Cron jobs based on the task requirements
    for (const cronJob of taskInstanceMeta?.taskStructure?.cronJobs ?? []) {
      const prompt = await codingFunctionPrompt({
        type: "cron",
        taskInstanceMeta,
        cron: cronJob,
        template_type:
          taskInstanceMeta.taskStructure?.templateType ??
          codeTemplateType.enum.upstash_sls,
        clientRequest,
        clientSecrets,
      });
      console.log("generating cron job", cronJob.name);
      const result = await generateText({
        model: models.claude35Sonnet,
        system: codingSystemPrompt("backend", true),
        prompt,
        toolChoice: "required",
        maxRetries: 3,
        stopWhen: stepCountIs(2),
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
              type: "cron",
              _function: cronJob,
            }
          ),
        },
        onStepFinish: (step) => {
          console.log("step cron jon finish", step.usage);
        },
        //  onFinish: async (result) => {
        //   console.log("result", result.usage);
        //  },
        //  onError: (error) => {
        //   console.log("error", error);
        //  },
      });
      TokenUsageAnalyticsTracker.trackUsage({
        userId: ctx.request.userId,
        clientRequestId: ctx.request.clientRequestId,
        model: models.claude35Sonnet.modelId,
        usage: result.usage,
      });

      ctx.response.writeMessageMetadata({
        loader: "Finished coding - " + cronJob.name,
      });

      console.log("result", result.usage);
    }

    return taskInstanceMeta;
  } catch (err) {
    console.log("error", err);
    ctx.response.writeMessageMetadata({
      error: "Error generating cron jobs",
    });
    throw err;
  }
};
