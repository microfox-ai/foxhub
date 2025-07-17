import {
  codeTemplateType,
  CodeTemplateType,
} from "@/server/convertfox/helpers/types";
import {
  addClientSecretToClientRequest,
  clientSecretExists,
  createNewClientSecret,
  updateClientSecret,
} from "@/utils/services/db_functions/secrets_helper";
import { ClientRequest, CLIENTSECRETSTATUS } from "@prisma/client";
import upstashEnvs from "../templates/serverless/upstash/envs.json";

export interface InternalTemplateEnv {
  key: string;
  package: string;
  value: string;
  description?: string;
  constructorFunction: string;
  isOptional?: boolean;
}

export const templateEnvsFromTaskIntegrations = async (
  template_type: CodeTemplateType,
  clientRequest: ClientRequest
) => {
  let templatedEnvs: InternalTemplateEnv[] = [];
  if (template_type === codeTemplateType.enum.upstash_sls) {
    templatedEnvs = upstashEnvs;
  }
  if (clientRequest.id) {
    templatedEnvs.push({
      key: "MICROFOX_CLIENT_REQUEST_ID",
      package: "ids-internal",
      constructorFunction: "microfox",
      value: clientRequest.id,
      isOptional: false,
    });
  }
  if (clientRequest.botProjectId) {
    templatedEnvs.push({
      key: "MICROFOX_BOT_PROJECT_ID",
      package: "ids-internal",
      constructorFunction: "microfox",
      value: clientRequest.botProjectId,
      isOptional: false,
    });
  }
  if (process.env.MICROFOX_REDIS_URL_TRACKER) {
    templatedEnvs.push({
      key: "MICROFOX_REDIS_URL_TRACKER",
      package: "ids-internal",
      constructorFunction: "microfox",
      value: process.env.MICROFOX_REDIS_URL_TRACKER,
      isOptional: false,
    });
  }
  if (process.env.MICROFOX_REDIS_TOKEN_TRACKER) {
    templatedEnvs.push({
      key: "MICROFOX_REDIS_TOKEN_TRACKER",
      package: "ids-internal",
      constructorFunction: "microfox",
      value: process.env.MICROFOX_REDIS_TOKEN_TRACKER,
      isOptional: false,
    });
  }
  if (process.env.TASK_API_PROTECTION_KEY) {
    templatedEnvs.push({
      key: "TASK_API_PROTECTION_KEY",
      package: "ids-internal",
      constructorFunction: "microfox",
      value: process.env.TASK_API_PROTECTION_KEY,
      isOptional: false,
    });
  }
  if (process.env.TASK_API_BASE_URL) {
    templatedEnvs.push({
      key: "TASK_API_BASE_URL",
      package: "ids-internal",
      constructorFunction: "microfox",
      value: process.env.TASK_API_BASE_URL,
      isOptional: false,
    });
  }
  return templatedEnvs as InternalTemplateEnv[];
};

export const getClientSecretsFromTemplateEnvs = async (
  template_type: CodeTemplateType,
  clientRequest: ClientRequest
) => {
  const templatedEnvs = await templateEnvsFromTaskIntegrations(
    template_type,
    clientRequest
  );
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

  // // add some root envs
  // templateSecrets.push({
  //   packageType: "template",
  //   packageName: "ids-internal",
  //   packageConstructor: "microfox",
  //   type: "ids-internal/microfox",
  //   variables: [
  //     {
  //       key: "MICROFOX_CLIENT_REQUEST_ID",
  //       value: clientRequest.id,
  //       isOptional: false,
  //     },
  //     {
  //       key: "MICROFOX_BOT_PROJECT_ID",
  //       value: clientRequest.botProjectId,
  //       isOptional: false,
  //     },
  //     {
  //       key: "MICROFOX_REDIS_URL_TRACKER",
  //       value: process.env.MICROFOX_REDIS_URL_TRACKER,
  //       isOptional: false,
  //     },
  //     {
  //       key: "MICROFOX_REDIS_TOKEN_TRACKER",
  //       value: process.env.MICROFOX_REDIS_TOKEN_TRACKER,
  //       isOptional: false,
  //     },
  //   ],
  //   status: CLIENTSECRETSTATUS.FILLED,
  //   name: "ids-internal/microfox",
  //   botConfig: [],
  //   isHidden: true,
  // });

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
        tokenResponse: {},
      });
    }
  }
};
