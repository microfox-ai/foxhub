import { FontUse } from "@microfox/fontuse";
import { NextRequest, NextResponse } from "next/server";

const fontUse = new FontUse({
  redisUrl: process.env.FONTUSE_REDIS_REST_URL,
  redisToken: process.env.FONTUSE_REDIS_REST_TOKEN,
  ragUrl: process.env.FONTUSE_VECTOR_REST_URL,
  ragToken: process.env.FONTUSE_VECTOR_REST_TOKEN,
});

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const usecase = searchParams.get("usecase");
  const fonts = searchParams.get("fonts");
  const topK = searchParams.get("topK") || "5";

  if (!usecase && !fonts) {
    return NextResponse.json(
      { error: "Usecase or fonts is required" },
      { status: 400 }
    );
  }

  if (usecase) {
    try {
      const fonts = await fontUse.queryFonts(usecase, { topk: parseInt(topK) });
      return NextResponse.json(fonts);
    } catch (error) {
      console.error("Error querying fonts:", error);
      return NextResponse.json(
        { error: "Failed to query fonts" },
        { status: 500 }
      );
    }
  }

  if (fonts) {
    const fonts_response = await fontUse.getFonts(fonts.split(","));
    return NextResponse.json(fonts_response);
  }
}
