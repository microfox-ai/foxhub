import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/prisma/prisma";
import { Params } from "next/dist/server/request/params";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id) {
    return NextResponse.json(
      { error: "Request ID is required" },
      { status: 400 }
    );
  }

  try {
    const clientRequest = await prisma.clientRequest.findUnique({
      where: { id },
    });
    return NextResponse.json(clientRequest);
  } catch (error) {
    console.error("Error fetching organizations:", error);
    return NextResponse.json(
      { error: "Failed to fetch organizations" },
      { status: 500 }
    );
  }
}
