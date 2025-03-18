import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_API_KEY!,
});
export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    console.log(messages);
    const result = streamText({
      model: google('gemini-2.0-flash-001'),
      system: 'You are a helpful assistant.',
      messages,
    });

    return result.toDataStreamResponse();
  } catch (e) {
    console.log(e);
  }
}
