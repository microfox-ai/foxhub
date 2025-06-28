import {
  Constructor,
  KeyVariableConfig,
  Package,
} from "@/components/screens/Chat/message/types";
import { PackageStatus } from "@/server/types";
import { TaskIntegrations } from "@/server/convertfox/helpers/types";
import { PackageInfoHelper } from "@/utils/services/embeddings/packageSearch";

export const getPackageInfosFromTaskIntegrations = async (
  taskIntegrations?: TaskIntegrations
) => {
  if (!taskIntegrations) return [];
  const packages = await PackageInfoHelper.getPackageInfos(
    taskIntegrations?.platforms?.map((platform) => platform.package ?? "") ?? []
  );
  return packages;
};

//edge - platforms can be external (unkonw new kinds.)
export const envsFromTaskIntegrations = (props: {
  taskIntegrations: TaskIntegrations;
  type?: "requiredKeys" | "allKeys" | "botConfig" | "internalKeys";
  selectedConstructors?: string[];
  packages?: Package[];
}) => {
  let coreEnvs: string[] | undefined = [];
  try {
    coreEnvs = props.taskIntegrations?.platforms?.flatMap((platform) => {
      const packageInfo = props.packages?.find(
        (pkg) => pkg.name === platform.package
      );
      const allInfoKeys = packageInfo?.constructors?.flatMap(
        (constructor: Constructor) => {
          if (
            props.selectedConstructors &&
            !props.selectedConstructors.includes(
              packageInfo?.name + "/" + constructor.name
            )
          ) {
            return [];
          }
          if (props.type === "requiredKeys") {
            return constructor.requiredKeys
              ?.map((key: KeyVariableConfig) => key.key)
              .filter((key: string) => key !== undefined) as string[];
          } else if (props.type === "internalKeys") {
            return constructor.internalKeys
              ?.map((key: KeyVariableConfig) => key.key)
              .filter((key: string) => key !== undefined) as string[];
          } else if (props.type === "botConfig") {
            return constructor.botConfig
              ?.map((key: KeyVariableConfig) => key.key)
              .filter((key: string) => key !== undefined) as string[];
          } else {
            const allKeys = [
              ...(constructor.requiredKeys?.map(
                (key: KeyVariableConfig) => key.key
              ) ?? []),
              ...(constructor.internalKeys?.map(
                (key: KeyVariableConfig) => key.key
              ) ?? []),
              ...(constructor.botConfig?.map(
                (key: KeyVariableConfig) => key.key
              ) ?? []),
            ].filter((key: string) => key !== undefined) as string[];
            return allKeys;
          }
        }
      );
      if (allInfoKeys && allInfoKeys?.length > 0) {
        return allInfoKeys;
      }
      return [];
    });
  } catch (error) {
    console.error("Error generating core envs", error);
  }
  return coreEnvs?.filter((env) => env !== undefined);
};
