import { prisma } from "@/prisma/prisma";
import { FoxTemplate } from "@prisma/client";

export async function getFoxes() {
  const foxes = await prisma.foxTemplate.findMany();
  return foxes;
}

export async function getFox(id: string) {
  const fox = await prisma.foxTemplate.findUnique({
    where: { id },
  });
  return fox;
}

export async function createFox(fox: FoxTemplate) {
  const newFox = await prisma.foxTemplate.create({
    data: fox,
  });
  return newFox;
}

export async function updateFox(id: string, fox: FoxTemplate) {
  const updatedFox = await prisma.foxTemplate.update({
    where: { id },
    data: fox,
  });
  return updatedFox;
}
