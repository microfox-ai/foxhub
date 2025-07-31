import { NextResponse } from "next/server";
import { prisma } from "@/prisma/prisma";
import { WhatsAppVerification } from "@prisma/client";
import { WhatsappOAuthSdk } from "@microfox/whatsapp-oauth";

/** CRUD FOR whatsAppVerification documents */
// TODO: Requires security layer (incoming requests should eithe be origined to us, or we should add auth headers)
// check/authenticate for bearer token with NEXT_PUBLIC_WIDGETS_PROTECTED_API_KEY

export async function POST(req: Request) {
  try {
    const { clientSecretId, code } =
      await req.json();

    if (!clientSecretId || !code) {
      return new NextResponse(
        "Client Secret ID and Code are required",
        {
          status: 400,
        }
      );
    }
    const clientSecret = await prisma.clientSecret.findUnique({
      where: {
        id: clientSecretId,
      },
    })
    if (!clientSecret) {
      return new NextResponse("Client Secret not found", { status: 404 });
    }

    const whatsappOAuthSdk = new WhatsappOAuthSdk({
      apiBaseUrl: process.env.WHATSAPP_APP_BASE_URL,
      upstashRedisRestUrl: process.env.WHATSAPP_REDIS_URL,
      upstashRedisRestToken: process.env.WHATSAPP_REDIS_TOKEN,
    })

    const existingVerification = await whatsappOAuthSdk.getVerification(code);

    if (existingVerification) {
      console.log("Code Already Exists, Please Try Again");
      throw new Error("Code Already Exists, Please Try Again");
    }

    const record = await whatsappOAuthSdk.createVerification({
      clientSecretId,
      code,
      userId: clientSecret.userId,
      slug: "microfox",
    });

    return NextResponse.json(record);
  } catch (error) {
    console.error("Error creating verification:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url!);
    const code = searchParams.get("code");
    if (!code) {
      return new NextResponse("Code is required", { status: 400 });
    }
    const whatsappOAuthSdk = new WhatsappOAuthSdk({
      apiBaseUrl: process.env.WHATSAPP_APP_BASE_URL,
      upstashRedisRestUrl: process.env.WHATSAPP_REDIS_URL,
      upstashRedisRestToken: process.env.WHATSAPP_REDIS_TOKEN,
    });
    const existingVerification = await whatsappOAuthSdk.getVerification(code);
    if (!existingVerification) {
      return new NextResponse("Verification not found", { status: 404 });
    }
    return NextResponse.json({ verified: !!existingVerification.verified });
  } catch (error) {
    console.error("Error checking verification:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
