import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

const voiceId = "56AoDkrOh6qfVPDXZ7Pt";

export async function POST(req: NextRequest) {
  const { text, previous_text, next_text, voice_settings } = await req.json();

  if (!text) {
    return new NextResponse("Missing text", { status: 400 });
  }

  console.log("text", text);
  console.log("previous_text", previous_text);
  console.log("next_text", next_text);

  try {
    const elevenLabsClient = new ElevenLabsClient({
      apiKey: process.env.ELEVENLABS_API_KEY,
    });
    const stream = await elevenLabsClient.textToSpeech.streamWithTimestamps(
      voiceId,
      {
        outputFormat: "mp3_44100_128",
        text,
        previousText: previous_text,
        nextText: next_text,
        voiceSettings: {
          ...(voice_settings?.stability && {
            stability: voice_settings.stability,
          }),
          ...(voice_settings?.similarityBoost && {
            similarityBoost: voice_settings.similarityBoost,
          }),
          ...(voice_settings?.style && { style: voice_settings.style }),
          ...(voice_settings?.useSpeakerBoost && {
            useSpeakerBoost: voice_settings.useSpeakerBoost,
          }),
        },
        modelId: "eleven_multilingual_v2",
      }
    );

    const readableStream = new ReadableStream({
      async start(controller) {
        for await (const chunk of stream) {
          controller.enqueue(Buffer.from(JSON.stringify(chunk) + "<-s->"));
        }
        controller.close();
      },
    });

    return new Response(readableStream, {
      headers: {
        "Content-Type": "application/octet-stream",
      },
    });
  } catch (error) {
    console.error("ElevenLabs API error:", error);
    return new NextResponse("Error from ElevenLabs API", { status: 500 });
  }
}
