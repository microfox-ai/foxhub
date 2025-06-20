import { ApiGatewayAdapter } from "@/lib/adapters/api-gateway";
import { WebhookKit, WebhookResponse } from "@microfox/webhook-kit";
import { SlackWebhook } from "@microfox/webhook-slack";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  //const body = await req.json();
  const slackWebhookSdk = new SlackWebhook({
    secret: process.env.SLACK_SIGNING_SECRET ?? "",
    botToken: process.env.SLACK_BOT_TOKEN ?? "",
  });
  const event = await ApiGatewayAdapter.toApiGatewayEvent(req);
  if (!event.body) {
    return NextResponse.json({ error: "No body" }, { status: 400 });
  }
  const webhookKit = new WebhookKit();
  webhookKit.addWebhook("slack", slackWebhookSdk);
  const response: WebhookResponse | void = await webhookKit.receive("slack", {
    headers: event.headers,
    body: event.body,
  });
  console.log("response", response);
  if (response && "statusCode" in response) {
    return ApiGatewayAdapter.toNextResponse(response);
  } else {
    return NextResponse.json({ error: "No response" }, { status: 500 });
  }
}
