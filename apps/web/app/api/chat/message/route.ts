import { prisma } from "@/prisma/prisma";
import { FUNCTIONTYPE, SECRETMODE } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

// Create ClientRequestFunction
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log("body", body);

    const message = await prisma.chatUIMessage.create({
      data: {
        ...body,
      },
    });

    return NextResponse.json(message, { status: 201 });
  } catch (error) {
    console.error("Error creating ClientRequestFunction:", error);
    return NextResponse.json(
      { error: "Error creating ClientRequestFunction" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const message = await prisma.chatUIMessage.update({
    where: { id: body.id },
    data: body,
  });
  if (!message) {
    return NextResponse.json({ error: "Message not found" }, { status: 404 });
  }
  return NextResponse.json(message, { status: 200 });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const requestId = searchParams.get("requestId");

  const messages = await prisma.chatUIMessage.findMany({
    where: {
      ...(id ? { id: id } : {}),
      ...(requestId ? { originClientRequestId: requestId } : {}),
    },
  });
  if (!messages) {
    return NextResponse.json({ error: "No messages found" }, { status: 404 });
  }
  return NextResponse.json(messages);
}
