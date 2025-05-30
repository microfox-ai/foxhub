import { readAllGenFilesList } from "../tool/writeToFile";
import { genEnvCollector } from "./genEnvCollector";
import { updateTaskInstanceMeta } from "@/utils/services/db_functions/updateClientRequest";
import dayjs from "dayjs";
import { ExtraEnvVariable, taskRequiredInfo } from "../../convertfox/types";

interface BuildStepProps {
  props: any;
  clientRequest: any;
  taskInstanceMeta: any;
  timeStart: dayjs.Dayjs;
}

export async function genBuildStep({
  props,
  clientRequest,
  taskInstanceMeta,
  timeStart,
}: BuildStepProps) {
  try {
    // record the changes in the build fox steps taken so far using taskInstanceMeta.
    const filesList = await readAllGenFilesList(clientRequest, true);
    const newFilesList = filesList.map((file: any) => ({
      fileName: file.fileName,
      filePath: file.filePath,
      fileType: file.fileType,
      meta: file.meta,
    }));

    const allEnvVariablesUsed = newFilesList?.flatMap(
      (file: any) => (file.meta?.envVariablesUsed as string[]) ?? []
    );
    const envVariablesUsedUnique = [
      ...new Set(allEnvVariablesUsed),
    ] as string[];
    const allPackagesUsed = newFilesList?.flatMap(
      (file: any) => (file.meta?.packagesUsed as string[]) ?? []
    );
    const packagesUsedUnique = [...new Set(allPackagesUsed)];

    console.log("envVariablesUsedUnique", envVariablesUsedUnique);
    const envVariables = await genEnvCollector(
      props,
      envVariablesUsedUnique,
      taskInstanceMeta,
      clientRequest
    );
    console.log("envVariablesShouldAsk", envVariables);

    const timeEnd = dayjs();
    const taskInstanceMetaUpdated = await updateTaskInstanceMeta({
      clientRequestId: clientRequest.clientRequestId,
      taskInstanceMeta: {
        ...taskInstanceMeta,
        taskRequiredInfo: {
          customEnvVariables: (
            taskInstanceMeta.taskRequiredInfo
              ?.customEnvVariables as ExtraEnvVariable[]
          )
            .filter((env) => !envVariables?.some((e) => e.env === env.env))
            .concat(envVariables ?? []),
        },
        buildingStep: {
          startTime: timeStart,
          endTime: timeEnd,
          ...taskInstanceMeta.buildingStep,
          files: newFilesList,
          allEnvs: envVariablesUsedUnique,
          allPackages: allPackagesUsed,
        },
      },
    });

    return {
      taskInstanceMetaUpdated,
      newFilesList,
      envVariablesUsedUnique,
      packagesUsedUnique,
      envVariables,
    };
  } catch (error) {
    console.error("Error in genBuildStep", error);
    return {
      taskInstanceMetaUpdated: null,
      newFilesList: [],
      envVariablesUsedUnique: [],
      packagesUsedUnique: [],
      envVariables: [],
    };
  }
}
