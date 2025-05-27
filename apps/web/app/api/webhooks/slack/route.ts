import { NextRequest, NextResponse } from "next/server";
import { APIGatewayProxyResult } from "aws-lambda";
import { ApiGatewayAdapter } from "@/lib/adapters/api-gateway";
import { SlackWebhookSdk } from "@microfox/webhook-slack";

export async function POST(req: NextRequest) {
  //const body = await req.json();
  const slackWebhookSdk = new SlackWebhookSdk(
    process.env.SLACK_SIGNING_SECRET ?? ""
  );
  const event = ApiGatewayAdapter.toApiGatewayEvent(req);
  if (!event.body) {
    return NextResponse.json({ error: "No body" }, { status: 400 });
  }
  const response = await slackWebhookSdk.verifyAndParseRequest(
    event.body,
    event.headers
  );
  const payload = response.payload;
  return ApiGatewayAdapter.toNextResponse(response.response);
}
