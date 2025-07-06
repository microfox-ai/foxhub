import { prisma } from "@/prisma/prisma";
import { ClientRequest, ClientSecret } from "@prisma/client";
import { ClientSecretVariable } from "../types";
import { AuthObject, AuthOptions } from "@microfox/tool-kit";
import { HitlAuthObject } from "../ui/uiTool";
import { Bot } from "@/components/screens/mybots/providers/types";

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
          acc[uniqueId] = secret;
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

export const fetchAuthSecrets = async (
  options: AuthOptions,
  clientRequest?: ClientRequest | null,
  userId?: string,
  fillEncryptionKey?: boolean
): Promise<AuthObject> => {
  if (!options.packages) {
    return {
      encryptionKey: fillEncryptionKey
        ? (process.env.OPEN_API_ENCRYPTION_KEY ?? "")
        : "",
      variables: [],
    };
  }
  const dbSecrets = await prisma.clientSecret.findMany({
    where: {
      packageName: {
        in: options.packages?.map((p) => p.packageName) ?? [],
      },
      ...(clientRequest ? { botProjectId: clientRequest.botProjectId } : {}),
      ...(userId ? { userId: userId } : {}),
    },
    orderBy: {
      updatedAt: "desc",
    },
  });
  const output: HitlAuthObject = {
    variables: [],
    encryptionKey: fillEncryptionKey
      ? (process.env.OPEN_API_ENCRYPTION_KEY ?? "")
      : "",
    secrets: [],
  };
  for (const _package of options.packages) {
    const _secrets = dbSecrets.filter(
      (s) => s.packageName === _package.packageName
    );
    if (_secrets.length > 0 && _secrets[0]?.id) {
      const { pickedSecret, uniqueClubbedSecrets } = pickSecrets(
        _secrets,
        clientRequest,
        userId
      );
      const variables = fetchSecretVariables(pickedSecret);
      output.secrets.push({
        packageName: _package.packageName,
        packageConstructor: _package.packageConstructor,
        selectedSecretId: pickedSecret.id,
        secrets: uniqueClubbedSecrets,
      });
      output.variables = output.variables?.concat(variables) ?? variables;
    } else {
      output.secrets.push({
        packageName: _package.packageName,
        packageConstructor: _package.packageConstructor,
        selectedSecretId: undefined,
        secrets: [],
      });
    }
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
