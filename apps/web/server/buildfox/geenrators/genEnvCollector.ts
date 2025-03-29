import { TokenUsageAnalyticsTracker } from "@/server/analytics/helper";
import { extraEnvVariables } from "@/server/convertfox/types";
import { models } from "@/server/models";
import { StreamingFucntionProps } from "@repo/ai-utils/router";
import { generateObject } from "ai";
import { z } from "zod";

export const genEnvCollector = async (
  props: StreamingFucntionProps<any, any>,
  envVariablesUsed: string[]
) => {
  try {
    props.dataStream.writeMessageAnnotation({
      type: "thinking",
      content: "Thinking about what variables are needed",
    });

    const envExtraInfo = await generateObject({
      model: models.googleGeminiPro,
      schema: z.object({
        envVariables: z.array(extraEnvVariables),
      }),
      system: `You are an expert backend developer`,
      prompt: `
        In order to help build the user's service, you needed the following env variables:
        Env variables: ${envVariablesUsed.join(", ")}
        Create a comprehensive information for each env variable, including what it is, why it is needed, how to get it
        There might be some env variables that were duped in the code, do not generate info for them, instead add them to the isSameAs array for the original env which is already in the generated envVariables array
        `,
    });

    TokenUsageAnalyticsTracker.trackUsage({
      ...props.requestBody,
      model: models.googleGeminiPro.modelId,
      usage: envExtraInfo.usage,
    });

    const envVariables = envExtraInfo.object.envVariables;

    return envVariables;
  } catch (error) {
    console.error("Error generating env collector", error);
    return [];
  }
};
