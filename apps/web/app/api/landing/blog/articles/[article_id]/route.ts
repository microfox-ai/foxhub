import { NextResponse } from "next/server";
import { getArticleData } from "@/lib/notion/articles";

// Revalidate every 24 hours (86400 seconds)
export const revalidate = 300; //* 60 //* 24;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ article_id: string }> }
) {
  try {
    const { article_id } = await params;

    if (!article_id) {
      return NextResponse.json(
        { error: "Article ID is required" },
        { status: 400 }
      );
    }

    const { page, content } = await getArticleData(article_id);

    const response = NextResponse.json({
      page,
      content,
    });

    // Add cache headers
    response.headers.set(
      "Cache-Control",
      "public, s-maxage=3600, stale-while-revalidate=86400"
    );

    return response;
  } catch (error) {
    console.error("Error fetching Notion page:", error);
    return NextResponse.json(
      { error: "Failed to fetch Notion page" },
      { status: 500 }
    );
  }
}
