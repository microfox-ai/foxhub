import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const elevenlabsApiKey = process.env.ELEVENLABS_API_KEY;

    if (!elevenlabsApiKey) {
      return NextResponse.json(
        { error: "ELEVENLABS_API_KEY is not set in environment variables." },
        { status: 500 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json(
        {
          error:
            "File not found in form data. Make sure to use the 'file' key.",
        },
        { status: 400 }
      );
    }

    const elevenlabs = new ElevenLabsClient({
      apiKey: elevenlabsApiKey,
    });

    const transcription = await elevenlabs.speechToText.convert({
      file: file,
      modelId: "scribe_v1",
      tagAudioEvents: true,
      languageCode: "eng",
      diarize: true,
    });

    return NextResponse.json(transcription);
  } catch (error: any) {
    console.error("Error in ElevenLabs STT:", error);
    return NextResponse.json(
      { error: error.message || "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
