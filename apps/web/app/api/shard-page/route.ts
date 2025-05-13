import { prisma } from "@/prisma/prisma";
import { NextRequest, NextResponse } from "next/server";

// GET all shard pages
export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  const userId = request.nextUrl.searchParams.get("userId");

  try {
    const shardPages = await prisma.shardPage.findMany({
      where: {
        ...(id ? { id } : {}),
        ...(userId ? { creatorId: userId } : {}),
      },
    });

    return NextResponse.json(shardPages);
  } catch (error) {
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// PUT update shard page
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, ...data } = body;

    const shardPage = await prisma.shardPage.update({
      where: {
        id,
      },
      data: {
        ...data,
      },
    });

    return NextResponse.json(shardPage);
  } catch (error) {
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// DELETE shard page
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    await prisma.shardPage.delete({
      where: {
        id,
      },
    });

    return NextResponse.json({ message: "Shard page deleted successfully" });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
