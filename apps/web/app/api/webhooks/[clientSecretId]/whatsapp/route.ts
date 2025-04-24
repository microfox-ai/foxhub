import { NextResponse } from "next/server";
import { APP_BASE_URL } from "@/utils/constants/appInfo";
import { ClientSecret } from "@prisma/client";
import { ClientSecretVariable } from "@/server/types";
import { PortalSdk } from "@/utils/services/PortalSdk";

// Helper function to forward data to API agent
async function forwardToApiAgent(
  message: any,
  phoneNumber: string,
  endpoint: string
): Promise<void> {
  await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userMessageFromWhatsapp: message,
      userNumberFromWhatsapp: phoneNumber,
    }),
  });
}

function isVerificationMessage(message: string): boolean {
  return message.includes("verification code");
}

function extractVerificationCode(message: string): string | null {
  const match = message.match(/verification code:\s*([a-zA-Z0-9]{6})/i);
  return match && match[1] ? match[1] : null;
}

async function getClientSecret({ clientSecretId }: { clientSecretId: string }) {
  const response = await fetch(
    `${APP_BASE_URL}/api/client-secrets/project-secrets?id=${clientSecretId}`
  );
  const data = await response.json();
  return data[0];
}

export async function GET(
  req: Request,
  segmentData: { params: Promise<{ clientSecretId: string }> }
) {
  try {
    const params = await segmentData.params;
    const { clientSecretId } = params;
    // get the verification token from the client secret
    const clientSecret: ClientSecret = await getClientSecret({
      clientSecretId,
    });

    console.log("clientSecret", clientSecret);

    const whatsappVerifyToken = (
      clientSecret.variables as unknown as ClientSecretVariable[]
    ).find((config) => config.key === "WHATSAPP_WEBHOOK_VERIFY_TOKEN")?.value;

    console.log("whatsappVerifyToken", whatsappVerifyToken);

    const url = new URL(req.url);
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    // Verify the webhook
    if (mode === "subscribe" && token === whatsappVerifyToken) {
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

      console.log("message", message);
      console.log("messageText", messageText);
      console.log("phoneNumber", phoneNumber);

      const clientSecret: ClientSecret = await getClientSecret({
        clientSecretId,
      });

      console.log("clientSecret", clientSecret);

      // 1. if message is verification code, forward to verify route
      if (
        isVerificationMessage(messageText) &&
        extractVerificationCode(messageText)
      ) {
        const code = extractVerificationCode(messageText);
        console.log("code", code);
        if (!code) return;

        // 2. forward the message to the verify route
        const verificationResponse = await PortalSdk.postData(
          `${APP_BASE_URL}/api/webhooks/${clientSecretId}/whatsapp/verify`,
          {
            clientSecretId,
            code,
          }
        );

        console.log("verificationResponse", verificationResponse);

        if (!verificationResponse.success) {
          return new NextResponse("Error", { status: 500 });
        }

        // 3. if it is verified, get the callback uri from the whatsapp verification object

        const { data } = verificationResponse;
        const { callbackUri, userId } = data;

        console.log("callbackUri", callbackUri);
        console.log("userId", userId);

        if (callbackUri) {
          // call the callback uri
          await fetch(callbackUri, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userNumberFromWhatsapp: phoneNumber,
              userIdFromMicrofox: userId,
            }),
          });

          // 4. forward the message to the api agent
          await forwardToApiAgent(message, phoneNumber, callbackUri);
        }
      } else {
        //1. get the endpoint from the client secret
        const endpoint = (
          clientSecret.botConfig as unknown as ClientSecretVariable[]
        ).find((config) => config.key === "WHATSAPP_AGENTCHAT_ENDPOINT")?.value;

        //2. forward the message to the api agent
        await forwardToApiAgent(message, phoneNumber, endpoint);
      }

      return NextResponse.json({ success: true });
    }

    return new NextResponse("Invalid request body", { status: 400 });
  } catch (error) {
    console.error("Error in WhatsApp webhook:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

