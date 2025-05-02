import {
  Constructor,
  KeyVariableConfig,
  Package,
} from "@/components/screens/Chat/message/types";
import { TaskIntegrations } from "@/server/convertfox/types";

//edge - platforms can be external (unkonw new kinds.)
export const envsFromTaskIntegrations = (
  taskIntegrations: TaskIntegrations,
  type?: "requiredKeys" | "allKeys" | "botConfig" | "internalKeys"
) => {
  let coreEnvs: string[] | undefined = [];
  try {
    coreEnvs = taskIntegrations?.platforms?.flatMap((platform) =>
      ((platform as any).packageInfo as Package)?.constructors?.flatMap(
        (constructor: Constructor) => {
          if (type === "requiredKeys") {
            return constructor.requiredKeys
              ?.map((key: KeyVariableConfig) => key.key)
              .filter((key: string) => key !== undefined) as string[];
          } else if (type === "internalKeys") {
            return constructor.internalKeys
              ?.map((key: KeyVariableConfig) => key.key)
              .filter((key: string) => key !== undefined) as string[];
          } else if (type === "botConfig") {
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
      )
    );
    console.log(
      "coreEnvs Used",
      coreEnvs?.filter((env) => env !== undefined)
    );
  } catch (error) {
    console.error("Error generating core envs", error);
  }
  return coreEnvs?.filter((env) => env !== undefined);
};
