import { NextRequest, NextResponse } from "next/server";
import { APIGatewayProxyResult } from "aws-lambda";
import { ApiGatewayAdapter } from "@/lib/adapters/api-gateway";
import { SlackWebhookSdk } from "@microfox/webhook-slack";

export async function POST(req: NextRequest) {
  //const body = await req.json();
  const slackWebhookSdk = new SlackWebhookSdk(
    process.env.SLACK_SIGNING_SECRET ?? ""
  );
  const event = await ApiGatewayAdapter.toApiGatewayEvent(req);
  if (!event.body) {
    return NextResponse.json({ error: "No body" }, { status: 400 });
  }

  console.log("slack_signing_secret", process.env.SLACK_SIGNING_SECRET);

  console.log("event_body", event.body);
  console.log("event_headers", event.headers);
  try {
    const verification = slackWebhookSdk.verifySignature(event.body, {
      "x-slack-signature": event.headers["x-slack-signature"] ?? "",
      "x-slack-request-timestamp": Number(
        event.headers["x-slack-request-timestamp"] ?? "0"
      ),
    });
    console.log("verification", verification);
  } catch (err) {
    console.log(err);
  }
  const response = await slackWebhookSdk.verifyAndParseRequest(
    event.body,
    event.headers
  );
  const payload = response.payload;
  return ApiGatewayAdapter.toNextResponse(response.response);
}
