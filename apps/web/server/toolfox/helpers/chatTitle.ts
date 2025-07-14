import { models } from "@/server/models";
import { cleanUiMessageParts } from "@/utils/helpers/array";
import { updateClientRequest } from "@/utils/services/db_functions/updateClientRequest";
import { AiContext, AiMiddleware, getTextParts } from "@microfox/ai-router";
import { generateText } from "ai";

export const generateChatTitle: AiMiddleware<any, any, any, any> = async (
  ctx,
  next
) => {
  const clientRequest = ctx.state.clientRequest;
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
  return next();
};
