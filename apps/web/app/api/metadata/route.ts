import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");

  if (!url) {
    return NextResponse.json({ error: "URL is required" }, { status: 400 });
  }

  try {
    const response = await fetch(url);
    const html = await response.text();
    const $ = cheerio.load(html);

    const getMetaTag = (name: string) => {
      return (
        $(`meta[name="${name}"]`).attr("content") ||
        $(`meta[property="og:${name}"]`).attr("content") ||
        $(`meta[property="twitter:${name}"]`).attr("content")
      );
    };

    const metadata = {
      title: $("title").first().text() || getMetaTag("title"),
      description: getMetaTag("description"),
      image: getMetaTag("image"),
      url,
    };

    return NextResponse.json(metadata);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch metadata" },
      { status: 500 }
    );
  }
}
