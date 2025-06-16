import { prisma } from "@/prisma/prisma";
import { NextResponse } from "next/server";
import { MinionFlow } from "@/components/screens/hooks/convertors";

export async function POST(request: Request) {
  const { userId, botProjectId, title, description, minionFlow } =
    await request.json();
  if (!userId || !botProjectId) {
    return NextResponse.json(
      { error: "Missing userId or botProjectId" },
      { status: 400 }
    );
  }
  try {
    // Get botProject to fetch awsRegion
    const botProject = await prisma.botProject.findUnique({
      where: { id: botProjectId },
      select: { awsRegion: true },
    });

    const clientRequest =
      (await prisma.clientRequest.create({
        data: {
          botProjectId: botProjectId,
          userId,
          title: title || "Untitled",
          description: description || "",
          minionFlow: minionFlow || MinionFlow.Unknown,
          awsRegion: botProject?.awsRegion,
        },
      })) || {};

    return NextResponse.json(clientRequest);
  } catch (error) {
    console.error("Error creating empty client request:", error);
    return NextResponse.json(
      { error: "Failed to create empty client request" },
      { status: 500 }
    );
  }
}
