import {
  streamText,
  createUIMessageStream,
  JsonToSseTransformStream,
  generateId,
  createUIMessageStreamResponse,
  UI_MESSAGE_STREAM_HEADERS,
} from "ai";
import { openai } from "@ai-sdk/openai";
import { AiAgentKit } from "./router.js";

// export async function POST(req: Request) {
//   const streamContext = createResumableStreamContext({
//     waitUntil: after,
//   });

//   const streamId = generateId();

//   const stream1 = createUIMessageStream({
//     originalMessages: [],
//     execute: async ({ writer }) => {
//       const result = streamText({
//         system: "You are a helpful assistant",
//         prompt: "Hello, world!",
//         model: openai("gpt-4o"),
//       });

//       writer.merge(result.toUIMessageStream());

//       writer.write({
//         type: "text",
//         text: "Hello, world!",
//       });
//     },
//   });

//   return createUIMessageStreamResponse({
//     stream: stream1,
//   });
//}

export async function POST2(req: Request) {
  const aiAgentKit = new AiAgentKit();

  aiAgentKit.use("/", async (ctx, next) => {
    ctx.writer.write({
      type: "text",
      text: "Hello, world!",
    });
  });

  aiAgentKit.agent("/", async (ctx) => {
    ctx.writer.write({
      type: "text",
      text: "Hello, world!",
    });
  });

  return aiAgentKit.handle("/", {
    request: {
      messages: [],
    },
  });
}
