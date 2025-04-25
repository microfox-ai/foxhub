import {
  APP_BASE_FOR_SHARD,
  APP_BASE_URL,
  IN_DEV,
} from "@/utils/constants/appInfo";
import { WhatsAppVerification } from "@microfox/whatsapp-verify";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { clientSecretId, code } = await request.json();
    // 1. fetch the verification session
    const whatsappVerification = new WhatsAppVerification({
      baseUrl: APP_BASE_FOR_SHARD,
      authToken: process.env.NEXT_PUBLIC_WIDGETS_PROTECTED_API_KEY,
    });
    console.log("clientSecretId", clientSecretId);

    const verification = await whatsappVerification.getVerificationSession(
      clientSecretId,
      code
    );

    console.log("verification", verification);
    if (
      !verification ||
      verification.length === 0 ||
      verification[0] === undefined
    ) {
      return new NextResponse(
        JSON.stringify({ error: "Verification not found" }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    //2. check if this session is expired
    const isExpired =
      verification[0].createdAt < new Date(Date.now() - 3 * 60 * 1000);

    console.log("isExpired", isExpired);
    if (isExpired) {
      return new NextResponse(
        JSON.stringify({ error: "Verification expired" }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    console.log("verification[0].code", verification[0].code);

    //3. check if code matches
    if (verification[0].code !== code) {
      return new NextResponse(JSON.stringify({ error: "Invalid code" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 4. delete the session
    await whatsappVerification.deleteVerificationSession(verification[0].id);

    // 5. return status 200
    return new NextResponse(
      JSON.stringify({
        success: true,
        data: verification[0],
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    return new NextResponse(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
