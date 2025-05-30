import { prisma } from "@/prisma/prisma";
import { generateUsageReport } from "@/utils/services/billing/generate-usage-report";
import { NextResponse } from "next/server";

export const maxDuration = 30;

// POST
export async function POST(req: Request) {
  try {
    const { requestId, dateKey } = await req.json();

    const dateKeyFull = dateKey ?? new Date().toISOString().split("T")[0] ?? "";
    if (!requestId) {
      return NextResponse.json(
        { error: "Request ID is required" },
        { status: 400 }
      );
    }

    try {
      const savedReport = await generateUsageReport(requestId, dateKeyFull);

      // 5. Respond with status
      return NextResponse.json({
        status: "completed",
        reportId: savedReport.id,
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === "Request not found") {
          return NextResponse.json(
            { error: "Request not found" },
            { status: 404 }
          );
        }
        if (error.message === "Client deployment not found") {
          return NextResponse.json(
            { error: "Client deployment not found" },
            { status: 404 }
          );
        }
      }
      throw error;
    }
  } catch (error) {
    console.error("Error in usage request POST:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const requestId = searchParams.get("requestId");
    const date = searchParams.get("date");
    const dateKeyFull = date ?? new Date().toISOString().split("T")[0] ?? "";

    if (!requestId) {
      return NextResponse.json(
        { error: "Request ID is required" },
        { status: 400 }
      );
    }

    // 1. Fetch usage report for the full day
    const usageReport = await prisma.usageReport.findFirst({
      where: {
        originClientRequestId: requestId,
        dateKey: dateKeyFull,
        cycle: "daily",
      },
    });

    // 2. Return usage report if it's not today
    if (usageReport) {
      return NextResponse.json(usageReport);
    }

    // 3. If it is today and no report exists, return processing status
    return NextResponse.json({ status: "processing" }, { status: 200 });
  } catch (error) {
    console.error("Error in usage request GET:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
