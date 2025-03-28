import { prisma } from "@/prisma/prisma";
import { ChatUIMessage } from "@prisma/client";

export async function createMessage({
  clientRequestId,
  message,
}: {
  clientRequestId: string;
  message: ChatUIMessage;
}) {
  return await prisma.chatUIMessage.create({
    data: {
      ...(message as any),
      originClientRequestId: clientRequestId,
    },
  });
}

export async function updateMessage({
  clientRequestId,
  message,
}: {
  clientRequestId: string;
  message: any;
}) {
  return await prisma.chatUIMessage.update({
    where: {
      id: message.id,
    },
    data: message,
  });
}

export async function getMessage({
  clientRequestId,
  message,
}: {
  clientRequestId: string;
  message: ChatUIMessage;
}) {
  return await prisma.chatUIMessage.findFirst({
    where: {
      id: message.id,
    },
  });
}
