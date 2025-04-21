import { prisma } from "@/prisma/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Get all possible search parameters
    const id = searchParams.get("id");
    const ids = searchParams.get("ids")?.split(",");
    const botProjectId = searchParams.get("botProjectId");
    const status = searchParams.get("status");
    const page = searchParams.get("page") || "1";
    const limit = searchParams.get("limit") || "10";
    const includeTaskInstanceMeta =
      searchParams.get("includeTaskInstanceMeta") || "false";

    // Build query conditions based on provided parameters
    const conditions: Record<string, any> = {};

    if (id) {
      conditions.id = id;
    }

    if (ids && ids.length > 0) {
      conditions.id = { in: ids };
    }

    if (botProjectId) {
      conditions.botProjectId = botProjectId;
    }

    if (status) {
      conditions.status = status;
    }

    const include: any = {};
    if (includeTaskInstanceMeta === "true") {
      include.taskInstanceMeta = true;
    }

    // TODO: Add your database query logic here using the conditions
    // Example:
    const results = await prisma.clientRequest.findMany({
      where: conditions,
      skip: (parseInt(page) - 1) * parseInt(limit),
      take: parseInt(limit),
      include,
    });

    return NextResponse.json({
      success: true,
      data: results,
      page: parseInt(page),
      limit: parseInt(limit),
    });
  } catch (error) {
    console.error("Error in client-requests GET:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
