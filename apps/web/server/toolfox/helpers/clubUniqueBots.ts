import { Bot } from "@/components/screens/mybots/providers/types";
import { ClientSecret } from "@prisma/client";

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
