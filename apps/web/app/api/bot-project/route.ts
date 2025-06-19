import { NextResponse } from "next/server";
import { prisma } from "@/prisma/prisma";
import { createNewBotProject } from "@/utils/services/db_functions/createNewBotProject";
import { serverAnalytics } from "@/utils/services/analytics/server";
import { Prisma } from "@prisma/client";
import { detectOptimalAwsRegionFromRequest } from "@/utils/services/aws/region-detector";

export async function POST(request: Request) {
  const body = await request.json();
  const {
    userId,
    projectName,
    projectDescription,
    slug = null,
    imageUrl = null,
    homepageUrl = null,
    // Add any other fields you want to support
  } = body;

  if (!userId) {
    return NextResponse.json({ error: "User ID is required" }, { status: 400 });
  }

  const regionInfo = await detectOptimalAwsRegionFromRequest(request);
  console.log(
    `Client region detection for Personal Space: ${regionInfo.reasoning}`
  );

  const newBotProject = await createNewBotProject({
    userId,
    projectName,
    projectDescription,
    slug,
    imageUrl,
    homepageUrl,
    awsRegion: regionInfo.region,
    regionInfo,
  });
  // Track personal space creation
  await serverAnalytics.track("Personal Space Created", {
    distinct_id: userId,
    projectId: newBotProject.id,
    projectName: newBotProject.name,
    timestamp: new Date().toISOString(),
  });
  return NextResponse.json(newBotProject);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  const archiveStatus = searchParams.get("archiveStatus") || "active";

  if (!userId) {
    return NextResponse.json({ error: "User ID is required" }, { status: 400 });
  }

  let conditions: Record<string, any> = {};
  conditions.userId = userId;

  try {
    let botProjects = await prisma.botProject?.findMany({
      where: conditions,
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
      // Detect optimal AWS region based on client's location
      return NextResponse.json([]);
    }

    let finalBotProjects = botProjects.filter(
      (project) => project.archiveStatus != "archived"
    );
    if (archiveStatus != "active") {
      finalBotProjects = [...botProjects];
    }

    return NextResponse.json(finalBotProjects);
  } catch (error) {
    console.error("Error fetching organizations:", error);
    return NextResponse.error();
  }
}

export async function PUT(request: Request) {
  try {
    const { id, ...rest } = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: "Project ID is required" },
        { status: 400 }
      );
    }

    // Use Prisma's update input type
    const updateData: Prisma.BotProjectUpdateInput = {
      name: rest.name,
      description: rest.description,
      slug: rest.slug,
      homepageUrl: rest.homepageUrl,
      imageUrl: rest.imageUrl,
      githubRepoBranch: rest.githubRepoBranch,
      templateVersion: rest.templateVersion,
      metadata: rest.metadata,
    };

    const updatedProject = await prisma.botProject.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(updatedProject);
  } catch (error) {
    console.error("Error updating project:", error);
    return NextResponse.error();
  }
}
