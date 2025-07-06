import { AiRouter } from "@microfox/ai-router";
import { MinionFlow } from "@/components/screens/hooks/convertors";
import { DefaultMessageMetadata } from "../microfoxRouter";
import { convertToModelMessages, generateText, streamText } from "ai";
import { models } from "../models";
import {
  cleanUiMessageParts,
  findLastElementWith,
} from "@/utils/helpers/array";
import { createOpenApiToolset } from "@microfox/tool-kit";
import { fetchAuthSecrets } from "../slsfox/fetchVariables";
import { codeTemplateType } from "../convertfox/helpers/types";
import { templateEnvsFromTaskIntegrations } from "../buildfox/helper/templateEnvsFromTaskIntegrations";
import { prisma } from "@/prisma/prisma";
import { getTextParts } from "@microfox/ai-router";
import { updateClientRequest } from "@/utils/services/db_functions/updateClientRequest";
import { toolSelectionAgent } from "../toolfox/toolSelection";
import { toolExecutionAgent } from "../toolfox/toolExecution";

const chatManager = new AiRouter<any, any, any, any>();

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

  ctx.state.clientRequest = clientRequest;
  if (
    clientRequest &&
    !clientRequest?.title &&
    ctx.request.messages.length > 3
  ) {
    const cleanedMessages = cleanUiMessageParts(ctx.request.messages, {
      removeToolCalls: true,
    });
    const textParts = cleanedMessages.map(getTextParts).flat().join("\n");

    const text = await generateText({
      model: models.claudeHaiku,
      system: `
        You are a helpful assistant that can generate a title for a chat session.
        Generate a 2-5 word title for the chat session.
        `,
      prompt: `
        Generate a title for the following chat session:
        ${textParts}
        `,
    });

    const updatedClientRequest = await updateClientRequest({
      clientRequestId: clientRequest.id,
      title: text.text,
    });

    ctx.state.clientRequest = updatedClientRequest;
  }

  console.log("calling toolSelection", ctx.request.params, ctx.request);
  ctx.next.callAgent("/toolSelection");
});

chatManager.agent("/toolSelection", toolSelectionAgent);
chatManager.agent("/toolExecution", toolExecutionAgent);

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
