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

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const { id, ...updateData } = body;

    const taskInstanceMeta = await prisma.taskInstanceMeta.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(taskInstanceMeta);
  } catch (error) {
    console.error("Error updating task instance meta:", error);
    return NextResponse.json(
      { error: "Failed to update task instance meta" },
      { status: 500 }
    );
  }
}
