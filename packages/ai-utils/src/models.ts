import { createGoogleGenerativeAI } from "@ai-sdk/google";

const google = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY!,
});

export const models = {
  googleGeminiFlash: google("gemini-1.5-pro", {
    structuredOutputs: true,
  }),
  googleGeminiPro: google("gemini-1.5-pro", {
    structuredOutputs: true,
  }),
};
