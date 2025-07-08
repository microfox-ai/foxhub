import { TokenUsageAnalyticsTracker } from "./helper";
import { models } from "../models";
import { AiMiddleware } from "@microfox/ai-router";
import { StreamWriter } from "@repo/ai-utils/helper";

type UsageTrackerMetadata = {};
type UsageMetadataTool = {
  "usage-metadata": {
    input: {
      userId: string;
      clientRequestId: string;
      models: string[];
    };
    output: {
      geminiPro: {
        userUsage: any[];
        requestUsage: any[];
      };
      claude35Sonnet: {
        userUsage: any[];
        requestUsage: any[];
      };
    };
  };
};

// TODO: Shift to the frontend.
export const usageTrackerRouter: AiMiddleware<
  UsageTrackerMetadata,
  any,
  UsageMetadataTool
> = async (props, next) => {
  const { response, request, state } = props;
  console.log("usageTrackerRouter", state);
  response.writeMessageMetadata({
    loader: "Thinking...",
  });

  response.writeMessageMetadata({
    routerRequestId: request.requestId,
  });

  // const userUsagesGeminiPro =
  //   await TokenUsageAnalyticsTracker.getTokenUsagePerUser(
  //     request.userId,
  //     models.googleGeminiPro.modelId
  //   );
  // // const requestUsagesGeminiPro =
  // //   await TokenUsageAnalyticsTracker.getTokenUsagePerRequest(
  // //     request.clientRequestId,
  // //     models.googleGeminiPro.modelId
  // //   );
  // const userUsagesClaude35Sonnet =
  //   await TokenUsageAnalyticsTracker.getTokenUsagePerUser(
  //     request.userId,
  //     models.claude35Sonnet.modelId
  //   );
  // const requestUsagesClaude35Sonnet =
  //   await TokenUsageAnalyticsTracker.getTokenUsagePerRequest(
  //     request.clientRequestId,
  //     models.claude35Sonnet.modelId
  //   );

  // response.writeCustomTool({
  //   toolName: "usage-metadata",
  //   input: {
  //     userId: request.userId,
  //     clientRequestId: request.clientRequestId,
  //     models: [models.googleGeminiPro.modelId, models.claude35Sonnet.modelId],
  //   },
  //   output: {
  //     geminiPro: {
  //       userUsage: userUsagesGeminiPro,
  //       requestUsage: [],
  //     },
  //     claude35Sonnet: {
  //       userUsage: userUsagesClaude35Sonnet,
  //       requestUsage: [],
  //     },
  //   },
  // });

  let isBlock = false;

  // if (userUsagesGeminiPro.length > 0) {
  //   const totalTokensUsedPerUser = userUsagesGeminiPro[0];
  //   if (
  //     totalTokensUsedPerUser?.totalTokens &&
  //     totalTokensUsedPerUser?.totalTokens > 3_000_000 // 5$
  //   ) {
  //     isBlock = true;
  //   }
  // }

  // // TODO: claude requires careful estimations based on completionTOkenPricing

  // if (userUsagesClaude35Sonnet.length > 0) {
  //   const totalTokensUsedPerUser = userUsagesClaude35Sonnet[0];
  //   if (
  //     totalTokensUsedPerUser?.totalTokens &&
  //     totalTokensUsedPerUser?.totalTokens > 2_000_000 // 10$
  //   ) {
  //     isBlock = true;
  //   }
  // }

  // if (requestUsagesClaude35Sonnet.length > 0) {
  //   const totalTokensUsedPerRequest = requestUsagesClaude35Sonnet[0];
  //   if (
  //     totalTokensUsedPerRequest?.totalTokens &&
  //     totalTokensUsedPerRequest?.totalTokens > 500_000 // 2.5$
  //   ) {
  //     isBlock = true;
  //   }
  // }

  if (isBlock) {
    return;
  }

  next();
};
