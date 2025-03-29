import { ClientRequest } from "@prisma/client";
import { StreamingFucntionProps } from "@repo/ai-utils/router";
import { generateText } from "ai";
import { TaskInstanceMetaType } from "../../convertfox/types";
import { models } from "../../models";
import { codingFunctionPrompt, codingSystemPrompt } from "../prompt.coding";
import { writeToFile } from "../tool/writeToFile";
import { fetchPackageDocs } from "../tool/fetchPackageDocs";
import { TokenUsageAnalyticsTracker } from "../../analytics/helper";
export const genLambdaCode = async (
  props: StreamingFucntionProps<any, any>,
  taskInstanceMeta: TaskInstanceMetaType,
  clientRequest: ClientRequest
) => {
  props.dataStream.writeMessageAnnotation({
    type: "thinking",
    content: "Writing lambda functions",
  });

  // Generate Lambda functions based on the task requirements
  for (const _function of taskInstanceMeta?.taskStructure?.lambdaFunctions ??
    []) {
    const prompt = await codingFunctionPrompt({
      type: "lambda",
      taskInstanceMeta,
      function: _function,
    });
    console.log("generating lambda function", _function.name);
    const result = await generateText({
      model: models.claude35Sonnet,
      system: codingSystemPrompt("backend"),
      prompt,
      toolChoice: "auto",
      maxSteps: 2,
      maxTokens: 5000,
      tools: {
        write_to_file: writeToFile(props, clientRequest),
        fetch_package_docs: fetchPackageDocs(props, clientRequest),
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
      ...props.requestBody,
      model: models.claude35Sonnet.modelId,
      usage: result.usage,
    });
    props.dataStream.writeMessageAnnotation({
      type: "thinking",
      content: "Finished - " + _function.name,
    });

    console.log("result", result.usage);

    // result.mergeIntoDataStream(props.dataStream, {
    //   experimental_sendStart: false,
    //   experimental_sendFinish: false,
    // });

    //await result.text;
  }

  return taskInstanceMeta;
};
