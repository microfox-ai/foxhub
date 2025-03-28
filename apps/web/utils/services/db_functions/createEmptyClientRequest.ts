"use server";

import { prisma } from "@/prisma/prisma";

export async function createEmptyClientRequest({
  userId,
  botProjectId,
  title,
  description,
}: {
  userId: string;
  botProjectId: string;
  title?: string;
  description?: string;
}) {
  // Create empty ClientRequest
  const clientRequest =
    (await prisma.clientRequest.create({
      data: {
        botProjectId: botProjectId,
        userId,
        title: title || "Untitled",
        description: description || "",
      },
    })) || {};

  return clientRequest;
}
