import {
  codeTemplateType,
  TaskInstanceMetaType,
} from "@/server/convertfox/types";
import { ClientRequest } from "@prisma/client";
import { envsFromTaskIntegrations } from "../helper/coreEnvsFromTaskIntegrations";
import { templateEnvsFromTaskIntegrations } from "../helper/templateEnvsFromTaskIntegrations";
import { prisma } from "@/prisma/prisma";
import { ClientSecretVariable } from "@/server/types";

export const envsPrompt = async (
  clientRequest: ClientRequest,
  taskInstanceMeta: TaskInstanceMetaType,
  files: any[],
  fileType: "lambda" | "cron"
) => {
  let previousEnvs: string[] = [];
  if (
    clientRequest &&
    taskInstanceMeta.taskStructure?.templateType !=
      codeTemplateType.enum.plain_sls
  ) {
    previousEnvs = previousEnvs.concat(
      files.flatMap((file) => (file.meta as any).envVariablesUsed)
    );
  }

  const templateEnvs = await templateEnvsFromTaskIntegrations(
    taskInstanceMeta.taskStructure?.templateType!
  );
  let coreEnvs: string[] = [];
  const requiredEnvs = taskInstanceMeta.taskIntegrations
    ? envsFromTaskIntegrations(
        taskInstanceMeta.taskIntegrations,
        "requiredKeys"
      )
    : [];
  coreEnvs = coreEnvs.concat(requiredEnvs);
  const oauthEnvs = taskInstanceMeta.taskIntegrations
    ? envsFromTaskIntegrations(
        taskInstanceMeta.taskIntegrations,
        "internalKeys"
      )
    : [];
  coreEnvs = coreEnvs.concat(oauthEnvs);
  let configEnvs = taskInstanceMeta.taskIntegrations
    ? envsFromTaskIntegrations(taskInstanceMeta.taskIntegrations, "botConfig")
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
    console.log("configEnvs filtered", configEnvs);
    coreEnvs = coreEnvs.concat(configEnvs);
  }

  previousEnvs = previousEnvs.filter(
    (env) => !templateEnvs.includes(env) && !coreEnvs.includes(env)
  );
  return `
     The following env variables are already present in the project:
            ${templateEnvs.map((env: any) => `- ${env.key}`).join("\n")}
            ${coreEnvs.map((env) => `- ${env}`).join("\n")}
            ${previousEnvs.map((env) => `- ${env}`).join("\n")}

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
               - // Replace this with your personam mail
              - write production ready code, and either create envs for information, or use input parameters or request body from the event object to get theese variables from user side.  

            `;
};
