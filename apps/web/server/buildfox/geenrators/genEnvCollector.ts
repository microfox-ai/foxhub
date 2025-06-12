import { TokenUsageAnalyticsTracker } from "@/server/analytics/helper";
import {
  codeTemplateType,
  extraEnvVariables,
  TaskInstanceMetaType,
} from "@/server/convertfox/types";
import { models } from "@/server/models";
import { ClientRequest } from "@prisma/client";
import { StreamingFucntionProps } from "@repo/ai-utils/router";
import { generateObject } from "ai";
import { z } from "zod";
import {
  envsFromTaskIntegrations,
  getPackageInfosFromTaskIntegrations,
} from "../helper/coreEnvsFromTaskIntegrations";
import {
  addTemplateSecretsToClientRequest,
  getClientSecretsFromTemplateEnvs,
  templateEnvsFromTaskIntegrations,
} from "../helper/templateEnvsFromTaskIntegrations";

const IGNORE_ENVS = ["IS_OFFLINE", "SERVERLESS_OFFLINE"];

export const genEnvCollector = async (
  props: StreamingFucntionProps<any, any>,
  envVariablesUsed: string[],
  taskInstanceMeta: TaskInstanceMetaType,
  clientRequest: ClientRequest
) => {
  const templateType =
    taskInstanceMeta.taskStructure?.templateType ??
    codeTemplateType.enum.upstash_sls;
  let envs = envVariablesUsed;
  let templatedEnvs: any[] = [];
  try {
    props.dataStream.writeMessageAnnotation({
      type: "thinking",
      content: "Securely Generating Internal Secrets..",
    });

    // 1. internal envs based on the template.
    templatedEnvs = await templateEnvsFromTaskIntegrations(
      templateType,
      clientRequest
    );
    console.log(
      "rootEnvs Used",
      templatedEnvs.map((env) => env.key)
    );

    // create secrets that need to be added to the clientRequest
    const templateSecrets = await getClientSecretsFromTemplateEnvs(
      templateType,
      clientRequest
    );
    // add the secrets to the clientRequest
    await addTemplateSecretsToClientRequest(clientRequest, templateSecrets);

    const packages = await getPackageInfosFromTaskIntegrations(
      taskInstanceMeta.taskIntegrations
    );
    // also filter out the env variables from the taskInstanceMeta.taskIntegrations.platforms.packages
    // NOTE: packageInfo exists even though it is not in type
    const coreEnvs = taskInstanceMeta.taskIntegrations
      ? envsFromTaskIntegrations({
          taskIntegrations: taskInstanceMeta.taskIntegrations,
          type: "requiredKeys",
          packages,
        })
      : [];
    const botConfigEnvs = taskInstanceMeta.taskIntegrations
      ? envsFromTaskIntegrations({
          taskIntegrations: taskInstanceMeta.taskIntegrations,
          type: "botConfig",
          packages,
        })
      : [];
    const oauthEnvs = taskInstanceMeta.taskIntegrations
      ? envsFromTaskIntegrations({
          taskIntegrations: taskInstanceMeta.taskIntegrations,
          type: "internalKeys",
          packages,
        })
      : [];

    // filter out template envs & corepackage based envs - only keep custom envs
    try {
      envs = envs.filter(
        (env) => !templatedEnvs.some((envJson: any) => envJson.key === env)
      );
      envs = envs.filter((env) => !coreEnvs?.includes(env));
      envs = envs.filter((env) => !botConfigEnvs?.includes(env));
      envs = envs.filter((env) => !oauthEnvs?.includes(env));
      envs = envs.filter((env) => !IGNORE_ENVS?.includes(env));
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
          envVariables: z.array(extraEnvVariables.omit({ ui: true })),
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
