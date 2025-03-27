import { ClientRequest } from "@prisma/client";
import { StreamingFucntionProps } from "@repo/ai-utils/router";
import { generateText } from "ai";
import { TaskInstanceMetaType } from "../convertfox/types";
import { models } from "../models";
import { codingFunctionPrompt, codingSystemPrompt } from "./prompt.coding";
import { writeToFile } from "./writeToFile";

export const genLambdaCode = async (
  props: StreamingFucntionProps<any, any>,
  taskInstanceMeta: TaskInstanceMetaType,
  clientRequest: ClientRequest
) => {
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
      maxSteps: 1,
      maxTokens: 4000,
      tools: {
        write_to_file: writeToFile(props, clientRequest),
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
    props.dataStream.writeMessageAnnotation({
      type: "thinking",
      value: "Finished - " + _function.name,
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
