import { MinionType } from "@/components/screens/hooks/convertors";
import { prisma } from "@/prisma/prisma";
import {
  cleanUiMessageParts,
  findLastElementWith,
} from "@/utils/helpers/array";
import {
  getClientRequest,
  getTaskInstanceMeta,
} from "@/utils/services/db_functions/getClientRequest";
//import { getToolsRequiringConfirmation } from "@/utils/services/ToolHumanLayer";
import { createOpenApiToolset } from "@microfox/tool-kit";
import { DEPLOY_STAGE } from "@prisma/client";
import { StreamWriter } from "@repo/ai-utils/helper";
import { AiRouter, AiHandler, AiMiddleware } from "@microfox/ai-router";
import { convertToModelMessages, streamText } from "ai";
import { models } from "../models";

// TODO: add support for modifying an unkonwn file not passed in the files list,
// for example, changing schedule means modifying the serverless.yml file
// it also has to update the taskInstanceMeta
const taskQueryAgent = new AiRouter<any, any, any, any>();

taskQueryAgent.use("/", async (ctx, next) => {
  const { request, state, response } = ctx;
  console.log(ctx.executionContext.currentPath, "currentPath");
  response.writeMessageMetadata({
    revalidatePath: ctx.executionContext.currentPath,
    revalidateType: "agent",
  });
  return next();
});

taskQueryAgent.agent("/", async (ctx) => {
  const { request, state, response } = ctx;

  if (!request.minionContinue) {
    response.writeMessageMetadata({
      minionType: MinionType.TaskQueryFox,
    });
  }
  const { clientRequestId } = request;
  // get all taskQuery messages + this 1 last message in the queue (hopefully the user message)
  // request.messages = request.messages.filter((m, index: number) => {
  //   const minion = (m.metadata as any)?.minion;
  //   return (
  //     minion?.value === MinionType.TaskQueryFox ||
  //     index === request.messages.length - 1
  //   );
  // });

  // request.messages = request.messages.map((m, index: number) => ({
  //   ...m,
  //   parts:
  //     index === request.messages.length - 1
  //       ? m.parts
  //       : [
  //           findLastElementWith(m.parts, (p: any) => p.type === "text") ?? {
  //             type: "text",
  //             text: "",
  //           },
  //         ],
  // }));

  try {
    response.writeMessageMetadata({
      loader: "Fetching tools for this task",
    });

    let clientRequest = await getClientRequest(clientRequestId);
    let taskInstanceMeta = await getTaskInstanceMeta(clientRequestId);

    const clientDeployment = await prisma.clientDeployment.findFirst({
      where: {
        originClientRequestId: clientRequestId,
      },
    });

    if (!clientDeployment || !clientRequest || !taskInstanceMeta) {
      return;
    }

    const docData = (clientDeployment.metadata as any).docData;
    const baseUrl =
      clientDeployment.baseUrl +
      "/" +
      (clientDeployment.stage === DEPLOY_STAGE.PROD ? "prod" : "staging");

    // const thisCLient = await createOpenAPIToolsClient({
    //   schema: docData,
    //   baseUrl: baseUrl,
    // });
    // const toolSet = await thisCLient.tools({ disableAllExecutions: true });
    const client = await createOpenApiToolset({
      schema: docData,
      baseUrl: baseUrl,
      name: "internalClient",
      auth: {
        encryptionKey: process.env.OPEN_API_ENCRYPTION_KEY || "",
      },
    });

    console.log(docData, "docData");
    console.log(baseUrl, "baseUrl");
    console.log(client, "client");
    const toolSet = await client.tools({ disableAllExecutions: true });
    console.log(Object.keys(toolSet.executions).length, "toolSet.executions");
    console.log(
      Object.keys(toolSet.tools).length,
      "toolSet.tools",
      toolSet.tools
    );
    //console.log(toolSet.tools, "client");

    // response.writeCustomTool({
    //   toolName: "toolsRequiringConfirmation",
    //   input: {
    //     list: [],
    //     allMetadata: toolSet.metadata,
    //   },
    //   output: {
    //     type: "ui",
    //     objectType: "toolsRequiringConfirmation",
    //     persona: "taskQueryFox",
    //     text: "Tools Requiring Confirmation",
    //   },
    // });

    const last7Messages =
      request.messages.length > 7
        ? request.messages.slice(-7)
        : request.messages;

    console.log(cleanUiMessageParts(last7Messages), "last7Messages");
    let processedMessages = await client.parseHitl(
      cleanUiMessageParts(last7Messages),
      ctx.response,
      async (_authObject) => {
        return _authObject;
      }
    );

    processedMessages = processedMessages.map((m) => ({
      ...m,
      parts: m.parts.map((p) => ("input" in p ? p : { ...p, input: {} })),
    }));

    // console.log(
    //   request.messages[0],
    //   JSON.stringify(processedMessages[processedMessages.length - 1]?.parts),
    //   "processedMessages"
    // );

    // const processedMessages = await processToolCalls(
    //   {
    //     messages: requestBody.messages,
    //     dataStream,
    //     tools: toolSet.tools,
    //   },
    //   toolSet.executions
    // );

    const result = streamText({
      model: models.claude35Sonnet,
      system: `
    You are a helpful assistant that can answer questions in regards to the current task.

    The entire task Information is here : ${JSON.stringify(taskInstanceMeta)}

    Call the tools as needed in order to answer the users query or perform user requested actions.
    ${Object.keys(toolSet.tools).join(", ")}

    Before calling the above tools, make sure you give some contextal text info to the user, on why you need to use this tool, as all the above tools require user permissions. after outputting the hint message, you can directly execute the tool you need to call.

      If the tool has a lot of information, output into a neat markdown format.
    `,
      messages: convertToModelMessages(cleanUiMessageParts(processedMessages)),
      tools: toolSet.tools,
      toolChoice: "auto",
      stopWhen: (s) => client.isHitlStep()(s),
    });

    response.merge(result.toUIMessageStream());

    const test = await result.text;
    console.log(test, "result");
  } catch (error) {
    console.error(error);
  }
});

export { taskQueryAgent };
