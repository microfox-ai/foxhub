import { WhatsAppVerification } from "@microfox/whatsapp-verify";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { clientSecretId, code } = await request.json();
    // 1. fetch the verification session
    const whatsappVerification = new WhatsAppVerification();
    const verification = await whatsappVerification.getVerificationSession(
      clientSecretId,
      code
    );
    if (
      !verification ||
      verification.length === 0 ||
      verification[0] === undefined
    ) {
      return new NextResponse("Verification not found", { status: 404 });
    }

    //2. check if this session is expired
    const isExpired =
      verification[0].createdAt < new Date(Date.now() - 3 * 60 * 1000);
    if (isExpired) {
      return new NextResponse("Verification expired", { status: 404 });
    }

    //3. check if code matches
    if (verification[0].code !== code) {
      return new NextResponse("Invalid code", { status: 400 });
    }

    // 4. delete the session
    await whatsappVerification.deleteVerificationSession(verification[0].id);

    // 5. return status 200
    return new NextResponse(
      JSON.stringify({
        data: verification[0],
      }),
      { status: 200 }
    );
  } catch (error) {
    return new NextResponse("Error", { status: 500 });
  }
}
