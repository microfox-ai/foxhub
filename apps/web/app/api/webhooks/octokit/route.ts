import { ApiGatewayAdapter } from "@/lib/adapters/api-gateway";
import { OctokitWebhook } from "@microfox/webhook-octokit";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  //const body = await req.json();
  const octokitWebhook = new OctokitWebhook({
    secret: process.env.GITHUB_WEBHOOK_SECRET ?? "",
  });
  const event = await ApiGatewayAdapter.toApiGatewayEvent(req);
  if (!event.body) {
    return NextResponse.json({ error: "No body" }, { status: 400 });
  }
  octokitWebhook.onAny((event) => {
    console.log("event", event.name);
  });
  const response = await octokitWebhook.verifyAndReceive(
    event.body,
    event.headers
  );
  //console.log("payload", payload.event.type, "team_id", payload.team_id);
  // get botToken from db based on team_id.
  console.log("response", response);
  return NextResponse.json({ message: "Webhook received" }, { status: 200 });
}
