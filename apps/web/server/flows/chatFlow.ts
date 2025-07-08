import { MinionFlow } from "@/components/screens/hooks/convertors";
import { prisma } from "@/prisma/prisma";
import { cleanUiMessageParts } from "@/utils/helpers/array";
import { updateClientRequest } from "@/utils/services/db_functions/updateClientRequest";
import { AiRouter, getTextParts } from "@microfox/ai-router";
import { convertToModelMessages, generateText, streamText } from "ai";
import {
  getMicrofoxCharacter,
  getMicrofoxPersonality,
} from "../hellofox/_prompts";
import { DefaultMessageMetadata } from "../microfoxRouter";
import { models } from "../models";
import { toolExecutionAgent } from "../toolfox/toolExecution";
import { toolSelectionAgent } from "../toolfox/toolSelection";
import { TokenUsageAnalyticsTracker } from "../analytics/helper";

const chatManager = new AiRouter<any, any, any, any>();

chatManager.use("/", async (ctx, next) => {
  const { response } = ctx;
  response.writeMessageMetadata({
    minionFlow: MinionFlow.ChatFlow,
  });
  response.writeMessageMetadata({
    toolMode: ctx.request.toolMode || "fast",
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
    (!clientRequest?.title ||
      clientRequest?.title?.trim()?.length === 0 ||
      clientRequest?.title === "Untitled") &&
    ctx.request.messages.length > 3
  ) {
    console.log("generating title", clientRequest);
    const cleanedMessages = cleanUiMessageParts(ctx.request.messages, {
      removeToolCalls: true,
    });
    const textParts = cleanedMessages.map(getTextParts).flat().join("\n");

    const text = await generateText({
      model: models.claudeHaiku,
      system: `
        You are a helpful assistant that can generate a title for a chat session.
        Generate a 2-5 word title for the chat session.
        Only output the title, no other text.
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

  if (ctx.request.toolMode == "fast") {
    console.log("calling toolSelection", ctx.request.toolMode);
    await ctx.next.callAgent("/toolSelection");
    return;
  }

  console.log("calling toolSelection", ctx.request.params, ctx.request);
  const result = streamText({
    model: models.googleGeminiPro,
    system: `
      ${getMicrofoxCharacter()}
      ${getMicrofoxPersonality()}
      Converse with the user before calling any tools, 
      
      if user is asking to perform a task, tell the user you are looking for the best possible platforms/agents to perform the task
      call the toolSelection tool. If the toolSelection tool is triggered, do not respond to anythign else.

      if the user is not asking for a task, just conversing, and you believe there is no need for any extra tools,
      just respond back normally in text.
    `,
    // stopWhen: (step) => {
    //   const lastStep = step.steps[step.steps.length - 1];
    //   const lastToolResult =
    //     lastStep?.toolResults && lastStep?.toolResults?.length > 0
    //       ? lastStep?.toolResults[0]
    //       : null;
    //   if (lastToolResult?.toolName === "toolSelection") {
    //     return true;
    //   }
    //   return false;
    // },
    tools: {
      toolSelection: ctx.next.agentAsTool("/toolSelection"),
    },
    //toolChoice: "auto",
    messages: convertToModelMessages(
      cleanUiMessageParts(ctx.request.messages, {
        removeToolCalls: true,
      })
    ),
    onStepFinish: (step) => {
      console.log("step", step);
    },
    onFinish: (step) => {
      console.log("FULL USAGE", step.usage);
      TokenUsageAnalyticsTracker.trackUsage({
        clientRequestId: ctx.request.clientRequestId,
        model: models.googleGeminiPro.modelId,
        userId: ctx.request.userId,
        usage: step.usage,
      });
    },
  });

  ctx.response.merge(result.toUIMessageStream());

  const out = await result.text;

  //console.log("calling toolSelection", ctx.request.params, ctx.request);
  //ctx.next.callAgent("/toolSelection");
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
