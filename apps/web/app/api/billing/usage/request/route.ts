import { prisma } from "@/prisma/prisma";
import {
  fetchLambdaUsage,
  LambdaUsageResult,
} from "@/utils/services/aws/lambda-usage";
import { MicrofoxUsagePricing } from "@microfox/usage-pricing";
import { NextResponse } from "next/server";

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

    // Get the client request to find associated functions
    const clientRequest = await prisma.clientRequest.findUnique({
      where: { id: requestId },
      include: {
        deployedFunctions: true,
      },
    });

    if (!clientRequest) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }
    // Get client deployment from client request
    const clientDeployment = await prisma.clientDeployment.findFirst({
      where: {
        originClientRequestId: requestId,
      },
    });

    if (!clientDeployment) {
      return NextResponse.json(
        { error: "Client deployment not found" },
        { status: 404 }
      );
    }

    // 1. Fetch lambda usage for the full day
    const lambdaUsage = await fetchLambdaUsage(requestId, clientDeployment, {
      pageSize: 100,
      streamLimit: 10,
      startTime: new Date(new Date(dateKeyFull).setHours(0, 0, 0, 0)).getTime(),
      endTime: new Date(
        new Date(dateKeyFull).setHours(23, 59, 59, 999)
      ).getTime(),
    });

    // 2. Fetch third party usage for the full day
    const thirdPartyUsage = await fetchThirdPartyUsage(requestId);

    // 3. Merge and create usage report
    const usageReport = {
      originClientRequestId: requestId,
      priceUSD: calculateTotalPrice(lambdaUsage, thirdPartyUsage),
      dateKey: dateKeyFull,
      cycle: "daily",
      computeTime: lambdaUsage.totalComputeTime,
      metadata: {
        lambda: {
          totalComputeTime: lambdaUsage.totalComputeTime,
          totalMemoryUsed: lambdaUsage.totalMemoryUsed,
          totalInvocations: lambdaUsage.totalInvocations,
          totalPrice: lambdaUsage.totalPrice,
          totalOriginalPrice: lambdaUsage.totalOriginalPrice,
        },
        thirdPartyUsage,
      } as any,
      usageLogs: {
        lambda: lambdaUsage.invocations,
        thirdParty: thirdPartyUsage.data,
      } as any,
    };

    // 4. Save usage report to db
    const existingReport = await prisma.usageReport.findFirst({
      where: {
        dateKey: usageReport.dateKey,
        cycle: usageReport.cycle,
        originClientRequestId: usageReport.originClientRequestId,
      },
    });

    const savedReport = existingReport
      ? await prisma.usageReport.update({
          where: { id: existingReport.id },
          data: usageReport,
        })
      : await prisma.usageReport.create({
          data: usageReport,
        });

    // 5. Respond with status
    return NextResponse.json({
      status: "completed",
      reportId: savedReport.id,
    });
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
    return NextResponse.json({ status: "processing" });
  } catch (error) {
    console.error("Error in usage request GET:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Helper functions
async function fetchThirdPartyUsage(requestId: string) {
  // TODO: Implement actual third party usage fetching
  const microfoxUsagePricing = new MicrofoxUsagePricing({
    prefix: requestId,
  });

  const usage = await microfoxUsagePricing.getDailyUsage(undefined, {
    limit: 1000000,
    offset: 0,
  });

  console.log(usage);
  const totalPrice = usage.data.reduce((acc, usage) => {
    return acc + usage.priceUSD;
  }, 0);

  const packagebasedPricing: Record<string, number> = {};
  usage.data.forEach((usage) => {
    if (usage.package) {
      packagebasedPricing[usage.package] =
        (packagebasedPricing[usage.package] || 0) + usage.priceUSD;
    }
  });

  const typeBasedPricing: Record<string, number> = {};
  usage.data.forEach((usage) => {
    if (usage.type) {
      typeBasedPricing[usage.type] =
        (typeBasedPricing[usage.type] || 0) + usage.priceUSD;
    }
  });

  return {
    ...usage,
    totalPrice,
    packagebasedPricing,
    typeBasedPricing,
  };
}

function calculateTotalPrice(
  lambdaUsage: LambdaUsageResult,
  thirdPartyUsage: Awaited<ReturnType<typeof fetchThirdPartyUsage>>
): number {
  const totalPrice = lambdaUsage.totalPrice + thirdPartyUsage.totalPrice;

  return totalPrice;
}
