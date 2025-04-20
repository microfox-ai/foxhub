import { ClientRequest, DEPLOY_STAGE } from "@prisma/client";
import { TaskInstanceMetaType } from "@/server/convertfox/types";

export const getServiceName = (
  clientRequest: ClientRequest,
  taskInstanceMeta: TaskInstanceMetaType
) => {
  return `${taskInstanceMeta?.taskStructure?.templateType.substring(0, 1)}-${clientRequest?.requestDir?.split("-").pop()?.replaceAll("/", "-")}`;
};

export const getFunctionName = (
  clientRequest: ClientRequest,
  stage: DEPLOY_STAGE,
  functionName: string
) => {
  return `${clientRequest?.serviceName}-${stage}-${functionName}`;
};
