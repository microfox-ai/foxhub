import { NextResponse } from "next/server";
import { createNewBotProject } from "@/utils/services/db_functions/createNewBotProject";

export async function POST(request: Request) {
  const body = await request.json();
  const { userId, projectName, projectDescription } = body;

  try {
    const newBotProject = await createNewBotProject({
      userId,
      projectName,
      projectDescription,
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

