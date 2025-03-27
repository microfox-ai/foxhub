import { prisma } from "@/prisma/prisma";

export interface TokenUsageAnalytics {
  requestId?: string;
  userId: string;
  botProjectId?: string;
  promptTokens: number;
  totalTokens: number;
  completionTokens: number;
  model: string;
}

export enum TokenUsageModel {
  GEMINI_1_5_FLASH = "gemini-1.5-flash",
  GEMINI_1_5_PRO = "gemini-1.5-pro",
  CLAUDE_3_5_SONNET = "claude-3-5-sonnet-20240620",
  CLAUDE_3_HAIKU = "claude-3-haiku-20240307",
}
export const TokenUsageAnalyticsTracker = {
  updateUsage: async (usageData: TokenUsageAnalytics) => {
    let matchId = `${usageData.userId}${
      usageData.requestId != undefined
        ? "--r--" + usageData.requestId?.substring(0, 5)
        : ""
    }${
      usageData.botProjectId != undefined
        ? "--b--" + usageData.botProjectId?.substring(0, 5)
        : ""
    }${usageData.model ? "--m--" + usageData.model : ""}`;
    const usage = await prisma.usageAnalytics.upsert({
      where: {
        matchId,
      },
      update: {
        promptTokens: {
          increment: usageData.promptTokens,
        },
        totalTokens: {
          increment: usageData.totalTokens,
        },
        completionTokens: {
          increment: usageData.completionTokens,
        },
      },
      create: {
        matchId,
        promptTokens: usageData.promptTokens,
        totalTokens: usageData.totalTokens,
        completionTokens: usageData.completionTokens,
        model: usageData.model,
      },
    });
    return usage;
  },
  updateUserTokenUsage: async (
    userId: string,
    props: {
      model: string;
      promptTokens: number;
      totalTokens: number;
      completionTokens: number;
    }
  ) => {
    const usage = TokenUsageAnalyticsTracker.updateUsage({
      ...props,
      userId,
    });
    return usage;
  },
  updateRequestTokenUsage: async (
    userId: string,
    {
      requestId,
      ...props
    }: {
      requestId: string;
      model: string;
      promptTokens: number;
      totalTokens: number;
      completionTokens: number;
    }
  ) => {
    // also update count on the user end
    const usage = TokenUsageAnalyticsTracker.updateUserTokenUsage(userId, {
      ...props,
    });
    // also update count on the request end
    const requestUsage = TokenUsageAnalyticsTracker.updateUsage({
      ...props,
      userId,
      requestId,
    });
    return requestUsage;
  },
  trackUsage: async (props: {
    userId: string;
    clientRequestId?: string;
    originClientRequestId?: string;
    model: string;
    usage: {
      promptTokens: number;
      totalTokens: number;
      completionTokens: number;
    };
  }) => {
    if (props.clientRequestId || props.originClientRequestId) {
      const requestUsage = TokenUsageAnalyticsTracker.updateRequestTokenUsage(
        props.userId,
        {
          ...props.usage,
          requestId: props.clientRequestId ?? props.originClientRequestId ?? "",
          model: props.model,
        }
      );
      return requestUsage;
    } else {
      const userUsage = TokenUsageAnalyticsTracker.updateUserTokenUsage(
        props.userId,
        {
          ...props.usage,
          model: props.model,
        }
      );
      return userUsage;
    }
  },
  getTokenUsagePerUser: async (userId: string, model: TokenUsageModel) => {
    const usage = await prisma.usageAnalytics.findMany({
      where: {
        matchId: userId + "--m--" + model,
      },
    });
    return usage;
  },
  getTokenUsagePerRequest: async (userId: string, requestId: string) => {
    const usage = await prisma.usageAnalytics.findMany({
      where: {
        matchId: userId + "--r--" + requestId,
      },
    });
    return usage;
  },
};
