import {
  codeTemplateType,
  TaskInstanceMetaType,
} from "@/server/convertfox/types";
import { ClientRequest, ClientSecret } from "@prisma/client";
import {
  envsFromTaskIntegrations,
  getPackageInfosFromTaskIntegrations,
} from "../helper/coreEnvsFromTaskIntegrations";
import {
  InternalTemplateEnv,
  templateEnvsFromTaskIntegrations,
} from "../helper/templateEnvsFromTaskIntegrations";
import { prisma } from "@/prisma/prisma";
import { ClientSecretVariable } from "@/server/types";

export const envsPrompt = async (
  clientRequest: ClientRequest,
  clientSecrets: ClientSecret[],
  taskInstanceMeta: TaskInstanceMetaType,
  files: any[],
  fileType: "lambda" | "cron" | "helper"
) => {
  let previousEnvs: string[] = [];
  if (
    clientRequest &&
    taskInstanceMeta.taskStructure?.templateType !=
      codeTemplateType.enum.upstash_sls
  ) {
    previousEnvs = previousEnvs.concat(
      files.flatMap((file) => (file.meta as any).envVariablesUsed)
    );
  }

  const templateEnvs = await templateEnvsFromTaskIntegrations(
    taskInstanceMeta.taskStructure?.templateType!,
    clientRequest
  );
  const packages = await getPackageInfosFromTaskIntegrations(
    taskInstanceMeta.taskIntegrations
  );
  let coreEnvs: string[] = [];
  const requiredEnvs = taskInstanceMeta.taskIntegrations
    ? envsFromTaskIntegrations({
        taskIntegrations: taskInstanceMeta.taskIntegrations,
        type: "requiredKeys",
        packages: packages,
        selectedConstructors: clientSecrets?.map((secret) => secret.type),
      })
    : [];
  coreEnvs = coreEnvs.concat(requiredEnvs);
  const oauthEnvs = taskInstanceMeta.taskIntegrations
    ? envsFromTaskIntegrations({
        taskIntegrations: taskInstanceMeta.taskIntegrations,
        type: "internalKeys",
        packages: packages,
        selectedConstructors: clientSecrets?.map((secret) => secret.type),
      })
    : [];
  coreEnvs = coreEnvs.concat(oauthEnvs);
  let configEnvs = taskInstanceMeta.taskIntegrations
    ? envsFromTaskIntegrations({
        taskIntegrations: taskInstanceMeta.taskIntegrations,
        type: "botConfig",
        packages: packages,
        selectedConstructors: clientSecrets?.map((secret) => secret.type),
      })
    : [];

  // ONLY ADD THOSE CONFIG ENVS THAT ARE FILLED (SKIP UNFILLED)
  if (
    configEnvs.length > 0 &&
    clientRequest &&
    clientRequest?.mentionedClientSecretIds?.length > 0
  ) {
    const clientSecrets = await prisma.clientSecret.findMany({
      where: {
        id: {
          in: clientRequest?.mentionedClientSecretIds,
        },
      },
    });
    const filletBotConfig: ClientSecretVariable[] = clientSecrets.flatMap(
      (secret) => secret.botConfig
    ) as any[];
    configEnvs = configEnvs.filter(
      (env) =>
        filletBotConfig.find(
          (c) => c && c.key === env && c.value != undefined && c.value != null
        ) != undefined
    );
    //console.log("configEnvs filtered", configEnvs);
    coreEnvs = coreEnvs.concat(configEnvs);
  }

  previousEnvs = previousEnvs.filter(
    (env) =>
      !templateEnvs.some((envJson: InternalTemplateEnv) => envJson.key === env)
  );

  return `
     The following env variables are already present in the project:
            ${templateEnvs.map((env: any) => `- ${env.key}`).join("\n")}
            ${coreEnvs
              ?.filter((env) => env != undefined)
              .map((env) => `- ${env}`)
              .join("\n")}
            ${previousEnvs
              ?.filter((env) => env != undefined)
              .map((env) => `- ${env}`)
              .join("\n")}

            ${
              /** TODO: this requires improving because cron would still add new variables, as it doesnt have a way to collect them,  so use redis as env var storage across all functions */
              fileType === "cron"
                ? "if new env variables are needed, other than theese, you can add them to the project."
                : `
              if new variables are needed, other than those above, add new env variables in the same format as above, 
              or use queryStringparameters or even body from the incoming aws event object 
              to get theese variables from user side.
  
              input request body or query parameters are preferred over process.env variables.
  
              for example:
                process.env.VARIABLE_NAME should be avoided,
              and instead
                const body = event.body ? JSON.parse(event.body) : {};
                const { variableName } = body;
              should be used.
              `
            }
              only create/use process.env variables, if absolutely needed security wise, or if this is a cron job where request body is not available
              otherwise use input parameters or request body from the event object to get theese variables from user side.
  
              You MUST NOT WRITE MOCK CODE or placeholders, it should be production ready code.
              - DO NOT write like this:
               - // Replace this with your personam mail.
              - write PRODUCTION READY code,

              CRITICAL:
              Always try to use queryStringparameters or body from the event object to get theese variables instead of ENV variables (as long as its not a cron job).
              Though, if the variables are accessTokens or clientIds, clientSecrets or ApiKeys, then use the process.env variables.
            `;
};

// - DO NOT self assume or hard code variables in the code
// - create envs for information that is variable or you dont have access to yet
