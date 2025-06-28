import { ClientRequest, DEPLOY_STAGE } from "@prisma/client";
import { TaskInstanceMetaType } from "@/server/convertfox/helpers/types";

export const getServiceName = (
  clientRequest: ClientRequest,
  taskInstanceMeta: TaskInstanceMetaType
) => {
  return `${clientRequest?.title.substring(0, 1) ?? "a"}-${getNumberedPart(clientRequest?.requestDir || "").substring(-8)}-${clientRequest?.id?.substring(0, 8)}`;
};

export const getFunctionName = (
  clientRequest: ClientRequest,
  stage: DEPLOY_STAGE,
  functionName: string
) => {
  return `${clientRequest?.serviceName}-${stage}-${functionName}`;
};

const getNumberedPart = (requestDir: string) => {
  const match = requestDir.match(/\d+/);
  return match ? match[0] : "";
};
