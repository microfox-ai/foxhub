import { prisma } from "@/prisma/prisma";

export async function updateClientRequest({
  clientRequestId,
  ...options
}: any) {
  // Create empty ClientRequest
  const clientRequest =
    (await prisma.clientRequest.update({
      where: {
        id: clientRequestId,
      },
      data: {
        ...options,
      },
    })) || {};

  return clientRequest;
}

export async function updateTaskInstanceMeta({
  clientRequestId,
  taskInstanceMeta,
  otherData,
}: any) {
  try {
    const updatedTaskInstanceMeta = await prisma.taskInstanceMeta.upsert({
      where: {
        originClientRequestId: clientRequestId,
      },
      update: {
        ...taskInstanceMeta,
        ...(otherData && { ...otherData }),
      },
      create: {
        originClientRequestId: clientRequestId,
        ...taskInstanceMeta,
        ...(otherData && { ...otherData }),
      },
    });
    console.log("updated TaskInstanceMeta");
    return updatedTaskInstanceMeta;
  } catch (error) {
    console.log("error updating client request", error);
    return null;
  }
}
