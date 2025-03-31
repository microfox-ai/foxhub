import { TaskInstanceMetaType } from "@/server/convertfox/types";
import dayjs from "dayjs";
export const generateStatsReport = (taskInstanceMeta: TaskInstanceMetaType) => {
  const { buildingStep, taskStructure } = taskInstanceMeta;

  const packagesAll = buildingStep?.files.flatMap(
    (file: any) => (file.meta?.packagesUsed as string[]) ?? []
  );
  const packagesUnique = [...new Set(packagesAll)];

  return `
  ## Stats
  Endpoints: ${taskStructure?.lambdaFunctions?.length}
  Cron Jobs: ${taskStructure?.cronJobs?.length}
  Total files written: ${buildingStep?.files.length}
  Total Time Taken for code generation: ${dayjs(buildingStep?.endTime).diff(dayjs(buildingStep?.startTime), "minutes")} minutes
  Packages used: ${packagesUnique.join(", ")}
  Env Variables: ${buildingStep?.envVariablesUsed?.join(", ")}
  Total tokens used: <--have yet to add this-->
  Total cost: <--have yet to calculate this-->
  `;
};
