import { prisma } from "@/prisma/prisma";
import { ClientRequest, ClientSecret } from "@prisma/client";
import { ClientSecretVariable } from "../../types";
import { AuthObject, AuthOptions } from "@microfox/tool-kit";
import { HitlAuthObject } from "../../../components/screens/Chat/message/uiTool/mappers/uiTool";
import { Bot } from "@/components/screens/mybots/providers/types";
import { templateEnvsFromTaskIntegrations } from "@/server/buildfox/helper/templateEnvsFromTaskIntegrations";
import { codeTemplateType } from "@/server/convertfox/helpers/types";
import { UIMessage } from "ai";
import { PackageInfoHelper } from "@/utils/services/embeddings/packageSearch";

export const fetchSecretVariables = (
  secret: ClientSecret
): { key: string; value: string }[] => {
  let _variables: { key: string; value: string }[] = [];
  const variables = (secret.variables as any[])?.map(
    (v: ClientSecretVariable) => ({
      key: v.key,
      value: v.value ?? v.defaultValue,
    })
  );
  _variables = _variables.concat(variables);
  const botCOnfigs = (secret.botConfig as any[])?.map(
    (bc: ClientSecretVariable) => {
      return {
        key: bc.key,
        value: bc.value ?? bc.defaultValue,
      };
    }
  );
  _variables = _variables.concat(botCOnfigs);
  return _variables;
};

const getUniqueId = (secret: ClientSecret) => {
  return `${secret.botProjectId}-${secret.identityOrgId}-${secret.identityTeamId}-${secret.identityUserId}-${secret.packageType}-${secret.packageName}-${secret.packageConstructor}`;
};

export const clubUniqueBots = (secrets: Bot[]) => {
  //console.log("secrets", secrets);
  const uniqueClubbedSecretsMap = secrets
    .sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    )
    .reduce(
      (acc, secret) => {
        const uniqueId = `${secret.botProjectId}-${secret.identityOrgId}-${secret.identityTeamId}-${secret.identityUserId}-${secret.packageType}-${secret.packageName}-${secret.packageConstructor}`;
        // if (secret.identityMetadata) {
        //   console.log("secret.identityMetadata", secret);
        // }
        if (!acc[uniqueId]) {
          acc[uniqueId] = secret;
        }
        return acc;
      },
      {} as Record<string, ClientSecret>
    );
  return Object.values(uniqueClubbedSecretsMap).map((s) => {
    let alternatives = secrets.filter((ms) => ms.id !== s.id);
    alternatives = alternatives.filter((a) => {
      const uniqueId = `${a.botProjectId}-${a.identityOrgId}-${a.identityTeamId}-${a.identityUserId}-${a.packageType}-${a.packageName}-${a.packageConstructor}`;
      const mainUniqueId = `${s.botProjectId}-${s.identityOrgId}-${s.identityTeamId}-${s.identityUserId}-${s.packageType}-${s.packageName}-${s.packageConstructor}`;
      return uniqueId === mainUniqueId;
    });

    return {
      main: s as Bot,
      alternatives: alternatives,
    };
  });
};

const pickSecrets = (
  secrets: ClientSecret[],
  clientRequest?: ClientRequest | null,
  userId?: string
) => {
  //console.log("total secrets found", secrets.length);
  const uniqueClubbedSecretsMap = secrets
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
    .reduce(
      (acc, secret) => {
        const uniqueId = `${secret.botProjectId}-${secret.identityOrgId}-${secret.identityTeamId}-${secret.identityUserId}-${secret.packageType}-${secret.packageName}-${secret.packageConstructor}`;
        //console.log("uniqueId", uniqueId);
        if (!acc[uniqueId]) {
          acc[uniqueId] = { ...secret, variables: [], botConfig: [] };
        }
        return acc;
      },
      {} as Record<string, ClientSecret>
    );
  const uniqueClubbedSecrets = Object.values(uniqueClubbedSecretsMap);
  //console.log("unique clubbed secrets", uniqueClubbedSecrets.length);
  if (uniqueClubbedSecrets.length < 1) {
    throw new Error("Unique clubbing Error");
  }
  const clientRequestPickedSecret = uniqueClubbedSecrets.find((s) =>
    s.clientRequestIds.includes(clientRequest?.id ?? "")
  );
  const userIdPickedSecret = uniqueClubbedSecrets.find(
    (s) => s.userId === userId
  );
  return {
    uniqueClubbedSecrets,
    pickedSecret:
      clientRequestPickedSecret ??
      userIdPickedSecret ??
      (uniqueClubbedSecrets[0] as ClientSecret),
  };
};

export const cleanSecretsForAuthObject = (authObject: AuthObject) => {
  const output = { ...authObject };
  for (const secret of output?.secrets) {
    secret.secrets = secret.secrets.map((s: ClientSecret) => {
      return {
        ...s,
        variables: [],
        botConfig: [],
      };
    });
  }
  output.encryptionKey = "REDACTED";
  output.variables = [];
  return output;
};

export const getVariablesForAuthObject = async (
  authObject: AuthObject,
  {
    clientRequest,
    refetchFromDb,
    extraVariables,
  }: {
    clientRequest?: ClientRequest;
    refetchFromDb?: boolean;
    extraVariables?: Record<string, string>;
  }
) => {
  const output = { ...authObject };
  if (output.secrets) {
    for (const secret of output?.secrets) {
      if (secret.selectedSecretId) {
        let selectedSecret = secret.secrets.find(
          (s: ClientSecret) => s.id === secret.selectedSecretId
        );
        if (refetchFromDb) {
          selectedSecret = await prisma.clientSecret.findUnique({
            where: { id: secret.selectedSecretId, status: "FILLED" },
          });
        }
        if (selectedSecret) {
          const selectedSecretVariables = fetchSecretVariables(selectedSecret);
          output.variables =
            output.variables?.concat(selectedSecretVariables) ??
            selectedSecretVariables;
        }
      }
      //if (secret.)
    }
  }
  if (output.customSecrets) {
    for (const secret of output.customSecrets) {
      if (process.env?.[secret.key]) {
        output.variables?.push({
          key: secret.key,
          value: process.env[secret.key] ?? "",
        });
      }
    }
  }
  if (clientRequest) {
    const envs = await templateEnvsFromTaskIntegrations(
      codeTemplateType.enum.upstash_sls,
      clientRequest,
      extraVariables
    );
    output.variables = output.variables?.concat(envs) ?? envs;
  }
  output.encryptionKey = process.env.OPEN_API_ENCRYPTION_KEY ?? "";
  return output;
};

export const fetchAuthSecrets = async (
  options: AuthOptions,
  configuration: {
    clientRequest?: ClientRequest | null;
    userId?: string;
    fillEncryptionKey?: boolean;
    fillVariables?: boolean;
  }
): Promise<AuthObject> => {
  if (!options.packages && !options.customSecrets) {
    return {
      encryptionKey: configuration.fillEncryptionKey
        ? (process.env.OPEN_API_ENCRYPTION_KEY ?? "")
        : "",
      variables: [],
    };
  }

  const output: HitlAuthObject = {
    variables: [],
    encryptionKey: configuration.fillEncryptionKey
      ? (process.env.OPEN_API_ENCRYPTION_KEY ?? "")
      : "",
    secrets: [],
  };

  if (options.customSecrets) {
    for (const secret of options.customSecrets) {
      output.customSecrets?.push(secret);
      if (process.env?.[secret.key]) {
        output.variables?.push({
          key: secret.key,
          value: process.env[secret.key] ?? "",
        });
      }
    }
  }

  if (options.packages) {
    // check if package is even needs the secrets (by check the package-info)
    const packageInfosPromise = PackageInfoHelper.getPackageInfos(
      options.packages.map((p) => p.packageName)
    );
    const dbSecretsPromise = prisma.clientSecret.findMany({
      where: {
        packageName: {
          in: options.packages?.map((p) => p.packageName) ?? [],
        },
        status: "FILLED",
        ...(configuration.clientRequest
          ? { botProjectId: configuration.clientRequest.botProjectId }
          : {}),
        ...(configuration.userId ? { userId: configuration.userId } : {}),
      },
      orderBy: {
        updatedAt: "desc",
      },
    });
    const [packageInfos, dbSecrets] = await Promise.all([
      packageInfosPromise,
      dbSecretsPromise,
    ]);
    const finalPackages = options.packages.filter((p) => {
      const packageInfo = packageInfos.find((pi) => pi.name === p.packageName);
      const reqVariables: any[] | undefined = packageInfo?.constructors?.reduce(
        (acc, c) => {
          if (
            c.auth === "oauth2" &&
            c.internalKeys &&
            c.internalKeys?.length > 0
          ) {
            acc = acc.concat(c.internalKeys);
          }
          if (
            c.auth === "apikey" &&
            c.requiredKeys &&
            c.requiredKeys?.length > 0
          ) {
            acc = acc.concat(c.requiredKeys);
          }
          return acc;
        },
        [] as any[]
      );
      return reqVariables && reqVariables.length > 0;
    });

    for (const _package of options.packages) {
      const _secrets = dbSecrets.filter(
        (s) => s.packageName === _package.packageName
      );
      if (!finalPackages.find((p) => p.packageName === _package.packageName)) {
        output?.secrets?.push({
          packageName: _package.packageName,
          packageConstructor: _package.packageConstructor,
          isAuthNeeded: false,
          selectedSecretId: undefined,
          secrets: [],
        });
        continue;
      }
      if (_secrets.length > 0 && _secrets[0]?.id) {
        const { pickedSecret, uniqueClubbedSecrets } = pickSecrets(
          _secrets,
          configuration.clientRequest,
          configuration.userId
        );
        const variables = fetchSecretVariables(pickedSecret);
        output?.secrets.push({
          packageName: _package.packageName,
          packageConstructor: _package.packageConstructor,
          selectedSecretId: pickedSecret.id,
          secrets: uniqueClubbedSecrets,
          isAuthNeeded: true,
        });
        output.variables = output.variables?.concat(variables) ?? variables;
      } else {
        output?.secrets.push({
          packageName: _package.packageName,
          packageConstructor: _package.packageConstructor,
          selectedSecretId: undefined,
          secrets: [],
          isAuthNeeded: true,
        });
      }
    }
  }
  if (!configuration.fillVariables) {
    output.variables = [];
  }
  return output;
};

export const replaceVariables = (
  variables: { key: string; value: string }[],
  secret: ClientSecret
) => {
  const new_variables = fetchSecretVariables(secret);
  let cleaned_variables = variables.filter(
    (v) => !new_variables.find((nv) => nv.key === v.key)
  );
  cleaned_variables = cleaned_variables.concat(new_variables);
  return cleaned_variables;
};

export const removeVariables = (
  variables: { key: string; value: string }[],
  secret: ClientSecret
) => {
  const new_variables = fetchSecretVariables(secret);
  return variables.filter((v) => !new_variables.find((nv) => nv.key === v.key));
};

// for each package, pick one client secret (EXACTCONSTRUCTORMATCH  if given & then clientREQUESTIDS)
// show UI to user so he can select if needed. (only show if it is needed to be shown - like template apikeys might not needed to be shown. )
