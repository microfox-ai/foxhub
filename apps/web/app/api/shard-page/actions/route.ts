import { prisma } from "@/prisma/prisma";
import { NextRequest, NextResponse } from "next/server";

// Increment view count
export async function POST(request: NextRequest) {
  try {
    const { id, action } = await request.json();

    if (!id || !action) {
      return NextResponse.json(
        { error: "ID and action are required" },
        { status: 400 }
      );
    }

    if (action === "view") {
      const shardPage = await prisma.shardPage.update({
        where: { id },
        data: {
          viewCount: {
            increment: 1,
          },
        },
      });
      return NextResponse.json(shardPage);
    }

    if (action === "like") {
      const shardPage = await prisma.shardPage.update({
        where: { id },
        data: {
          likeCount: {
            increment: 1,
          },
        },
      });
      return NextResponse.json(shardPage);
    }

    if (action === "unlike") {
      const shardPage = await prisma.shardPage.update({
        where: { id },
        data: {
          likeCount: {
            decrement: 1,
          },
        },
      });
      return NextResponse.json(shardPage);
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Error updating shard page:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
