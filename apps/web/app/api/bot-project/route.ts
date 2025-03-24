import { NextResponse } from "next/server";
import { prisma } from "@/prisma/prisma";
import { createNewBotProject } from "@/utils/services/db_functions/createNewBotProject";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json({ error: "User ID is required" }, { status: 400 });
  }

  try {
    let botProjects = await prisma.botProject?.findMany({
      where: { userId },
      include: { clientRequests: true },
    });

    if (!botProjects || botProjects.length === 0) {
      const newBotProject = await createNewBotProject({
        userId,
        projectName: "Personal Space",
        projectDescription: "This is a personal space for the user",
      });
      botProjects = [newBotProject];
    }

    return NextResponse.json(botProjects);
  } catch (error) {
    console.error("Error fetching organizations:", error);
    return NextResponse.error();
  }
}
