import { prisma } from "@/prisma/prisma";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const searchParams = new URL(req.url).searchParams;
    const clientSecretId = searchParams.get("clientSecretId");
    const code = searchParams.get("code");

    const record = await prisma.whatsAppVerification.findMany({
      where: {
        ...(clientSecretId && { clientSecretId }),
        ...(code && { code }),
      },
    });
    if (!record || record.length === 0) {
      return NextResponse.json({ codeExists: false });
    }

    return NextResponse.json({ codeExists: true });
  } catch (error) {
    console.error("Error getting verification:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
