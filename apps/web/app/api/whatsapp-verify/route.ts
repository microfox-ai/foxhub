import { NextResponse } from "next/server";
import { prisma } from "@/prisma/prisma";

/** CRUD FOR whatsAppVerification documents */
// TODO: Requires security layer (incoming requests should eithe be origined to us, or we should add auth headers)
// check/authenticate for bearer token with NEXT_PUBLIC_WIDGETS_PROTECTED_API_KEY

export async function POST(req: Request) {
  try {
    const { clientSecretId, userId, slug, code, callbackUri } =
      await req.json();

    if (!clientSecretId || !userId || !slug || !code || !callbackUri) {
      return new NextResponse(
        "Client Secret ID, User ID, Slug, Code and Callback URI are required",
        {
          status: 400,
        }
      );
    }

    const codeExists = await prisma.whatsAppVerification.findFirst({
      where: {
        code,
        clientSecretId,
        userId,
      },
    });

    if (codeExists) {
      return new NextResponse("Code already exists", { status: 400 });
    }

    const record = await prisma.whatsAppVerification.create({
      data: {
        clientSecretId,
        userId,
        slug,
        code,
        callbackUri,
      },
    });

    console.log("record", record);

    return NextResponse.json(record);
  } catch (error) {
    console.error("Error creating verification:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const { clientSecretId, phoneNumber, code, id } = await req.json();
    if (!clientSecretId || !phoneNumber || !code || !id) {
      return new NextResponse(
        "Client Secret ID, phone number and code are required",
        {
          status: 400,
        }
      );
    }

    const record = await prisma.whatsAppVerification.update({
      where: {
        id,
        clientSecretId,
        code,
      },
      data: {
        phoneNumber,
      },
    });

    return NextResponse.json(record);
  } catch (error) {
    console.error("Error updating verification:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const searchParams = new URL(req.url).searchParams;
    const clientSecretId = searchParams.get("clientSecretId");
    const code = searchParams.get("code");
    const userId = searchParams.get("userId");

    const record = await prisma.whatsAppVerification.findMany({
      where: {
        ...(clientSecretId && { clientSecretId }),
        ...(code && { code }),
        ...(userId && { userId }),
      },
    });
    if (!record || record.length === 0) {
      return new NextResponse("Verification not found", { status: 404 });
    }

    return NextResponse.json(record);
  } catch (error) {
    console.error("Error getting verification:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const searchParams = new URL(req.url).searchParams;
    const id = searchParams.get("id");
    if (!id) {
      return new NextResponse("ID is required", { status: 400 });
    }
    const record = await prisma.whatsAppVerification.delete({
      where: {
        id,
      },
    });
    return NextResponse.json(record);
  } catch (error) {
    console.error("Error deleting verification:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
