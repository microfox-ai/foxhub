import { GoogleGenerativeAI } from "@google/generative-ai";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

export const GenAiSdk = {
  generateWorklogSummary: async (
    heading: string,
    name: string | null | undefined,
    data: any
  ) => {
    const prompt = `
      Keep the title exactly this: ${heading}.
      The following are my work logs.
      ${JSON.stringify(data)}
      Now, help me write a detailed summary of all the work I did in third prespective.
      My name is ${name}. Also, include some stats and departments involved,
      projects involved and short bullet points of my key achievements. 
      Do not provide area of improvements and only use my first name not full name.`;
    try {
      const result = await model.generateContent(prompt);
      const response = result.response;
      const text = response.text();
      return text;
    } catch (e: any) {
      console.error(e);
      return e.message;
    }
  },
  generateAISummary: async (data: any) => {
    const prompt = `
      Summarize the key points from our teams work logs from yesterday.
      ${JSON.stringify(data)}
      
      Provide a **single concise passage** (no bullet points).
    `;

    try {
      const result = await model.generateContent(prompt);
      const text = result.response.text().trim();

      return text || "No significant updates.";
    } catch (e: any) {
      console.error("AI Summary Generation Error:", e);
      return "Summary unavailable.";
    }
  },
  generateShortTitle: async (data: any) => {
    const prompt = `
    Generate a single short title/preview string for ${JSON.stringify(data)}.
    use alphabetical characters, numbers and hyphens only if needed and keep it under 60 characters.
    `;

    try {
      const result = await model.generateContent(prompt);
      const text = result.response.text().trim();

      return text || "No significant updates.";
    } catch (e: any) {
      console.error("AI title Generation Error:", e);
      return null;
    }
  },
};
