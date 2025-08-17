import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/prisma/prisma";

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    let consoleProject = await prisma.botProject.findFirst({
      where: {
        userId,
        type: "CONSOLE",
      },
    });

    if (consoleProject) {
      return NextResponse.json(consoleProject);
    }

    const githubRepoName = `console-project-${userId}-${Date.now()}`;
    consoleProject = await prisma.botProject.create({
      data: {
        userId,
        name: "Console Project",
        githubRepoName: githubRepoName,
        githubRepoUrl: `https://github.com/user/${githubRepoName}`,
        projectDir: "/",
        type: "CONSOLE",
      },
    });

    return NextResponse.json(consoleProject);
  } catch (error) {
    console.error("Error getting or creating console project:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
