import { TokenUsageAnalyticsTracker } from "./helper";
import { models } from "../models";
import { AiMiddleware } from "@repo/ai-utils/router";
import { StreamWriter } from "@repo/ai-utils/helper";

// TODO: Shift to the frontend.
export const usageTrackerRouter: AiMiddleware = async (props, next) => {
  const { writer, request, state } = props;
  writer.write(
    StreamWriter.writeMessageAnnotation({
      loader: "Thinking...",
    })
  );

  console.log("request", request);
  const userUsagesGeminiPro =
    await TokenUsageAnalyticsTracker.getTokenUsagePerUser(
      request.userId,
      models.googleGeminiPro.modelId
    );
  const requestUsagesGeminiPro =
    await TokenUsageAnalyticsTracker.getTokenUsagePerRequest(
      request.clientRequestId,
      models.googleGeminiPro.modelId
    );
  const userUsagesClaude35Sonnet =
    await TokenUsageAnalyticsTracker.getTokenUsagePerUser(
      request.userId,
      models.claude35Sonnet.modelId
    );
  const requestUsagesClaude35Sonnet =
    await TokenUsageAnalyticsTracker.getTokenUsagePerRequest(
      request.clientRequestId,
      models.claude35Sonnet.modelId
    );

  writer.write(
    StreamWriter.writeMessageAnnotation({
      type: "usage-metadata",
      objectType: "metadata",
      object: {
        geminiPro: {
          userUsage: userUsagesGeminiPro,
          requestUsage: requestUsagesGeminiPro,
        },
        claude35Sonnet: {
          userUsage: userUsagesClaude35Sonnet,
          requestUsage: requestUsagesClaude35Sonnet,
        },
      } as any,
    })
  );

  let isBlock = false;
  if (requestUsagesGeminiPro.length > 0) {
    const totalTokensUsedPerPrequest = requestUsagesGeminiPro[0];
    if (
      totalTokensUsedPerPrequest?.totalTokens &&
      totalTokensUsedPerPrequest?.totalTokens > 100_000 // 0.15$
    ) {
      isBlock = true;
    }
  }

  if (userUsagesGeminiPro.length > 0) {
    const totalTokensUsedPerUser = userUsagesGeminiPro[0];
    if (
      totalTokensUsedPerUser?.totalTokens &&
      totalTokensUsedPerUser?.totalTokens > 3_000_000 // 5$
    ) {
      isBlock = true;
    }
  }

  // TODO: claude requires careful estimations based on completionTOkenPricing

  if (userUsagesClaude35Sonnet.length > 0) {
    const totalTokensUsedPerUser = userUsagesClaude35Sonnet[0];
    if (
      totalTokensUsedPerUser?.totalTokens &&
      totalTokensUsedPerUser?.totalTokens > 2_000_000 // 10$
    ) {
      isBlock = true;
    }
  }

  if (requestUsagesClaude35Sonnet.length > 0) {
    const totalTokensUsedPerRequest = requestUsagesClaude35Sonnet[0];
    if (
      totalTokensUsedPerRequest?.totalTokens &&
      totalTokensUsedPerRequest?.totalTokens > 500_000 // 2.5$
    ) {
      isBlock = true;
    }
  }

  if (isBlock) {
    return;
  }

  next();
};
