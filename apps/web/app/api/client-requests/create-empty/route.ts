import { createEmptyClientRequest } from "@/utils/services/db_functions/createEmptyClientRequest";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { userId, botProjectId, title, description } = await request.json();
  if (!userId || !botProjectId) {
    return NextResponse.json(
      { error: "Missing userId or botProjectId" },
      { status: 400 },
    );
  }
  try {
    const clientRequest = await createEmptyClientRequest({
      userId,
      botProjectId,
      title: title || "Untitled",
      description: description || "",
    });

    return NextResponse.json(clientRequest);
  } catch (error) {
    console.error("Error creating empty client request:", error);
    return NextResponse.json(
      { error: "Failed to create empty client request" },
      { status: 500 },
    );
  }
}
