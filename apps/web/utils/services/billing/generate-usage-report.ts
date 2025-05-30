import { prisma } from "@/prisma/prisma";
import { TokenUsageAnalyticsTracker } from "@/server/analytics/helper";
import {
  fetchLambdaUsage,
  LambdaUsageResult,
} from "@/utils/services/billing/lambda-usage";
import {
  fetchThirdPartyUsage,
  UsageReportMetadata,
} from "@/utils/services/billing/third-party-usage";
import { fetchAiUsage } from "@/utils/services/billing/ai-usage";
import { MicrofoxUsagePricing } from "@microfox/usage-pricing";

export class UsageReportError extends Error {
  constructor(
    message: string,
    public readonly code: string
  ) {
    super(message);
    this.name = "UsageReportError";
  }
}

export async function generateUsageReport(
  requestId: string,
  dateKeyFull: string
) {
  try {
    // Get the client request to find associated functions
    const clientRequest = await prisma.clientRequest.findUnique({
      where: { id: requestId },
      include: {
        deployedFunctions: true,
      },
    });

    if (!clientRequest) {
      throw new UsageReportError("Request not found", "REQUEST_NOT_FOUND");
    }

    // Get client deployment from client request
    const clientDeployment = await prisma.clientDeployment.findFirst({
      where: {
        originClientRequestId: requestId,
      },
    });

    if (!clientDeployment) {
      throw new UsageReportError(
        "Client deployment not found",
        "DEPLOYMENT_NOT_FOUND"
      );
    }

    try {
      // 1. Fetch lambda usage for the full day
      const lambdaUsage = await fetchLambdaUsage(requestId, clientDeployment, {
        pageSize: 100,
        streamLimit: 20,
        startTime: new Date(
          new Date(dateKeyFull).setHours(0, 0, 0, 0)
        ).getTime(),
        endTime: new Date(
          new Date(dateKeyFull).setHours(23, 59, 59, 999)
        ).getTime(),
      });

      // 2. Fetch third party usage for the full day
      const thirdPartyUsage = await fetchThirdPartyUsage(requestId);

      // 3. Fetch ai usage for the full day
      const aiUsage = await fetchAiUsage(
        clientRequest.userId,
        requestId,
        dateKeyFull
      );

      // 3. Merge and create usage report
      const usageReport = {
        originClientRequestId: requestId,
        priceUSD: calculateTotalPrice(lambdaUsage, thirdPartyUsage, aiUsage),
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
          } as UsageReportMetadata["lambda"],
          thirdParty: {
            totalPrice: thirdPartyUsage.totalPrice,
            packagebasedPricing: thirdPartyUsage.packagebasedPricing,
            typeBasedPricing: thirdPartyUsage.typeBasedPricing,
            totalInvocations: thirdPartyUsage.totalInvocations,
          } as UsageReportMetadata["thirdParty"],
          ai: {
            totalPrice: aiUsage.totalPrice,
            totalOriginalPrice: aiUsage.totalOriginalPrice,
            providerBasedPricing: aiUsage.providerBasedPricing,
            totalInvocations: aiUsage.totalInvocations,
            totalTokens: aiUsage.totalTokens,
          } as UsageReportMetadata["ai"],
        } as any,
        usageLogs: {
          lambda: lambdaUsage.invocations,
          thirdParty: thirdPartyUsage.data,
          ai: aiUsage.data,
        } as any,
      };

      try {
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

        return savedReport;
      } catch (error) {
        throw new UsageReportError(
          "Failed to save usage report to database",
          "DB_SAVE_ERROR"
        );
      }
    } catch (error) {
      if (error instanceof UsageReportError) {
        throw error;
      }
      throw new UsageReportError(
        "Failed to fetch usage data",
        "USAGE_FETCH_ERROR"
      );
    }
  } catch (error) {
    if (error instanceof UsageReportError) {
      throw error;
    }
    throw new UsageReportError(
      "Failed to generate usage report",
      "GENERAL_ERROR"
    );
  }
}

// Helper functions
function calculateTotalPrice(
  lambdaUsage: LambdaUsageResult,
  thirdPartyUsage: Awaited<ReturnType<typeof fetchThirdPartyUsage>>,
  aiUsage: Awaited<ReturnType<typeof fetchAiUsage>>
): number {
  try {
    const totalPrice =
      lambdaUsage.totalPrice + thirdPartyUsage.totalPrice + aiUsage.totalPrice;

    return totalPrice;
  } catch (error) {
    throw new UsageReportError(
      "Failed to calculate total price",
      "PRICE_CALCULATION_ERROR"
    );
  }
}
