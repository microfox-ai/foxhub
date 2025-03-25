import { prisma } from "@/prisma/prisma";
import { TaskInstanceMetaType } from "@/server/convertfox/types";
export async function getClientRequest(clientRequestId: string) {
  const clientRequest = await prisma.clientRequest.findUnique({
    where: {
      id: clientRequestId,
    },
  });
  return clientRequest;
}

export async function getTaskInstanceMeta(clientRequestId: string) {
  const clientRequest = await getClientRequest(clientRequestId);
  if (!clientRequest) {
    throw new Error("Client request not found");
  }
  return (
    (clientRequest?.taskInstanceMeta as TaskInstanceMetaType) ??
    ({} as TaskInstanceMetaType)
  );
}
