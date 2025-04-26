import { NextResponse } from "next/server";
import { prisma } from "@/prisma/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug");

  if (!slug) {
    return NextResponse.json({ error: "Slug is required" }, { status: 400 });
  }

  try {
    const existingProject = await prisma.botProject.findFirst({
      where: {
        slug: slug,
      },
    });

    return NextResponse.json({ isAvailable: !existingProject });
  } catch (error) {
    console.error("Error checking slug availability:", error);
    return NextResponse.json(
      { error: "Failed to check slug availability" },
      { status: 500 }
    );
  }
}
