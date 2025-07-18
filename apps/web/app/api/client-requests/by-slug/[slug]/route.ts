import { prisma } from "@/prisma/prisma";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  if (!slug) {
    return NextResponse.json({ error: "Slug is required" }, { status: 400 });
  }

  try {
    const clientRequest = await prisma.clientRequest.findFirst({
      where: {
        slug: slug,
      },
      include: {
        botProject: true,
        taskInstanceMeta: true,
      },
    });

    if (!clientRequest) {
      return NextResponse.json(
        { error: "Client request not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(clientRequest);
  } catch (error) {
    console.error(`[ERROR /api/client-requests/by-slug]`, error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
