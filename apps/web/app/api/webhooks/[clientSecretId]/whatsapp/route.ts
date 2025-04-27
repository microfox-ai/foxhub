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
  try {
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
  } catch (error) {
    console.log("Error in forwardToAiAgent", error);
  }
}

const whatsappVerificationSdk = new WhatsAppVerificationSdk();
function isVerificationMessage(message: string): boolean {
  return message.includes("verification code");
}

const whatsappRequiredKeys = {
  businessAccountId: "WHATSAPP_BUSINESS_ACCOUNT_ID",
  businessAccessToken: "WHATSAPP_BUSINESS_ACCESS_TOKEN",
  businessPhoneNumberId: "WHATSAPP_BUSINESS_PHONE_NUMBER_ID",
  businessPhoneNumber: "WHATSAPP_BUSINESS_PHONE_NUMBER",
};

const whatsappConfigFields = {
  whatsappWebhookUrl: "WHATSAPP_WEBHOOK_URL",
  whatsappWebhookVerifyToken: "WHATSAPP_WEBHOOK_VERIFY_TOKEN",
  whatsappBusinessName: "WHATSAPP_BUSINESS_NAME",
  whatsappIconUrl: "WHATSAPP_ICON_URL",
  whatsappBusinessSlug: "WHATSAPP_BUSINESS_SLUG",
  whatsappAgentchatApiKey: "WHATSAPP_AGENTCHAT_API_KEY",
  whatsappAgentchatEndpoint: "WHATSAPP_AGENTCHAT_ENDPOINT",
  whatsappWebhookVerified: "WHATSAPP_WEBHOOK_VERIFIED",
};

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

    // Handle webhook messages from WhatsApp
    if (requestBody?.object != "whatsapp_business_account") {
      console.log("invalid request body", requestBody);
      return new NextResponse("Invalid request body", { status: 200 });
    }
    const message = requestBody?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
    if (!message) {
      console.log("No message found");
      return new NextResponse("No message found", { status: 200 });
    }

    const phoneNumber = message.from;

    const clientSecret: ClientSecret | null =
      await prisma.clientSecret.findUnique({
        where: { id: clientSecretId },
      });

    if (!clientSecret) {
      console.log("Client secret not found");
      return new NextResponse("Client secret not found", { status: 200 });
    }
    //1. get the endpoint from the client secret
    const endpoint = (clientSecret.botConfig as any[]).find(
      (config) => config.key === whatsappConfigFields.whatsappAgentchatEndpoint
    )?.value;

    const apiKey = (clientSecret.botConfig as any[]).find(
      (config) => config.key === whatsappConfigFields.whatsappAgentchatApiKey
    )?.value;

    const businessPhoneNumberId = (clientSecret.variables as any[]).find(
      (config) => config.key === whatsappRequiredKeys.businessPhoneNumberId
    )?.value;

    const businessAccountId = (clientSecret.variables as any[]).find(
      (config) => config.key === whatsappRequiredKeys.businessAccountId
    )?.value;

    const businessAccessToken = (clientSecret.variables as any[]).find(
      (config) => config.key === whatsappRequiredKeys.businessAccessToken
    )?.value;

    const businessName = (clientSecret.botConfig as any[]).find(
      (config) => config.key === whatsappConfigFields.whatsappBusinessName
    )?.value;

    const whatsappWebhookUrl = (clientSecret.botConfig as any[]).find(
      (config) => config.key === whatsappConfigFields.whatsappWebhookUrl
    )?.value;

    if (!businessPhoneNumberId || !businessAccountId || !businessAccessToken) {
      console.log(
        "Business phone number id, account id or access token not found",
        businessPhoneNumberId,
        businessAccountId,
        businessAccessToken
      );
      return new NextResponse(
        "Business phone number id, account id or access token not found",
        {
          status: 200,
        }
      );
    }

    const whatsappSdk = new WhatsAppBusinessSDK({
      phoneNumberId: businessPhoneNumberId,
      businessAccountId: businessAccountId,
      accessToken: businessAccessToken,
    });

    const messageText = message?.type === "text" ? message?.text?.body : "";
    //1. if message is verification code, forward to verify route
    if (isVerificationMessage(messageText) && whatsappWebhookUrl) {
      console.log("messageText", messageText);
      const { isVerified, record } =
        await whatsappVerificationSdk.processVerification(
          clientSecretId,
          messageText
        );

      if (!record || !isVerified) {
        // await whatsappSdk.sendTextMessage(
        //   phoneNumber,
        //   "OTP timed out. Please try again."
        // );
        return new NextResponse("Verification record not found", {
          status: 200,
        });
      }

      const { callbackUri, userId } = record;

      console.log("callbackUri", callbackUri, userId);

      if (callbackUri) {
        try {
          // call the callback uri
          const response = await fetch(callbackUri, {
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
          if (response.status === 200) {
            await whatsappVerificationSdk.deleteVerificationSession(record.id);
            await whatsappSdk.markMessageAsRead(message.id);
            return new NextResponse("Success", { status: 200 });
          } else {
            await whatsappSdk.markMessageAsRead(message.id);
            await whatsappSdk.sendTextMessage(
              phoneNumber,
              "Error in Agent Callback URI - " + response.statusText
            );
            return new NextResponse("Error in callbackUri", { status: 200 });
          }
        } catch (error) {
          console.log("error in callbackUri", error);
          await whatsappSdk.markMessageAsRead(message.id);
          await whatsappSdk.sendTextMessage(
            phoneNumber,
            "Error in Agent Callback URI - " + error
          );
          return new NextResponse("Error in callbackUri", { status: 200 });
        }
      } else {
        await whatsappSdk.markMessageAsRead(message.id);
        await whatsappSdk.sendTextMessage(
          phoneNumber,
          "No Callback URI found for this bot"
        );
        return new NextResponse("Success", { status: 200 });
      }
    } else if (endpoint) {
      console.log("forwarding to api agent");
      await whatsappSdk.markMessageAsRead(message.id);
      //2. forward the message to the api agent
      await forwardToAiAgent(
        message,
        phoneNumber,
        endpoint,
        apiKey,
        requestBody
      );
      // await whatsappSdk.sendTextMessage(
      //   phoneNumber,
      //   "Message forwarded to agent"
      // );
      return new NextResponse("Success", { status: 200 });
    } else {
      await whatsappSdk.markMessageAsRead(message.id);
      await whatsappSdk.sendTextMessage(
        phoneNumber,
        "No endpoint found for this bot"
      );
      return new NextResponse("Success", { status: 200 });
    }
  } catch (error) {
    console.log("Error in Microfox WhatsApp webhook:", error);
    return new NextResponse("Internal Server Error", { status: 200 });
  }
}
