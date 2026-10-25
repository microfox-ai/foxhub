import { prisma } from "@/prisma/prisma";
import { ClientRequest } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { generateUsageReport } from "@/utils/services/billing/generate-usage-report";
import { rejectUnauthorizedCron } from "../auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Seconds, not ms. 800 is the most Vercel Pro allows.
export const maxDuration = 800;

const BATCH_SIZE = 100;

async function processBatch(requests: ClientRequest[], dateKey: string) {
  const results = await Promise.all(
    requests.map(async (request) => {
      const requestId = request.id;
      if (!requestId) {
        return {
          requestId: "unknown",
          status: "error",
          error: "Missing originClientRequestId",
        };
      }

      try {
        const savedReport = await generateUsageReport(requestId, dateKey);
        return {
          requestId,
          status: "success",
          reportId: savedReport.id,
        };
      } catch (error: any) {
        console.error("Error in usage reports cron job:", error);
        return {
          requestId,
          status: "error",
          error: error?.message || "Unknown error",
        };
      }
    })
  );
  return results;
}

export async function GET(req: NextRequest) {
  const unauthorized = rejectUnauthorizedCron(req);
  if (unauthorized) return unauthorized;

  try {
    // Get all client deployments
    const clientRequests = await prisma.clientRequest.findMany();

    const today = new Date().toISOString().split("T")[0];
    const results = [];

    if (!today) {
      return NextResponse.json(
        { error: "Today's date is not set" },
        { status: 500 }
      );
    }

    // Create batches
    const batchResults = [];
    for (let i = 0; i < clientRequests.length; i += BATCH_SIZE) {
      const batch = clientRequests.slice(i, i + BATCH_SIZE);
      const results = await processBatch(batch, today);
      batchResults.push(...results);
    }

    // Flatten results
    const flattenedResults = batchResults.flat();

    return NextResponse.json({
      status: "completed",
      total: flattenedResults.length,
      totalSuccess: flattenedResults.filter(
        (result) => result.status === "success"
      ).length,
      totalError: flattenedResults.filter((result) => result.status === "error")
        .length,
      results: flattenedResults,
    });
  } catch (error: any) {
    console.error("Error in usage reports cron job:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
