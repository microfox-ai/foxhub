import { NextResponse } from "next/server";
import { APP_BASE_URL } from "@/utils/constants/appInfo";
import { ClientSecret } from "@prisma/client";
import { ClientSecretVariable } from "@/server/types";
import { PortalSdk } from "@/utils/services/PortalSdk";
import { WhatsAppVerificationSdk } from "@/utils/services/WhatsAppVerification";
import { prisma } from "@/prisma/prisma";
import { WhatsAppBusinessSDK } from "@microfox/whatsapp-business";
import {
  whatsappConfigFields,
  whatsappRequiredKeys,
} from "@/components/screens/mybots/components/Whatsapp/WhatsAppBotConfig";

// Helper function to forward data to API agent
async function forwardToAiAgent(
  message: any,
  phoneNumber: string,
  endpoint: string,
  apiKey?: string
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
      metadata: {},
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
    const body = await req.json();
    console.log("Incoming webhook: " + JSON.stringify(body));

    // Handle webhook messages from WhatsApp
    if (body.object === "whatsapp_business_account") {
      const message = body.entry[0]?.changes[0]?.value?.messages[0];
      if (!message) {
        return new NextResponse("No message found", { status: 400 });
      }

      const phoneNumber = message.from;
      const messageText = message.text?.body || "";

      const clientSecret: ClientSecret | null =
        await prisma.clientSecret.findUnique({
          where: { id: clientSecretId },
        });

      if (!clientSecret) {
        return new NextResponse("Client secret not found", { status: 404 });
      }
      //1. get the endpoint from the client secret
      const endpoint = (
        clientSecret.botConfig as unknown as ClientSecretVariable[]
      ).find((config) => config.key === "WHATSAPP_AGENTCHAT_ENDPOINT")?.value;

      const apiKey = (
        clientSecret.botConfig as unknown as ClientSecretVariable[]
      ).find((config) => config.key === "WHATSAPP_AGENTCHAT_API_KEY")?.value;

      const businessPhoneNumberId = (
        clientSecret.variables as unknown as ClientSecretVariable[]
      ).find(
        (config) => config.key === whatsappRequiredKeys.businessPhoneNumberId
      )?.value;

      const businessAccountId = (
        clientSecret.variables as unknown as ClientSecretVariable[]
      ).find(
        (config) => config.key === whatsappRequiredKeys.businessAccountId
      )?.value;

      const businessAccessToken = (
        clientSecret.variables as unknown as ClientSecretVariable[]
      ).find(
        (config) => config.key === whatsappRequiredKeys.businessAccessToken
      )?.value;

      const businessName = (
        clientSecret.botConfig as unknown as ClientSecretVariable[]
      ).find(
        (config) => config.key === whatsappConfigFields.whatsappBusinessName
      )?.value;

      const whatsappWebhookVerifyToken = (
        clientSecret.botConfig as unknown as ClientSecretVariable[]
      ).find(
        (config) =>
          config.key === whatsappConfigFields.whatsappWebhookVerifyToken
      )?.value;

      // 1. if message is verification code, forward to verify route
      if (isVerificationMessage(messageText) && whatsappWebhookVerifyToken) {
        console.log("messageText", messageText);
        const { isVerified, record } =
          await whatsappVerificationSdk.processVerification(
            clientSecretId,
            messageText
          );

        console.log("isVerified", isVerified);
        console.log("record", record);

        if (!record || !isVerified) {
          return new NextResponse("Verification record not found", {
            status: 500,
          });
        }

        const { callbackUri, userId } = record;

        console.log("callbackUri", callbackUri);
        console.log("userId", userId);
        if (callbackUri) {
          try {
            // call the callback uri
            await fetch(callbackUri, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "x-api-key": apiKey || "",
              },
              body: JSON.stringify({
                number: phoneNumber,
                userId: userId,
              }),
            });

            const whatsappSdk = new WhatsAppBusinessSDK({
              phoneNumberId: businessPhoneNumberId,
              businessAccountId: businessAccountId,
              accessToken: businessAccessToken,
            });

            await whatsappSdk.sendTextMessage(
              phoneNumber,
              "You are no verified & connected to " + businessName
            );
          } catch (error) {
            return new NextResponse("Error in callbackUri", { status: 500 });
            console.error("Error in callbackUri", error);
          }
        }
        return new NextResponse("Success", { status: 200 });
      } else {
        //2. forward the message to the api agent
        await forwardToAiAgent(message, phoneNumber, endpoint, apiKey);
      }

      return new NextResponse("Success", { status: 200 });
    }

    return new NextResponse("Invalid request body", { status: 400 });
  } catch (error) {
    console.error("Error in WhatsApp webhook:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
