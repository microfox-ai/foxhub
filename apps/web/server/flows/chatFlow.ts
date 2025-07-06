import { AiAgentKit } from "@repo/ai-utils/router";
import { MinionFlow } from "@/components/screens/hooks/convertors";
import { DefaultMessageMetadata } from "../microfoxRouter";
import { convertToModelMessages, streamText } from "ai";
import { models } from "../models";
import { cleanUiMessageParts } from "@/utils/helpers/array";
import { createOpenApiToolset } from "@microfox/tool-kit";
import docData from "../slsfox/test_openapi.json";
import { fetchAuthSecrets } from "../slsfox/fetchVariables";
import { codeTemplateType } from "../convertfox/helpers/types";
import { templateEnvsFromTaskIntegrations } from "../buildfox/helper/templateEnvsFromTaskIntegrations";
import { prisma } from "@/prisma/prisma";

const chatManager = new AiAgentKit<any, any, any, any>();

chatManager.use("/", async (ctx, next) => {
  const { response } = ctx;
  response.writeMessageMetadata({
    minionFlow: MinionFlow.ChatFlow,
  });
  return next();
});

chatManager.agent<DefaultMessageMetadata, any, any>("/", async (ctx) => {
  const clientRequest = await prisma.clientRequest.findUnique({
    where: {
      id: ctx.request.clientRequestId,
    },
  });

  const client = await createOpenApiToolset({
    schema: docData as any,
    baseUrl: "http://localhost:4000",
    name: "slack-web-tiny",
    getAuth: async (options) => {
      const output = await fetchAuthSecrets(
        options,
        clientRequest,
        undefined,
        true
      );
      if (clientRequest) {
        const envs = await templateEnvsFromTaskIntegrations(
          codeTemplateType.enum.upstash_sls,
          clientRequest
        );
        output.variables = output.variables?.concat(envs) ?? envs;
      }
      return output;
    },
  });

  const toolSet = await client.tools({
    disableAllExecutions: true,
  });

  console.log("toolSet", Object.keys(toolSet.tools));
  //return;

  const processedMessages = await client.processToolResult(
    cleanUiMessageParts(ctx.request.messages)
  );

  const stream = streamText({
    model: models.claudeHaiku,
    messages: convertToModelMessages(cleanUiMessageParts(processedMessages)),
    tools: toolSet.tools,
    toolChoice: "auto",
    system:
      "You are called Microfox, a helpful assistant that can user with his tasks.",
    stopWhen: client.createHitlStopStep(),
  });

  ctx.response.merge(stream.toUIMessageStream());
});

export { chatManager };

// ux pattern.
// user asks to send a notification to everyone in team.
// pickAuthSecrets is called as tool, so as to select the identity & get the variables.
// user picks/approves the identity.
// after authentication exists, it call the listChannels tool & asks user.

// in a second message, user says a particular channel.
// it should not again call the pickAuthSecrets tool (as the auth are already set at the above step).
// it should call the postmessage tool to send the message now.

// AUTH:
// 2. authSecret selection - first time setup. (untested)
// 3. check encrypt/decrypt headers working.
// 4. multiPackage authSecrets for a single toolCall
// 5. cuwtom secrets for a single toolCall

// TODO:
// 1. insert toolCapabilities into the prompt
// 2. divide toolselection & toolExecution into seperate agents.
// 3.

// default Available toolcalss - sequentialThinker, Fetcher WebPage
