import { SlackWebhookSdk } from "@microfox/webhook-slack";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log("body", body);
    const slackWebhook = new SlackWebhookSdk(
      process.env.SLACK_SIGNING_SECRET!,
      process.env.SLACK_WEBHOOK_URL!,
      "nextjs"
    );

    // Create a response object that mimics NextApiResponse
    const res = {
      status: (code: number) => ({
        json: (data: any) => NextResponse.json(data, { status: code }),
        end: () => new NextResponse(null, { status: code }),
      }),
    };

    //await slackWebhook.handleNextJs(reqAdapter, res);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("error", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
