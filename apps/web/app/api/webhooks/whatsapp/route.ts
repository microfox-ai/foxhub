import {
    WhatsAppBusinessSDK,
    WhatsAppWebhookPayload,
} from "@microfox/whatsapp-business";
import { WhatsappOAuthSdk } from "@microfox/whatsapp-oauth";
import { NextResponse } from "next/server";

const whatsappOAuthSdk = new WhatsappOAuthSdk({
    apiBaseUrl: process.env.WHATSAPP_WIDGET_API_BASE_URL,
    upstashRedisRestUrl: process.env.WHATSAPP_REDIS_URL,
    upstashRedisRestToken: process.env.WHATSAPP_REDIS_TOKEN,
});

function isVerificationMessage(message: string): boolean {
    return message.includes("verification code");
}

const whatsappKeys = {
    businessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID,
    businessAccessToken: process.env.WHATSAPP_BUSINESS_ACCESS_TOKEN,
    businessPhoneNumber: process.env.WHATSAPP_BUSINESS_PHONE_NUMBER,
    businessPhoneNumberId: process.env.WHATSAPP_BUSINESS_PHONE_NUMBER_ID,
    whatsappWebhookVerifyToken: process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN,
};

export async function GET(
    req: Request,
) {
    try {
        const whatsappVerifyToken = whatsappKeys.whatsappWebhookVerifyToken;
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
) {
    try {
        const requestBody = (await req.json()) as WhatsAppWebhookPayload;
        console.log(
            "Incoming webhook: ",
            requestBody.entry?.[0]?.changes?.[0]?.value?.messages?.[0]
        );

        // Handle webhook messages from WhatsApp
        if (requestBody?.object !== "whatsapp_business_account") {
            console.log("invalid request body", requestBody);
            return new NextResponse("Invalid request body", { status: 200 });
        }
        const whatsappUserProfile = requestBody?.entry?.[0]?.changes?.[0]?.value;
        const message = whatsappUserProfile?.messages?.[0];
        if (!message) {
            console.log("No message found");
            return new NextResponse("No message found", { status: 200 });
        }

        const userPhoneNumber = message.from;

        const businessPhoneNumberId = whatsappKeys.businessPhoneNumberId;
        const businessAccountId = whatsappKeys.businessAccountId;
        const businessAccessToken = whatsappKeys.businessAccessToken;

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
            version: "v22.0",
        });
        const messageText = message?.type === "text" ? message?.text?.body : "";
        //1. if message is verification code, forward to verify route
        if (isVerificationMessage(messageText)) {
            console.log("messageText", messageText);
            const { isVerified, record } =
                await whatsappOAuthSdk.processVerification(
                    messageText
                );

            if (!record || !isVerified) {
                // await whatsappSdk.sendTextMessage(
                //     userPhoneNumber,
                //     "OTP timed out. Please try again."
                // );
                return new NextResponse("Verification record not found", {
                    status: 200,
                });
            } else if (isVerified) {
                await whatsappOAuthSdk.updatePhoneNumber(record.id, userPhoneNumber)
                await whatsappOAuthSdk.addOrUpdateMetadata(record.id, {
                    phoneNumber: userPhoneNumber,
                    userProfile: whatsappUserProfile,
                });
                await whatsappSdk.markMessageAsRead(message.id);
                await whatsappSdk.sendTextMessage(
                    userPhoneNumber,
                    "OTP verified. You can now use the bot."
                );
            }
        } else {
            await whatsappSdk.markMessageAsRead(message.id);
            // await whatsappSdk.sendTextMessage(
            //     userPhoneNumber,
            //     "No endpoint found for this bot"
            // );
            return new NextResponse("Success", { status: 200 });
        }
    } catch (error) {
        console.log("Error in Microfox WhatsApp webhook:", error);
        return new NextResponse("Internal Server Error", { status: 200 });
    }
}
