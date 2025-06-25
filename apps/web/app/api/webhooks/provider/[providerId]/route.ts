import { ApiGatewayAdapter } from "@/lib/adapters/api-gateway";
import { prisma } from "@/prisma/prisma";
import { ClientSecretVariable } from "@/server/types";
import { SendMessageCommand, SQSClient } from "@aws-sdk/client-sqs";
import { Identity } from "@microfox/oauth-kit";
import { WebhookKit, WebhookResponse } from "@microfox/webhook-kit";
import { OctokitWebhook } from "@microfox/webhook-octokit";
import { SlackWebhook } from "@microfox/webhook-slack";
import { ClientSecret } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import {
  MicrofoxConnection,
  WebhookSqsPayload,
} from "@microfox/webhook-core";

const mapWebhookSecret = {
  slack: {
    secret: process.env.WEBHOOK_SLACK_SIGNING_SECRET ?? "",
    appName: "Microfox",
  },
  octokit: {
    secret: process.env.GITHUB_WEBHOOK_SECRET ?? "",
    appName: "Microfox",
    appMentionId: "microfox-read-only-staging",
  },
};
export async function POST(
  req: NextRequest,
  segmentData: { params: Promise<{ providerId: string }> }
) {
  const params = await segmentData.params;
  const { providerId } = params;
  console.log("providerId", providerId);
  const event = await ApiGatewayAdapter.toApiGatewayEvent(req);
  const webhookKit = new WebhookKit({
    [providerId]: mapWebhookSecret[providerId as keyof typeof mapWebhookSecret],
  });
  const response: WebhookResponse | void = await webhookKit.receive(
    providerId,
    {
      headers: event.headers,
      body: event.body ?? "{}",
    }
  );
  console.log("response-provider", providerId, response);
  if (response && response.isTracked) {
    const eventPayload = response.payload;

    console.log("webhookEvent", response.webhookEvent);

    const clientSecrets = await prisma.clientSecret.findMany({
      where: {
        AND: [
          {
            packageName: {
              contains: providerId,
              mode: "insensitive",
            },
          },
        ],
        OR: [
          {
            identityUserId: response.webhookEvent?.sender?.id,
          },
          {
            identityOrgId: response.webhookEvent?.provider_info?.org?.id,
          },
          {
            identityTeamId: response.webhookEvent?.provider_info?.team?.id,
          },
        ],
      },
    });

    const microfoxConnections: MicrofoxConnection[] = [];

    const uniqueBotProjects = [
      ...new Set(
        clientSecrets.map((clientSecret) => clientSecret.botProjectId)
      ),
    ];

    for (const botProjectId of uniqueBotProjects) {
      const _linkedSecrets = clientSecrets.filter(
        (clientSecret) => clientSecret.botProjectId === botProjectId
      );
      const _users = clientSecrets
        .filter((clientSecret) => clientSecret.botProjectId === botProjectId)
        .map((clientSecret) => ({
          microfox_user_id: clientSecret.userId,
          provider: providerId,
          [providerId + "_metadata"]: (
            clientSecret.identityMetadata as Identity
          )?.userInfo,
        }));

      microfoxConnections.push({
        microfox_bot_id: botProjectId,
        related_users: _users,
        related_secrets: _linkedSecrets,
      });
    }

    let reactAccess = {
      access_token: "",
    };

    const accessClientSecret =
      clientSecrets.find(
        (clientSecret) =>
          clientSecret.identityTeamId ===
          response.webhookEvent?.provider_info?.team?.id
      ) ||
      clientSecrets.find(
        (clientSecret) =>
          clientSecret.identityOrgId ===
          response.webhookEvent?.provider_info?.org?.id
      ) ||
      clientSecrets.find(
        (clientSecret) =>
          clientSecret.identityUserId === response.webhookEvent?.sender?.id
      );
    if (accessClientSecret) {
      reactAccess.access_token = (
        accessClientSecret.variables as unknown as ClientSecretVariable[]
      ).filter((variable) => variable.key.includes("ACCESS_TOKEN"))?.[0]?.value;
    }

    const uniqueUsers = [
      ...new Set(clientSecrets.map((clientSecret) => clientSecret?.userId)),
    ];

    const sqsClient = new SQSClient({
      region: process.env.AGENT_AWS_REGION!,
      credentials: {
        accessKeyId: process.env.AGENT_AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AGENT_AWS_SECRET_ACCESS_KEY!,
      },
    });

    const payload: WebhookSqsPayload = {
      task_type: "direct",
      channel: response.webhookEvent?.channel?.id,
      webhook_event: response.webhookEvent,
      microfox_connections: microfoxConnections,
      react_access: reactAccess,
    };

    const command = new SendMessageCommand({
      QueueUrl: process.env.AGENT_SQS_QUEUE_URL!,
      MessageBody: JSON.stringify(payload),
    });

    await sqsClient.send(command);

    return ApiGatewayAdapter.toNextResponse(response);
  } else if (response && "statusCode" in response) {
    return ApiGatewayAdapter.toNextResponse(response);
  } else {
    return NextResponse.json({ ok: true }, { status: 200 });
  }
}
