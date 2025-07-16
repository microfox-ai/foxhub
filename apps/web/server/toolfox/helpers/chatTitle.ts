import { models } from "@/server/models";
import { cleanUiMessageParts } from "@/utils/helpers/array";
import { updateClientRequest } from "@/utils/services/db_functions/updateClientRequest";
import { AiContext, AiMiddleware, getTextParts } from "@microfox/ai-router";
import { generateText } from "ai";

export const slugify = (text: string) => {
  return text
    .toString()
    .toLowerCase()
    .replace(/\s+/g, "-") // Replace spaces with -
    .replace(/[^a-z0-9\\-]+/g, "") // Remove all non-alphanumeric chars except -
    .replace(/--+/g, "-") // Replace multiple - with single -
    .replace(/^-+/, "") // Trim - from start of text
    .replace(/-+$/, ""); // Trim - from end of text
};

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
    ctx.request.messages.length > 0
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

    const slug = slugify(text.text) + "-" + crypto.randomUUID().slice(0, 8);
    const updatedClientRequest = await updateClientRequest({
      clientRequestId: clientRequest.id,
      title: text.text,
      slug: slug,
    });

    ctx.state.clientRequest = updatedClientRequest;
  }
  return next();
};
