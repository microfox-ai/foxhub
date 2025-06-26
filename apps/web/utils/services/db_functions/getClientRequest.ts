import { prisma } from "@/prisma/prisma";
import { TaskInstanceMetaType } from "@/server/convertfox/helpers/types";
export async function getClientRequest(clientRequestId: string) {
  const clientRequest = await prisma.clientRequest.findUnique({
    where: {
      id: clientRequestId,
    },
  });
  return clientRequest;
}

export async function getTaskInstanceMeta(clientRequestId: string) {
  try {
    const taskInstanceMeta = await prisma.taskInstanceMeta.findUnique({
      where: {
        originClientRequestId: clientRequestId,
      },
    });
    if (!taskInstanceMeta) {
      return {
        originClientRequestId: clientRequestId,
      } as unknown as TaskInstanceMetaType;
    }
    //console.log("taskInstanceMeta", taskInstanceMeta);
    return taskInstanceMeta as unknown as TaskInstanceMetaType;
  } catch (error) {
    console.error(error);
    return null;
  }
}

export async function getClientDeployment(clientRequestId: string) {
  const clientDeployment = await prisma.clientDeployment.findUnique({
    where: {
      id: clientRequestId,
    },
  });
  return clientDeployment;
}
