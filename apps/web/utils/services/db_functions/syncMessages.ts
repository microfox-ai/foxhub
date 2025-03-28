import { prisma } from "@/prisma/prisma";
import { ChatUIMessage } from "@prisma/client";
export const syncMessages = async ({
  clientRequestId,
  messages,
}: {
  clientRequestId: string;
  messages: ChatUIMessage[];
}) => {
  return messages;
};
