import { CodeTemplateType, TaskIntegrations } from "@/server/convertfox/types";
import { fetchTemplateDir } from "../tool/writeToFile";
import path from "path";
import { readFile } from "fs/promises";
import { ClientRequest, CLIENTSECRETSTATUS } from "@prisma/client";
import { createNewClientSecret } from "@/utils/services/db_functions/secrets_helper";
import { addClientSecretToClientRequest } from "@/utils/services/db_functions/secrets_helper";
import { updateClientSecret } from "@/utils/services/db_functions/secrets_helper";
import { clientSecretExists } from "@/utils/services/db_functions/secrets_helper";

export interface InternalTemplateEnv {
  key: string;
  package: string;
  value: string;
  description: string;
  constructorFunction: string;
}

export const templateEnvsFromTaskIntegrations = async (
  template_type: CodeTemplateType
) => {
  const envsJSON = await readFile(
    path.join(process.cwd(), fetchTemplateDir(template_type), "envs.json"),
    "utf8"
  );
  const templatedEnvs = JSON.parse(envsJSON);
  return templatedEnvs;
};

export const getClientSecretsFromTemplateEnvs = async (
  template_type: CodeTemplateType,
  clientRequest: ClientRequest
) => {
  const templatedEnvs = await templateEnvsFromTaskIntegrations(template_type);
  const packageBasedEnvs: Record<
    string,
    { variables: any[]; constructorFunction: string }
  > = {};

  // 2. filter templatedEnvs based on the package.
  templatedEnvs.forEach((_env: InternalTemplateEnv) => {
    if (packageBasedEnvs[_env.package]) {
      packageBasedEnvs[_env.package]?.variables?.push(_env);
    } else {
      packageBasedEnvs[_env.package] = {
        variables: [_env],
        constructorFunction: _env.constructorFunction,
      };
    }
  });

  const templateSecrets = [];

  // add respective clientSecrets for each templateEnv
  for (const [packageName, packageEnvs] of Object.entries(packageBasedEnvs)) {
    templateSecrets.push({
      packageType: "template",
      packageName: packageName,
      packageConstructor: packageEnvs.constructorFunction,
      type: `${packageName}/${packageEnvs.constructorFunction}`,
      variables: packageEnvs.variables.map((env) => ({
        key: env.key,
        value: env.value,
        //mode: ["DEV", "PROD", "STAGING"],
        isOptional: false,
      })),
      status: CLIENTSECRETSTATUS.FILLED,
      name: `${packageName}/${packageEnvs.constructorFunction}`,
      botConfig: [],
      isHidden: true,
    });
  }

  // add some root envs
  templateSecrets.push({
    packageType: "template",
    packageName: "ids-internal",
    packageConstructor: "microfox",
    type: "ids-internal/microfox",
    variables: [
      {
        key: "MICROFOX_CLIENT_REQUEST_ID",
        value: clientRequest.id,
        isOptional: false,
      },
      {
        key: "MICROFOX_BOT_PROJECT_ID",
        value: clientRequest.botProjectId,
        isOptional: false,
      },
      {
        key: "MICROFOX_REDIS_URL_TRACKER",
        value: process.env.MICROFOX_REDIS_URL_TRACKER,
        isOptional: false,
      },
      {
        key: "MICROFOX_REDIS_TOKEN_TRACKER",
        value: process.env.MICROFOX_REDIS_TOKEN_TRACKER,
        isOptional: false,
      },
    ],
    status: CLIENTSECRETSTATUS.FILLED,
    name: "ids-internal/microfox",
    botConfig: [],
    isHidden: true,
  });

  return templateSecrets;
};

export const addTemplateSecretsToClientRequest = async (
  clientRequest: ClientRequest,
  templateSecrets: any[]
) => {
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
        isHidden: true,
      });
    }
  }
};
