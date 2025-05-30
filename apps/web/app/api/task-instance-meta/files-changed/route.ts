import { prisma } from "@/prisma/prisma";
import { modifyTaskInstanceMeta } from "@/server/convertfox/modifyTaskInstanceMeta";
import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 100; // 100 seconds

export async function POST(req: NextRequest) {
  try {
    // Check for the microfox-api-key in the request headers
    const apiKey = req.headers.get("microfox-api-key");
    const origin = req.nextUrl.origin;

    if (apiKey !== process.env.MICROFOX_API_KEY) {
      console.log("apiKey", apiKey);
      console.log("MICROFOX_API_KEY", process.env.MICROFOX_API_KEY);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { fileChanges, clientRequestId, commitSha } = body;

    if (!fileChanges || !clientRequestId) {
      return NextResponse.json(
        { error: "Missing filesChanged or clientRequestId parameter" },
        { status: 400 }
      );
    }

    // Get task instance meta from database
    const taskInstanceMeta = await prisma.taskInstanceMeta.findFirst({
      where: {
        originClientRequestId: clientRequestId,
      },
    });

    const clientRequest = await prisma.clientRequest.findFirst({
      where: {
        id: clientRequestId,
      },
    });

    if (!taskInstanceMeta || !clientRequest) {
      return NextResponse.json(
        { error: "Task instance meta or client request not found" },
        { status: 404 }
      );
    }

    const modifiedTaskInstanceMeta = await modifyTaskInstanceMeta(
      taskInstanceMeta,
      clientRequest,
      {
        filesChanged: fileChanges,
        enableGitFetch: true,
        commitSha: commitSha,
      }
    );

    // Update the filesChanged in taskInfo
    await prisma.taskInstanceMeta.update({
      where: {
        id: taskInstanceMeta.id,
      },
      data: modifiedTaskInstanceMeta as any,
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error updating files changed:", error);
    return NextResponse.json(
      { error: "Error updating files changed" },
      { status: 500 }
    );
  }
}
