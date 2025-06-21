import { ApiGatewayAdapter } from "@/lib/adapters/api-gateway";
import { SendMessageCommand, SQSClient } from "@aws-sdk/client-sqs";
import { WebhookKit, WebhookResponse } from "@microfox/webhook-kit";
import { OctokitWebhook } from "@microfox/webhook-octokit";
import { SlackWebhook } from "@microfox/webhook-slack";
import { NextRequest, NextResponse } from "next/server";

const mapWebhookSecret = {
  slack: process.env.WEBHOOK_SLACK_SIGNING_SECRET ?? "",
  octokit: process.env.WEBHOOK_OCTOKIT_SIGNING_SECRET ?? "",
};
export async function POST(
  req: NextRequest,
  segmentData: { params: Promise<{ providerId: string }> }
) {
  const params = await segmentData.params;
  const { providerId } = params;
  console.log("providerId", providerId);
  const body = await req.json();
  const event = await ApiGatewayAdapter.toApiGatewayEvent(req);
  const webhookKit = new WebhookKit({
    [providerId]: mapWebhookSecret[providerId as keyof typeof mapWebhookSecret],
  });
  const response: WebhookResponse | void = await webhookKit.receive(
    providerId,
    {
      headers: event.headers,
      body: event.body ?? "",
    }
  );

  if (response && response.isTracked) {
    const eventPayload = response.payload;

    console.log("webhookEvent", response.webhookEvent);

    // const sqsClient = new SQSClient({
    //   region: process.env.AGENT_AWS_REGION!,
    //   credentials: {
    //     accessKeyId: process.env.AGENT_AWS_ACCESS_KEY_ID!,
    //     secretAccessKey: process.env.AGENT_AWS_SECRET_ACCESS_KEY!,
    //   },
    // });

    // const command = new SendMessageCommand({
    //   QueueUrl: process.env.AGENT_SQS_QUEUE_URL!,
    //   MessageBody: JSON.stringify(eventPayload),
    // });

    // await sqsClient.send(command);

    return ApiGatewayAdapter.toNextResponse(response);
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
