import {
  MicrofoxUsagePricing,
  UsageWithPricing,
} from "@microfox/usage-pricing";

export interface UsageReportMetadata {
  lambda: {
    totalComputeTime: number;
    totalMemoryUsed: number;
    totalInvocations: number;
    totalPrice: number;
    totalOriginalPrice: number;
  };
  thirdParty: {
    totalPrice: number;
    packagebasedPricing: Record<string, number>;
    typeBasedPricing: Record<string, number>;
    totalInvocations: number;
  };
  ai: {
    totalPrice: number;
    totalInvocations: number;
    totalOriginalPrice: number;
    providerBasedPricing: Record<string, number>;
    totalTokens: number;
    totalPromptTokens: number;
    totalCompletionTokens: number;
  };
}

export interface ThirdPartyUsageResult {
  data: UsageWithPricing[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
  totalPrice: number;
  packagebasedPricing: Record<string, number>;
  typeBasedPricing: Record<string, number>;
  totalInvocations: number;
}

export async function fetchThirdPartyUsage(
  requestId: string
): Promise<ThirdPartyUsageResult> {
  const microfoxUsagePricing = new MicrofoxUsagePricing({
    prefix: requestId,
  });

  const usage = await microfoxUsagePricing.getDailyUsage(undefined, {
    limit: 1000000,
    offset: 0,
  });

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
    totalInvocations: usage.data.length,
  };
}
