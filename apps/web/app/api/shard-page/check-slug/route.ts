import { NextResponse } from "next/server";
import { prisma } from "@/prisma/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const slug = searchParams.get("slug");

    if (!slug) {
      return NextResponse.json({ error: "Slug is required" }, { status: 400 });
    }

    // Check if slug exists
    const existingShard = await prisma.shardPage.findFirst({
      where: {
        slug: slug,
      },
    });

    return NextResponse.json({
      exists: !!existingShard,
    });
  } catch (error) {
    console.error("Error checking slug:", error);
    return NextResponse.json(
      { error: "Failed to check slug" },
      { status: 500 }
    );
  }
}
