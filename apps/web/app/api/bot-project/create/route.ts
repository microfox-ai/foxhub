import { NextResponse } from "next/server";
import { createNewBotProject } from "@/utils/services/db_functions/createNewBotProject";
import { detectOptimalAwsRegionFromRequest } from "@/utils/services/aws/region-detector";

export async function POST(request: Request) {
  const body = await request.json();
  const {
    userId,
    projectName,
    projectDescription,
    slug,
    homepageUrl,
    imageUrl,
  } = body;

  try {
    // Detect optimal AWS region based on client's location
    const regionInfo = await detectOptimalAwsRegionFromRequest(request);
    console.log(`Client region detection: ${regionInfo.reasoning}`);

    const newBotProject = await createNewBotProject({
      userId,
      projectName,
      projectDescription,
      slug: slug,
      homepageUrl,
      imageUrl,
      awsRegion: regionInfo.region,
      regionInfo,
    });
    // console.log("newBotProject", newBotProject);

    return NextResponse.json(newBotProject);
  } catch (error) {
    console.error("Error creating bot project:", error);
    return NextResponse.json(
      { error: "Failed to create bot project" },
      { status: 500 }
    );
  }
}
