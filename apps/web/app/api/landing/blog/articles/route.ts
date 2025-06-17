import { NextResponse } from "next/server";
import { NotionClient } from "@microfox/notion";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const databaseId = searchParams.get("databaseId");
    const pageSize = parseInt(searchParams.get("pageSize") || "10");
    const startCursor = searchParams.get("startCursor") || undefined;
    const pageNo = parseInt(searchParams.get("pageNo") || "1");

    if (!databaseId) {
      return NextResponse.json(
        { error: "Database ID is required" },
        { status: 400 }
      );
    }

    const client = new NotionClient({
      auth: process.env.NOTION_BOT_TOKEN || "",
    });

    const pages = await client.databases.query({
      database_id: databaseId,
      page_size: pageSize,
      start_cursor: startCursor,
    });

    return NextResponse.json({
      results: pages.results,
      has_more: pages.has_more,
      next_cursor: pages.next_cursor,
      page_no: pageNo,
    });
  } catch (error) {
    console.error("Error fetching Notion pages:", error);
    return NextResponse.json(
      { error: "Failed to fetch Notion pages" },
      { status: 500 }
    );
  }
}
