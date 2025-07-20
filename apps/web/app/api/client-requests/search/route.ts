import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/prisma/prisma";
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");
    const projectId = searchParams.get("projectId");

    if (!projectId) {
      return NextResponse.json(
        { error: "Project ID is required" },
        { status: 400 }
      );
    }

    if (!query) {
      return NextResponse.json([]);
    }

    const requests = await prisma.clientRequest.findMany({
      where: {
        botProjectId: projectId,
        title: {
          contains: query,
          mode: "insensitive",
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    return NextResponse.json(requests);
  } catch (error) {
    console.error("Failed to search client requests:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
