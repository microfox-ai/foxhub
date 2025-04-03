import { prisma } from "@/prisma/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  const clientRequestId = request.nextUrl.searchParams.get("clientRequestId");

  if (!id && !clientRequestId) {
    return NextResponse.json(
      { error: "Either id or clientRequestId is required" },
      { status: 400 }
    );
  }

  try {
    const taskInstanceMeta = await prisma.taskInstanceMeta.findMany({
      where: {
        ...(id && { id: id }),
        ...(clientRequestId && { originClientRequestId: clientRequestId }),
      },
    });

    return NextResponse.json(taskInstanceMeta);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch task instance meta" },
      { status: 500 }
    );
  }
}
