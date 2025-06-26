import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createAnthropic } from "@ai-sdk/anthropic";

const google = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY!,
});

const anthrophobic = createAnthropic({
  apiKey: process.env.CLAUDE_API_KEY!,
});

export const models: Record<
  | "default"
  | "googleGeminiFlash"
  | "googleGeminiPro"
  | "googleGeminiTwoFive"
  | "claudeDefault"
  | "claude35Sonnet"
  | "claude4Sonnet"
  | "claudeHaiku",
  {
    modelId: string;
  } & any
> = {
  default: anthrophobic("claude-3-haiku-20240307"),
  googleGeminiFlash: google("gemini-1.5-flash"),
  googleGeminiPro: google("gemini-1.5-pro"),
  googleGeminiTwoFive: google("gemini-2.5-pro-preview-05-06"),
  claudeDefault: anthrophobic("claude-4-sonnet-20250514"),
  claude35Sonnet: anthrophobic("claude-3-5-sonnet-20240620"),
  claude4Sonnet: anthrophobic("claude-4-sonnet-20250514"),
  claudeHaiku: anthrophobic("claude-3-haiku-20240307"),
};
