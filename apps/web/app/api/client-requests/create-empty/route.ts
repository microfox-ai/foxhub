import { prisma } from "@/prisma/prisma";
import { NextResponse } from "next/server";
import { MinionFlow } from "@/components/screens/hooks/convertors";
import { detectOptimalAwsRegionFromRequest } from "@/utils/services/aws/region-detector";

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
    // Get botProject to fetch awsRegion, or detect from client if not available
    const botProject = await prisma.botProject.findUnique({
      where: { id: botProjectId },
      select: { awsRegion: true },
    });

    let awsRegion = botProject?.awsRegion;
    
    // If botProject doesn't have awsRegion, detect from client
    if (!awsRegion) {
      const regionInfo = await detectOptimalAwsRegionFromRequest(request);
      awsRegion = regionInfo.region;
      console.log(`Client region detection for ClientRequest: ${regionInfo.reasoning}`);
    }

    const clientRequest =
      (await prisma.clientRequest.create({
        data: {
          botProjectId: botProjectId,
          userId,
          title: title || "Untitled",
          description: description || "",
          minionFlow: minionFlow || MinionFlow.Unknown,
          awsRegion: awsRegion,
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
