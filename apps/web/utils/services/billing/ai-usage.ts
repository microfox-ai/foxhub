import { TokenUsageAnalyticsTracker } from "@/server/analytics/helper";
import { UsageAnalytics } from "@prisma/client";
import { attachPricingLLM } from "@microfox/usage-pricing";

export interface usageAnalyticsWithPrice extends UsageAnalytics {
  priceUSD: number;
  originalPriceUSD: number | undefined;
  provider: string;
  logoUrl: string;
}

export const getLogoUrl = (provider: string) => {
  const map = {
    "ai-provider-openai": "openai-icon.svg",
    "ai-provider-anthropic": "anthropic-icon.svg",
    "ai-provider-google": "google-icon.svg",
    "ai-provider-azure": "azure-icon.svg",
    "ai-provider-aws": "aws-icon.svg",
    "ai-provider-ibm": "ibm-icon.svg",
  } as const;
  return `https://raw.githubusercontent.com/microfox-ai/microfox/refs/heads/main/logos/${map[provider as keyof typeof map]}`;
};

export const fetchAiUsage = async (
  userId: string,
  requestId: string,
  dateKeyFull: string
) => {
  const aiUsage =
    await TokenUsageAnalyticsTracker.getFilteredTokenUsagePerRequest(
      requestId,
      dateKeyFull == "all"
        ? {}
        : {
            onDate: dateKeyFull,
          }
    );
  const aiUsageWithPrice: usageAnalyticsWithPrice[] = aiUsage.map((usage) => {
    const pricing = attachPricingLLM({
      model: usage.model || undefined,
      promptTokens: usage.promptTokens,
      completionTokens: usage.completionTokens,
    });
    return {
      ...usage,
      priceUSD: pricing.priceUSD,
      originalPriceUSD: pricing.originalPriceUSD,
      provider: pricing.package,
      logoUrl: getLogoUrl(pricing.package),
    };
  });

  return {
    data: aiUsageWithPrice,
    totalInvocations: aiUsageWithPrice.reduce(
      (acc, usage) => acc + usage.invocations,
      0
    ),
    providerBasedPricing: aiUsageWithPrice.reduce(
      (acc, usage) => {
        if (!acc[usage.provider]) {
          acc[usage.provider] = 0;
        }
        (acc as any)[usage.provider] += usage.priceUSD;
        return acc;
      },
      {} as Record<string, number>
    ),
    totalPrice: aiUsageWithPrice.reduce(
      (acc, usage) => acc + usage.priceUSD,
      0
    ),
    totalOriginalPrice: aiUsageWithPrice.reduce(
      (acc, usage) => acc + (usage.originalPriceUSD || 0),
      0
    ),
    totalTokens: aiUsageWithPrice.reduce(
      (acc, usage) => acc + usage.totalTokens,
      0
    ),
    totalPromptTokens: aiUsageWithPrice.reduce(
      (acc, usage) => acc + usage.promptTokens,
      0
    ),
    totalCompletionTokens: aiUsageWithPrice.reduce(
      (acc, usage) => acc + usage.completionTokens,
      0
    ),
  };
};
