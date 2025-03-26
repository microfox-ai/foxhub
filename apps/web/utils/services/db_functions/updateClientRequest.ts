import { prisma } from "@/prisma/prisma";

export async function updateClientRequest({
  clientRequestId,
  ...options
}: any) {
  // Create empty ClientRequest
  const clientRequest =
    (await prisma.clientRequest.update({
      where: {
        id: options.clientRequestId,
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
    const updatedClientRequest = await prisma.taskInstanceMeta.upsert({
      where: {
        originClientRequestId: clientRequestId,
      },
      update: {
        ...taskInstanceMeta,
        ...(otherData && { ...otherData }),
      },
      create: {
        ...taskInstanceMeta,
        ...(otherData && { ...otherData }),
      },
    });
    console.log("updatedClientRequest", updatedClientRequest);
    return updatedClientRequest;
  } catch (error) {
    console.log("error updating client request", error);
    return null;
  }
}
