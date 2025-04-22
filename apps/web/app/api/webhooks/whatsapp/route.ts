import { NextResponse } from "next/server";
import { APP_BASE_URL } from "@/utils/constants/appInfo";
// import { WhatsAppVerification } from "@microfox/whatsapp-verify";
// const whatsappVerify = new WhatsAppVerification();

// Helper function to forward data to API agent
async function forwardToApiAgent(data: any, endpoint: string): Promise<void> {
  await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

// Helper function to register phone number
async function registerPhoneNumber(
  endpoint: string,
  userId: string,
  clientSecretId: string,
  phoneNumber: string
): Promise<void> {
  await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, clientSecretId, phoneNumber }),
  });
}

async function getClientSecret({ clientSecretId }: { clientSecretId: string }) {
  const response = await fetch(
    `${APP_BASE_URL}/api/client-secrets/project-secrets?id=${clientSecretId}`
  );
  const data = await response.json();
  return data[0];
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    // Verify the webhook
    if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
      return new NextResponse(challenge, { status: 200 });
    }

    return new NextResponse("Webhook verification failed", { status: 403 });
  } catch (error) {
    console.error("Error in WhatsApp webhook verification:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log("Incoming webhook: " + JSON.stringify(body));
    // const clientSecret = await getClientSecret({
    //   clientSecretId: "1234567890",
    // });

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

      // // Process the message using the WhatsApp verification package
      // const result = await whatsappVerify.processMessage(
      //   messageText,
      //   userId,
      //   phoneNumber,
      //   CLIENT_ID
      // );

      // if (!result.success) {
      //   // Forward invalid verification message to API agent
      //   await forwardToApiAgent({
      //     status: "invalid_code",
      //     message: messageText,
      //     phoneNumber,
      //     clientId: CLIENT_ID,
      //   });
      //   return NextResponse.json({ success: false, error: result.error });
      // }

      // if (result.verification) {
      //   // Register phone number and forward to API agent with verified status
      //   await registerPhoneNumber(userId, CLIENT_ID, phoneNumber);
      //   await forwardToApiAgent({
      //     status: "verified",
      //     phoneNumber,
      //     clientId: CLIENT_ID,
      //     verification: result.verification,
      //   });
      // } else {
      //   // Forward regular message to API agent
      //   await forwardToApiAgent({
      //     status: "message",
      //     message: messageText,
      //     phoneNumber,
      //     clientId: CLIENT_ID,
      //   });
      // }

      return NextResponse.json({ success: true });
    }

    return new NextResponse("Invalid request body", { status: 400 });
  } catch (error) {
    console.error("Error in WhatsApp webhook:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
