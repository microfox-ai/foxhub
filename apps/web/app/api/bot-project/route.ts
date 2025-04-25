import { NextResponse } from "next/server";
import { prisma } from "@/prisma/prisma";
import { createNewBotProject } from "@/utils/services/db_functions/createNewBotProject";
import { serverAnalytics } from "@/utils/services/analytics/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json({ error: "User ID is required" }, { status: 400 });
  }

  try {
    let botProjects = await prisma.botProject?.findMany({
      where: { userId },
      include: {
        clientRequests: true,
        permissions: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!botProjects || botProjects.length === 0) {
      const newBotProject = await createNewBotProject({
        userId,
        projectName: "Personal Space",
        projectDescription: "This is a personal space for the user",
      });
      botProjects = [newBotProject];
      // Track personal space creation
      await serverAnalytics.track("Personal Space Created", {
        distinct_id: userId,
        projectId: newBotProject.id,
        projectName: newBotProject.name,
        timestamp: new Date().toISOString(),
      });
    }

    return NextResponse.json(botProjects);
  } catch (error) {
    console.error("Error fetching organizations:", error);
    return NextResponse.error();
  }
}

export async function PUT(request: Request) {
  try {
    const { id, name, description, slug, imageUrl } = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: "Project ID is required" },
        { status: 400 }
      );
    }

    const updatedProject = await prisma.botProject.update({
      where: { id },
      data: { name, description, slug, imageUrl },
    });

    return NextResponse.json(updatedProject);
  } catch (error) {
    console.error("Error updating project:", error);
    return NextResponse.error();
  }
}
