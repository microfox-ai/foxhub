import { prisma } from "@/prisma/prisma";
import { TokenUsageAnalyticsTracker } from "@/server/analytics/helper";
import { fetchAiUsage } from "@/utils/services/billing/ai-usage";
import { NextRequest, NextResponse } from "next/server";

//export const dynamic = "force-dynamic";
export const revalidate = 0;

const fullPackageName = (pkg: string) =>
  pkg.startsWith("@microfox/") ? pkg : `@microfox/${pkg}`;

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const userId = searchParams.get("userId");
    const clientRequestId = searchParams.get("clientRequestId");
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "30");

    if (!clientRequestId) {
      return NextResponse.json(
        { error: "clientRequestId & userId are required" },
        { status: 400 }
      );
    }

    const aiUsage = await fetchAiUsage(clientRequestId, "all");

    // const clientSecrets = await prisma.clientSecret.findMany({
    //   where: {
    //     clientRequestIds: {
    //       has: clientRequestId,
    //     },
    //   },
    // });

    // TODO: fetch & attach package Infos.

    return NextResponse.json({
      results: aiUsage.data,
      total: aiUsage.data.length,
      page,
      pageSize,
      totalPages: 100,
    });
  } catch (err) {
    console.log(err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
