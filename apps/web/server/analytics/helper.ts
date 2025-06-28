import { prisma } from "@/prisma/prisma";
import dayjs from "dayjs";
import { LanguageModelV2Usage } from "@ai-sdk/provider";

export interface TokenUsageAnalytics extends LanguageModelV2Usage {
  requestId?: string;
  userId?: string;
  botProjectId?: string;
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
    if (
      !usageData.inputTokens ||
      !usageData.outputTokens ||
      !usageData.totalTokens
    ) {
      console.error("usageData is missing required fields", usageData);
      return;
    }
    const dateKey = dayjs().format("YYYY-MM-DD");
    const hourKey = dayjs().format("YYYY-MM-DD-HH");
    let matchId = `${usageData.userId ? "u-" + usageData.userId?.substring(0, 5) : ""}${
      usageData.requestId != undefined
        ? "-r-" + usageData.requestId?.substring(0, 5)
        : ""
    }${
      usageData.botProjectId != undefined
        ? "-b-" + usageData.botProjectId?.substring(0, 5)
        : ""
    }${usageData.model ? "-m-" + usageData.model : ""}${"-d-" + hourKey}`;
    const usage = await prisma.usageAnalytics.upsert({
      where: {
        matchId,
      },
      update: {
        promptTokens: {
          increment: usageData.inputTokens,
        },
        totalTokens: {
          increment: usageData.totalTokens,
        },
        completionTokens: {
          increment: usageData.outputTokens,
        },
        invocations: {
          increment: 1,
        },
      },
      create: {
        matchId,
        promptTokens: usageData.inputTokens,
        totalTokens: usageData.totalTokens,
        completionTokens: usageData.outputTokens,
        model: usageData.model,
        day: dateKey,
        month: dayjs().format("YYYY-MM"),
        hour: hourKey,
        ...(usageData.requestId && { requestId: usageData.requestId }),
        ...(usageData.botProjectId && { projectId: usageData.botProjectId }),
        ...(usageData.userId && { userId: usageData.userId }),
      },
    });
    return usage;
  },
  updateUserTokenUsage: async (
    userId: string,
    props: {
      model: string;
    } & LanguageModelV2Usage
  ) => {
    const usage = TokenUsageAnalyticsTracker.updateUsage({
      ...props,
      userId,
    });
    return usage;
  },
  updateRequestTokenUsage: async ({
    requestId,
    ...props
  }: {
    requestId: string;
    model: string;
  } & LanguageModelV2Usage) => {
    // // also update count on the user end
    // const usage = TokenUsageAnalyticsTracker.updateUserTokenUsage(userId, {
    //   ...props,
    // });
    // also update count on the request end
    const requestUsage = TokenUsageAnalyticsTracker.updateUsage({
      ...props,
      userId: undefined,
      requestId,
    });
    return requestUsage;
  },
  trackUsage: async (props: {
    userId: string;
    clientRequestId?: string;
    originClientRequestId?: string;
    model: string;
    usage: LanguageModelV2Usage;
  }) => {
    if (props.clientRequestId || props.originClientRequestId) {
      const requestUsage = TokenUsageAnalyticsTracker.updateRequestTokenUsage({
        ...props.usage,
        requestId: props.clientRequestId ?? props.originClientRequestId ?? "",
        model: props.model,
      });
      return requestUsage;
    } else {
      // TODO: update based on botProjectId
      // const userUsage = TokenUsageAnalyticsTracker.updateUserTokenUsage(
      //   props.userId,
      //   {
      //     ...props.usage,
      //     model: props.model,
      //   }
      // );
      // return userUsage;
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
  getTokenUsagePerProject: async (projectId: string, model?: string) => {
    const usage = await prisma.usageAnalytics.findMany({
      where: {
        matchId: {
          contains:
            "-b-" + projectId?.substring(0, 5) + (model ? "-m-" + model : ""),
        },
      },
    });
    return usage;
  },
  getTokenUsagePerRequest: async (requestId: string, model?: string) => {
    const usage = await prisma.usageAnalytics.findMany({
      where: {
        matchId: {
          contains:
            "-r-" + requestId?.substring(0, 5) + (model ? "-m-" + model : ""),
        },
      },
    });
    return usage;
  },
  getFilteredTokenUsagePerRequest: async (
    requestId: string,
    filters: {
      model?: string;
      startDate?: string;
      endDate?: string;
      onDate?: string;
    }
  ) => {
    let query = {};

    if (filters.onDate) {
      query = {
        day: filters.onDate,
      };
    } else if (filters.startDate && filters.endDate) {
      query = {
        day: {
          gte: filters.startDate,
          lte: filters.endDate,
        },
      };
    }

    const usage = await prisma.usageAnalytics.findMany({
      where: {
        matchId: {
          contains:
            "-r-" +
            requestId?.substring(0, 5) +
            (filters.model ? "-m-" + filters.model : ""),
        },
        ...query,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 50,
    });
    return usage;
  },
};
