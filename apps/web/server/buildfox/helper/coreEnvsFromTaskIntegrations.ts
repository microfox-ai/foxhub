import { TaskIntegrations } from "@/server/convertfox/types";

export const coreEnvsFromTaskIntegrations = (
  taskIntegrations: TaskIntegrations
) => {
  let coreEnvs: string[] | undefined = [];
  try {
    coreEnvs = taskIntegrations?.platforms?.flatMap((platform) =>
      (platform as any).packageInfo?.keysInfo?.map(
        (keyInfo: any) => keyInfo?.key as string
      )
    );
    console.log("coreEnvs Used", coreEnvs);
  } catch (error) {
    console.error("Error generating core envs", error);
  }
  return coreEnvs;
};
