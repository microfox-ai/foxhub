import { MinionType } from "@/components/screens/hooks/convertors";
import { prisma } from "@/prisma/prisma";
import { findLastElementWith } from "@/utils/helpers/array";
import {
  getClientRequest,
  getTaskInstanceMeta,
} from "@/utils/services/db_functions/getClientRequest";
import {
  createOpenAPIToolsClient,
  OpenAPIToolsClient,
} from "@/utils/services/OpenAPIToolsClient";
import { DEPLOY_STAGE } from "@prisma/client";
import {
  defaultCallbackResultBody,
  ServerStreamingFunction,
} from "@repo/ai-utils/router";
import { generateText, streamText } from "ai";
import { models } from "../models";
import {
  getToolsRequiringConfirmation,
  processToolCalls,
} from "@/utils/services/ToolHumanLayer";

// TODO: add support for modifying an unkonwn file not passed in the files list,
// for example, changing schedule means modifying the serverless.yml file
// it also has to update the taskInstanceMeta
export const taskQueryRouter: ServerStreamingFunction<
  any,
  defaultCallbackResultBody
> = async (props) => {
  const { dataStream, requestBody, responseBody } = props;
  const { clientRequestId } = requestBody;

  if (!requestBody.minionContinue) {
    dataStream.writeMessageAnnotation({
      type: "minion",
      value: MinionType.TaskQueryFox,
    });
  }

  // get all taskQuery messages + this 1 last message in the queue (hopefully the user message)
  requestBody.messages = requestBody.messages.filter(
    (m: any, index: number) => {
      const minion = m.annotations?.find((a: any) => a.type === "minion");
      return (
        minion?.value === MinionType.TaskQueryFox ||
        index === requestBody.messages.length - 1
      );
    }
  );

  requestBody.messages = requestBody.messages.map((m: any, index: number) => ({
    ...m,
    parts:
      index === requestBody.messages.length - 1
        ? m.parts
        : [findLastElementWith(m.parts, (p: any) => p.type === "text")],
    annotations: [],
    toolInvocations: [],
  }));

  try {
    dataStream.writeMessageAnnotation({
      type: "thinking",
      content: "Fetching tools for this task",
    });

    let clientRequest = await getClientRequest(clientRequestId);
    let taskInstanceMeta = await getTaskInstanceMeta(clientRequestId);

    const clientDeployment = await prisma.clientDeployment.findFirst({
      where: {
        originClientRequestId: clientRequestId,
      },
    });

    if (!clientDeployment || !clientRequest || !taskInstanceMeta) {
      return {
        responseBody: { ...responseBody },
        appendRequestBody: { ...requestBody },
      };
    }

    const docData = (clientDeployment.metadata as any).docData;
    const baseUrl =
      clientDeployment.baseUrl +
      "/" +
      (clientDeployment.stage === DEPLOY_STAGE.PROD ? "prod" : "staging");

    const thisCLient = await createOpenAPIToolsClient({
      schema: docData,
      baseUrl: baseUrl,
    });

    const toolSet = await thisCLient.tools({ disableAllExecutions: true });

    console.log(Object.keys(toolSet.executions).length, "toolSet.executions");
    console.log(Object.keys(toolSet.tools).length, "toolSet.tools");

    dataStream.writeMessageAnnotation({
      type: "toolsRequiringConfirmation",
      list: getToolsRequiringConfirmation(toolSet.tools),
      allMetadata: toolSet.metadata,
    });

    const processedMessages = await processToolCalls(
      {
        messages: requestBody.messages,
        dataStream,
        tools: toolSet.tools,
      },
      toolSet.executions
    );

    const msg = streamText({
      model: models.googleGeminiPro,
      system: `
    You are a helpful assistant that can answer questions in regards to the current task.

    The entire task Information is here : ${JSON.stringify(taskInstanceMeta)}

    Call the tools as needed in order to answer the users query or perform user requested actions.
    ${Object.keys(toolSet.tools).join(", ")}

    Before calling the above tools, make sure you give some contextal text info to the user, on why you need to use this tool, as all the above tools require user permissions. after outputting the hint message, you can directly execute the tool you need to call.

      If the tool has a lot of information, output into a neat markdown format.
    `,
      messages: processedMessages,
      tools: toolSet.tools,
      toolChoice: "auto",
      maxSteps: 10,
      onError: (error) => {
        console.error(error);
      },
    });

    msg.mergeIntoDataStream(dataStream, {
      experimental_sendFinish: true,
    });

    return {
      responseBody: { ...responseBody },
      appendRequestBody: { ...requestBody },
    };
  } catch (error) {
    console.error(error);
    return {
      responseBody: { ...responseBody },
      appendRequestBody: { ...requestBody },
    };
  }
};
