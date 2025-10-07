import { NextResponse } from "next/server";
import { NotionClient } from "@microfox/notion";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const data_source_id = searchParams.get("data_source_id");
    const category = searchParams.get("category");
    const pageSize = parseInt(searchParams.get("pageSize") || "50");
    const startCursor = searchParams.get("startCursor") || undefined;
    const pageNo = parseInt(searchParams.get("pageNo") || "1");

    if (!data_source_id) {
      return NextResponse.json(
        { error: "Data source ID is required" },
        { status: 400 }
      );
    }

    const client = new NotionClient({
      auth: process.env.NOTION_BOT_TOKEN || "",
      notionVersion: "2025-09-03",
    });

    const mainFilter = {
      property: "Status",
      select: {
        equals: "Published",
      },
    };
    let filter: any = mainFilter;

    if (category) {
      const categoryFilter = {
        property: "Category",
        multi_select: {
          contains: category,
        },
      };
      filter = {
        or: [mainFilter, categoryFilter],
      };
    } else {
      filter = mainFilter;
    }

    const pages = await client.dataSources.query({
      data_source_id: data_source_id,
      page_size: pageSize,
      start_cursor: startCursor,
      filter,
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
