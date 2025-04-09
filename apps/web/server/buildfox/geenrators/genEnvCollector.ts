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
  fetchTemplateRoot,
} from "../tool/writeToFile";
import { readFile } from "fs/promises";
import { createClientSecret } from "@/utils/services/db_functions/createClientSecret";
import { ClientRequest } from "@prisma/client";
import { coreEnvsFromTaskIntegrations } from "../helper/coreEnvsFromTaskIntegrations";
import { templateEnvsFromTaskIntegrations } from "../helper/templateEnvsFromTaskIntegrations";

export const genEnvCollector = async (
  props: StreamingFucntionProps<any, any>,
  envVariablesUsed: string[],
  taskInstanceMeta: TaskInstanceMetaType,
  clientRequest: ClientRequest
) => {
  const templateType = taskInstanceMeta.taskStructure?.templateType ?? "plain";
  let envs = envVariablesUsed;
  let templatedEnvs: any[] = [];
  try {
    templatedEnvs = await templateEnvsFromTaskIntegrations(templateType);
    console.log(
      "rootEnvs Used",
      templatedEnvs.map((env) => env.key)
    );
    envs = envs.filter(
      (env) => !templatedEnvs.some((envJson: any) => envJson.key === env)
    );

    const packageBasedEnvs: Record<
      string,
      { variables: any[]; constructorFunction: string }
    > = {};
    templatedEnvs.forEach(
      (_env: {
        key: string;
        package: string;
        value: string;
        description: string;
        constructorFunction: string;
      }) => {
        if (packageBasedEnvs[_env.package]) {
          packageBasedEnvs[_env.package]?.variables?.push(_env);
        } else {
          packageBasedEnvs[_env.package] = {
            variables: [_env],
            constructorFunction: _env.constructorFunction,
          };
        }
      }
    );

    // add respective clientSecrets for each templateEnv
    for (const [packageName, packageEnvs] of Object.entries(packageBasedEnvs)) {
      const clientSecret = await createClientSecret({
        botProjectId: clientRequest.botProjectId,
        userId: clientRequest.userId,
        type: `${packageName}/${packageEnvs.constructorFunction}`,
        variables: packageEnvs.variables.map((env) => ({
          key: env.key,
          value: env.value,
          //mode: ["DEV", "PROD", "STAGING"],
          isOptional: false,
        })),
        name: `${packageName}/${packageEnvs.constructorFunction}`,
        clientRequestId: clientRequest.id,
      });
      console.log("clientSecret-created", clientSecret);
    }

    // also filter out the env variables from the taskInstanceMeta.taskIntegrations.platforms.packages
    // NOTE: packageInfo exists even though it is not in type
    const coreEnvs = taskInstanceMeta.taskIntegrations
      ? coreEnvsFromTaskIntegrations(taskInstanceMeta.taskIntegrations)
      : [];
    try {
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
