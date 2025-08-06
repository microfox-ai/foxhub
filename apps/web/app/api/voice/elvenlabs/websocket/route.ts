import { WebSocketServer, WebSocket } from "ws";
import { NextRequest } from "next/server";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import { generateText } from "ai";
import { models } from "../../../../../server/models";

const elevenlabs = new ElevenLabsClient({
  apiKey: process.env.ELEVENLABS_API_KEY,
});

const wss = new WebSocketServer({ noServer: true });

wss.on("connection", (ws: WebSocket) => {
  console.log("Client connected");

  ws.on("message", async (message: Buffer) => {
    try {
      // 1. Speech-to-Text
      const textStream = await elevenlabs.speechToText.convert({
        file: message,
        modelId: "scribe_v1",
        tagAudioEvents: true,
        languageCode: "eng",
        diarize: true,
      });

      let transcribedText = "";
      for await (const text of textStream) {
        if (text.type === "transcription") {
          transcribedText += text.transcription.text;
        }
      }

      console.log(`Transcribed text: ${transcribedText}`);

      // 2. Generate Text Response
      const result = await generateText({
        model: models.claude35Sonnet,
        prompt: transcribedText,
      });

      console.log(`Generated response: ${result.text}`);

      // 3. Text-to-Speech
      const audioStream = await elevenlabs.textToSpeech.convert({
        text: result.text,
        model_id: "eleven_multilingual_v2",
        voice_id: "21m00Tcm4TlvDq8ikWAM",
      });

      for await (const chunk of audioStream) {
        ws.send(chunk);
      }
    } catch (error) {
      console.error("Error processing audio:", error);
      ws.send(JSON.stringify({ error: "Error processing audio" }));
    }
  });

  ws.on("close", () => {
    console.log("Client disconnected");
  });
});

export function GET(req: NextRequest) {
  const server = (req as any).socket.server;
  if (!server.listeners("upgrade").length) {
    server.on("upgrade", (request: any, socket: any, head: any) => {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, request);
      });
    });
  }
  // This is a placeholder response.
  // The actual WebSocket connection is handled by the upgrade event.
  return new Response(null, { status: 200 });
}
