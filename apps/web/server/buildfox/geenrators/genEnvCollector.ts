import { TokenUsageAnalyticsTracker } from "@/server/analytics/helper";
import {
  extraEnvVariables,
  TaskInstanceMetaType,
} from "@/server/convertfox/types";
import { models } from "@/server/models";
import { StreamingFucntionProps } from "@repo/ai-utils/router";
import { generateObject } from "ai";
import { z } from "zod";
import {
  INTERNAL_TEMPLATE_UPSTASH_ROOT,
  INTERNAL_TEMPLATE_MONGODB_ROOT,
  INTERNAL_TEMPLATE_PLAIN_ROOT,
} from "../tool/writeToFile";
import { readFile } from "fs/promises";
import path from "path";

export const genEnvCollector = async (
  props: StreamingFucntionProps<any, any>,
  envVariablesUsed: string[],
  taskInstanceMeta: TaskInstanceMetaType
) => {
  const templateType = taskInstanceMeta.taskStructure?.templateType ?? "plain";
  let envs = envVariablesUsed;
  let envsJsonParsed: any[] = [];
  try {
    switch (templateType) {
      case "upstash":
        const envsUpstashJson = await readFile(
          path.join(process.cwd(), INTERNAL_TEMPLATE_UPSTASH_ROOT, "envs.json"),
          "utf8"
        );
        envsJsonParsed = JSON.parse(envsUpstashJson);
        break;
      case "mongodb":
        const envsMongodbJson = await readFile(
          path.join(process.cwd(), INTERNAL_TEMPLATE_MONGODB_ROOT, "envs.json"),
          "utf8"
        );
        envsJsonParsed = JSON.parse(envsMongodbJson);
        break;
      case "plain":
        const envsPlainJson = await readFile(
          path.join(process.cwd(), INTERNAL_TEMPLATE_PLAIN_ROOT, "envs.json"),
          "utf8"
        );
        envsJsonParsed = JSON.parse(envsPlainJson);
        break;
      default:
        break;
    }
    console.log(
      "rootEnvs Used",
      envsJsonParsed.map((env) => env.key)
    );
    envs = envs.filter(
      (env) => !envsJsonParsed.some((envJson: any) => envJson.key === env)
    );

    // also filter out the env variables from the taskInstanceMeta.taskIntegrations.platforms.packages
    // NOTE: packageInfo exists even though it is not in type
    let coreEnvs: string[] | undefined = [];
    try {
      coreEnvs = taskInstanceMeta.taskIntegrations?.platforms?.flatMap(
        (platform) =>
          (platform as any).packageInfo?.keysInfo?.map(
            (keyInfo: any) => keyInfo?.key as string
          )
      );
      console.log("coreEnvs Used", coreEnvs);
      envs = envs.filter((env) => !coreEnvs?.includes(env));
    } catch (error) {
      console.error("Error generating core envs", error);
    }

    try {
      props.dataStream.writeMessageAnnotation({
        type: "thinking",
        content: "Thinking about what variables are needed",
      });

      console.log("understanding envs", envs);
      const envExtraInfo = await generateObject({
        model: models.googleGeminiPro,
        schema: z.object({
          envVariables: z.array(extraEnvVariables),
        }),
        system: `You are an expert backend developer`,
        prompt: `
        In order to help build the user's service, you needed the following env variables:
        Env variables: 
        - ${envs.join(", ")}

        Do not include variables that might be a duplicate for theese below:
        - ${coreEnvs?.join(", ")}

        Create a comprehensive information for each env variable, including what it is, why it is needed, how to get it
        There might be some env variables that were duped in the code, do not generate info for them, instead add them to the isSameAs array for the original env which is already in the generated envVariables array
        `,
      });

      TokenUsageAnalyticsTracker.trackUsage({
        ...props.requestBody,
        model: models.googleGeminiPro.modelId,
        usage: envExtraInfo.usage,
      });

      let envVariables = envExtraInfo.object.envVariables;

      envVariables = envVariables.filter((env) => !coreEnvs?.includes(env.env));
      return envVariables;
    } catch (error) {
      console.error("Error generating env collector", error);
      return [];
    }
  } catch (error) {
    console.error("Error generating env collector", error);
    return [];
  }
};
