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
