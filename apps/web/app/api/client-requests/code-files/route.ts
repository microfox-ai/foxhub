import { Octokit } from "@octokit/rest";
import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { GITHUB_TOKEN, PROJECT_REPO_OWNER } from "@/utils/constants/githubInfo";

const prisma = new PrismaClient();
const octokit = new Octokit({
  auth: GITHUB_TOKEN,
});

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const requestId = searchParams.get("requestId");
    const filePath = searchParams.get("filePath");

    if (!requestId || !filePath) {
      return NextResponse.json(
        { error: "Missing requestId or filePath" },
        { status: 400 }
      );
    }

    const clientRequest = await prisma.clientRequest.findUnique({
      where: { id: requestId },
    });

    if (!clientRequest) {
      return NextResponse.json(
        { error: "Client request not found" },
        { status: 404 }
      );
    }

    const { data: fileData } = await octokit.repos.getContent({
      owner: PROJECT_REPO_OWNER,
      repo: clientRequest.repoName || "test",
      path: filePath,
      ref: clientRequest.prBranch || undefined,
    });

    if (!fileData || Array.isArray(fileData)) {
      return NextResponse.json(
        { error: "File not found or is a directory" },
        { status: 404 }
      );
    }

    // Type guard to ensure we have a file with content
    if (fileData.type !== "file" || !("content" in fileData)) {
      return NextResponse.json(
        { error: "Invalid file type or missing content" },
        { status: 400 }
      );
    }

    const content = Buffer.from(fileData.content, "base64").toString();

    return NextResponse.json({
      content,
      sha: fileData.sha,
      path: fileData.path,
    });
  } catch (error) {
    console.error("Error fetching file:", error);
    return NextResponse.json(
      { error: "Failed to fetch file" },
      { status: 500 }
    );
  }
}
