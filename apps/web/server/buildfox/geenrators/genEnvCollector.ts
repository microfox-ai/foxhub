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
import {
  addClientSecretToClientRequest,
  clientSecretExists,
  clientSecretExistsInProject,
  createNewClientSecret,
  updateClientSecret,
} from "@/utils/services/db_functions/secrets_helper";
import { ClientRequest, CLIENTSECRETSTATUS } from "@prisma/client";
import { envsFromTaskIntegrations } from "../helper/coreEnvsFromTaskIntegrations";
import { templateEnvsFromTaskIntegrations } from "../helper/templateEnvsFromTaskIntegrations";
import { getClientSecretsFromTemplateEnvs } from "../helper/templateEnvsFromTaskIntegrations";
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
    props.dataStream.writeMessageAnnotation({
      type: "thinking",
      content: "Securely Generating Internal Secrets..",
    });

    // 1. internal envs based on the template.
    templatedEnvs = await templateEnvsFromTaskIntegrations(templateType);
    console.log(
      "rootEnvs Used",
      templatedEnvs.map((env) => env.key)
    );
    const templateSecrets =
      await getClientSecretsFromTemplateEnvs(templateType);

    for (const secret of templateSecrets) {
      const existingClientSecret = await clientSecretExists(
        clientRequest.botProjectId,
        clientRequest.id,
        secret.type
      );
      if (existingClientSecret) {
        // in case if they are updated
        await updateClientSecret(existingClientSecret.id, {
          ...secret,
        });
        await addClientSecretToClientRequest(
          existingClientSecret.id,
          clientRequest.id
        );
      } else {
        await createNewClientSecret({
          ...secret,
          botProjectId: clientRequest.botProjectId,
          userId: clientRequest.userId,
          clientRequestIds: [clientRequest.id],
          clientDeploymentIds: [],
          botConfig: secret.botConfig ?? [],
        });
      }
    }

    // also filter out the env variables from the taskInstanceMeta.taskIntegrations.platforms.packages
    // NOTE: packageInfo exists even though it is not in type
    const coreEnvs = taskInstanceMeta.taskIntegrations
      ? envsFromTaskIntegrations(
          taskInstanceMeta.taskIntegrations,
          "requiredKeys"
        )
      : [];
    const botConfigEnvs = taskInstanceMeta.taskIntegrations
      ? envsFromTaskIntegrations(taskInstanceMeta.taskIntegrations, "botConfig")
      : [];

    // filter out template envs & corepackage based envs - only keep custom envs
    try {
      envs = envs.filter(
        (env) => !templatedEnvs.some((envJson: any) => envJson.key === env)
      );
      envs = envs.filter((env) => !coreEnvs?.includes(env));
      envs = envs.filter((env) => !botConfigEnvs?.includes(env));
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
