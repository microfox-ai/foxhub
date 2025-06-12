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

    if (!requestId) {
      return NextResponse.json({ error: "Missing requestId" }, { status: 400 });
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

    // Get the latest commit for the PR branch
    const { data: commits } = await octokit.repos.listCommits({
      owner: PROJECT_REPO_OWNER,
      repo: clientRequest.repoName || "test",
      sha: clientRequest.prBranch || undefined,
      per_page: 1,
    });

    if (!commits || commits.length === 0) {
      return NextResponse.json({ error: "No commits found" }, { status: 404 });
    }

    const latestCommit = commits[0];
    if (!latestCommit) {
      return NextResponse.json(
        { error: "Invalid commit data" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      sha: latestCommit.sha,
      message: latestCommit.commit.message,
      author: latestCommit.commit.author,
      date: latestCommit.commit.author?.date,
      html_url: latestCommit.html_url,
    });
  } catch (error) {
    console.error("Error fetching latest commit:", error);
    return NextResponse.json(
      { error: "Failed to fetch latest commit" },
      { status: 500 }
    );
  }
}
