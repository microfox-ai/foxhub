import { NextResponse } from "next/server";
import { prisma } from "@/prisma/prisma";

export async function POST(req: Request) {
  try {
    const { clientSecretId, userId, slug, code } = await req.json();

    if (!clientSecretId || !userId || !slug || !code) {
      return new NextResponse(
        "Client Secret ID, User ID, Slug and Code are required",
        {
          status: 400,
        }
      );
    }

    const record = await prisma.whatsAppVerification.create({
      data: {
        clientSecretId,
        userId,
        slug,
        code,
      },
    });

    return NextResponse.json(record);
  } catch (error) {
    console.error("Error creating verification:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const { clientSecretId, phoneNumber } = await req.json();
    if (!clientSecretId || !phoneNumber) {
      return new NextResponse(
        "Client Secret ID and phone number are required",
        {
          status: 400,
        }
      );
    }

    const record = await prisma.whatsAppVerification.update({
      where: {
        clientSecretId,
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
    const userId = searchParams.get("userId");

    if (!clientSecretId || !userId) {
      return new NextResponse("Client Secret ID and User ID are required", {
        status: 400,
      });
    }

    const record = await prisma.whatsAppVerification.findMany({
      where: {
        clientSecretId,
        userId,
      },
    });

    return NextResponse.json(record);
  } catch (error) {
    console.error("Error getting verification:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
