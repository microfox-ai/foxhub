import {
  whatsappConfigFields,
  whatsappRequiredKeys,
} from "@/components/screens/mybots/components/Whatsapp/WhatsAppBotConfig";
import { prisma } from "@/prisma/prisma";
import { ClientSecretVariable } from "@/server/types";
import { WhatsAppVerificationSdk } from "@/utils/services/WhatsAppVerification";
import {
  WhatsAppBusinessSDK,
  WhatsAppWebhookPayload,
} from "@microfox/whatsapp-business";
import { ClientSecret } from "@prisma/client";
import { NextResponse } from "next/server";

// Helper function to forward data to API agent
async function forwardToAiAgent(
  message: any,
  phoneNumber: string,
  endpoint: string,
  apiKey?: string,
  metadata?: any
): Promise<void> {
  await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey || "",
    },
    body: JSON.stringify({
      message: message,
      number: phoneNumber,
      metadata: metadata,
    }),
  });
}

const whatsappVerificationSdk = new WhatsAppVerificationSdk();
function isVerificationMessage(message: string): boolean {
  return message.includes("verification code");
}

export async function GET(
  req: Request,
  segmentData: { params: Promise<{ clientSecretId: string }> }
) {
  try {
    const params = await segmentData.params;
    const { clientSecretId } = params;
    // get the verification token from the client secret
    const clientSecret: ClientSecret | null =
      await prisma.clientSecret.findUnique({
        where: { id: clientSecretId },
      });

    if (!clientSecret) {
      return new NextResponse("Client secret not found", { status: 404 });
    }

    console.log("clientSecret", clientSecret);

    const whatsappVerifyToken = (
      clientSecret.botConfig as unknown as ClientSecretVariable[]
    ).find((config) => config.key === "WHATSAPP_WEBHOOK_VERIFY_TOKEN")?.value;

    console.log("whatsappVerifyToken", whatsappVerifyToken);

    const url = new URL(req.url);
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    // Verify the webhook
    if (mode === "subscribe" && token === whatsappVerifyToken) {
      await prisma.clientSecret.update({
        where: { id: clientSecretId },
        data: {
          botConfig: [
            ...(clientSecret.botConfig
              ? (clientSecret.botConfig as any[])
              : []),
            {
              key: "WHATSAPP_WEBHOOK_VERIFIED",
              value: true,
            },
          ],
        },
      });
      return new NextResponse(challenge, { status: 200 });
    }

    return new NextResponse("Webhook verification failed", { status: 403 });
  } catch (error) {
    console.error("Error in WhatsApp webhook verification:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function POST(
  req: Request,
  segmentData: { params: Promise<{ clientSecretId: string }> }
) {
  try {
    const params = await segmentData.params;
    const { clientSecretId } = params;
    const requestBody = (await req.json()) as WhatsAppWebhookPayload;
    console.log(
      "Incoming webhook: ",
      clientSecretId,
      requestBody.entry?.[0]?.changes?.[0]?.value?.messages?.[0]
    );

    console.log("invalid request body", requestBody);
    return new NextResponse("Invalid request body", { status: 200 });
  } catch (error) {
    console.log("Error in WhatsApp webhook:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
