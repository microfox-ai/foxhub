import {
  defaultCallbackResultBody,
  ServerStreamingFunction,
  StreamingFucntionProps,
} from "@repo/ai-utils/router";
import { TokenUsageAnalyticsTracker } from "./helper";
import { models } from "../models";

// TODO: Shift to the frontend.
export const usageTrackerRouter: ServerStreamingFunction<
  any,
  defaultCallbackResultBody
> = async (props) => {
  const { dataStream, requestBody, responseBody } = props;
  props.dataStream.writeMessageAnnotation({
    type: "loading",
    content: "Thinking...",
  });
  props.dataStream.writeMessageAnnotation({
    type: "clientRequestId",
    value: requestBody.clientRequestId,
  });
  const userUsagesGeminiPro =
    await TokenUsageAnalyticsTracker.getTokenUsagePerUser(
      requestBody.userId,
      models.googleGeminiPro.modelId
    );
  const requestUsagesGeminiPro =
    await TokenUsageAnalyticsTracker.getTokenUsagePerRequest(
      requestBody.clientRequestId,
      models.googleGeminiPro.modelId
    );
  const userUsagesClaude35Sonnet =
    await TokenUsageAnalyticsTracker.getTokenUsagePerUser(
      requestBody.userId,
      models.claude35Sonnet.modelId
    );
  const requestUsagesClaude35Sonnet =
    await TokenUsageAnalyticsTracker.getTokenUsagePerRequest(
      requestBody.clientRequestId,
      models.claude35Sonnet.modelId
    );

  props.dataStream.writeMessageAnnotation({
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
  });

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
    console.log("isBlock", isBlock);
  }

  return {
    responseBody: {
      ...props.responseBody,
      blockNextSteps: false,
    },
    appendRequestBody: props.requestBody,
  };
};
