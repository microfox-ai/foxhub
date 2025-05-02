import { ClientRequest } from "@prisma/client";
import { StreamingFucntionProps } from "@repo/ai-utils/router";
import { generateText } from "ai";
import { TokenUsageAnalyticsTracker } from "../../analytics/helper";
import { TaskInstanceMetaType } from "../../convertfox/types";
import { models } from "../../models";
import { codingFunctionPrompt, codingSystemPrompt } from "../prompt.coding";
import { fetchPackageDocs } from "../tool/fetchPackageDocs";
import { writeToFile } from "../tool/writeToFile";
export const genCronJobs = async (
  props: StreamingFucntionProps<any, any>,
  taskInstanceMeta: TaskInstanceMetaType,
  clientRequest: ClientRequest
) => {
  props.dataStream.writeMessageAnnotation({
    type: "thinking",
    content: "Writing cron jobs",
  });
  try {
    // Generate Cron jobs based on the task requirements
    for (const cronJob of taskInstanceMeta?.taskStructure?.cronJobs ?? []) {
      const prompt = await codingFunctionPrompt({
        type: "cron",
        taskInstanceMeta,
        cron: cronJob,
        template_type: taskInstanceMeta.taskStructure?.templateType ?? "plain",
        clientRequest,
      });
      console.log("generating cron job", cronJob.name);
      const result = await generateText({
        model: models.claude35Sonnet,
        system: codingSystemPrompt("backend"),
        prompt,
        toolChoice: "auto",
        maxSteps: 2,
        maxTokens: 5000,
        tools: {
          write_to_file: writeToFile(
            props,
            clientRequest,
            taskInstanceMeta?.taskStructure?.templateType
          ),
          fetch_package_docs: fetchPackageDocs(props, clientRequest),
        },
        onStepFinish: (step) => {
          console.log("step", step.usage);
        },
        //   onFinish: async (result) => {
        //     console.log("result", result.usage);
        //   },
        //   onError: (error) => {
        //     console.log("error", error);
        //   },
      });
      TokenUsageAnalyticsTracker.trackUsage({
        ...props.requestBody,
        model: models.claude35Sonnet.modelId,
        usage: result.usage,
      });

      props.dataStream.writeMessageAnnotation({
        type: "thinking",
        content: "Finished coding - " + cronJob.name,
      });

      console.log("result", result.usage);
    }

    return taskInstanceMeta;
  } catch (err) {
    console.log("error", err);
    props.dataStream.writeMessageAnnotation({
      type: "error",
      content: "Error generating cron jobs",
    });
    throw err;
  }
};
