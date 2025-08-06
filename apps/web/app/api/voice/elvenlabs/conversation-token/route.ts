import { NextResponse } from "next/server";

export async function GET() {
  const agentId = process.env.ELEVENLABS_AGENT_ID;
  if (!agentId) {
    return NextResponse.json(
      { error: "ELEVENLABS_AGENT_ID is not configured" },
      { status: 500 }
    );
  }

  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/token?agent_id=${agentId}`,
      {
        method: "GET",
        headers: {
          "xi-api-key": process.env.ELEVENLABS_API_KEY!,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.json();
      console.error("Failed to get conversation token:", errorText);
      return NextResponse.json(
        { error: `Failed to get conversation token: ${errorText}` },
        { status: response.status }
      );
    }

    const body = await response.json();
    return NextResponse.json({ token: body.token });
  } catch (error) {
    console.error("Error fetching conversation token:", error);
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(
      { error: "An unknown error occurred" },
      { status: 500 }
    );
  }
}
