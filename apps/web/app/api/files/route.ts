import { Octokit } from "octokit";
import { NextRequest, NextResponse } from "next/server";
import { GITHUB_TOKEN } from "@/utils/constants/githubInfo";

const octokit = new Octokit({
  auth: GITHUB_TOKEN,
});

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const owner = searchParams.get("owner");
    const repo = searchParams.get("repo");
    const branch = searchParams.get("branch");
    const filePath = searchParams.get("filePath");

    if (!owner || !repo || !branch || !filePath) {
      return NextResponse.json(
        {
          error:
            "Missing required parameters: owner, repo, branch, and filePath are required",
        },
        { status: 400 }
      );
    }

    console.log("filePath", filePath, owner, repo, branch);

    const response = await octokit.rest.repos.getContent({
      owner,
      repo,
      path: filePath.replaceAll("\\", "/"),
      ref: branch,
    });

    if ("content" in response.data) {
      const content = Buffer.from(response.data.content, "base64").toString();
      return NextResponse.json({ content });
    }

    return NextResponse.json({ error: "File not found" }, { status: 404 });
  } catch (error) {
    console.error("Error fetching file:", error);
    return NextResponse.json(
      { error: "Failed to fetch file content" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { owner, repo, branch, filePath, content } = await request.json();

    if (!owner || !repo || !branch || !filePath) {
      return NextResponse.json(
        {
          error:
            "Missing required parameters: owner, repo, branch, and filePath are required",
        },
        { status: 400 }
      );
    }

    // Get the current file to get its SHA
    const currentFile = await octokit.rest.repos.getContent({
      owner,
      repo,
      path: filePath.replaceAll("\\", "/"),
      ref: branch,
    });

    if (!("sha" in currentFile.data)) {
      return NextResponse.json(
        { error: "Could not get file SHA" },
        { status: 400 }
      );
    }

    const fileName =
      filePath.replaceAll("\\", "/").split("/").pop() || filePath;
    const commitMessage = `microcode: updatefox: Updated File ${fileName}`;

    const response = await octokit.rest.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: filePath.replaceAll("\\", "/"),
      message: commitMessage,
      content: Buffer.from(content).toString("base64"),
      sha: currentFile.data.sha,
      branch,
    });

    return NextResponse.json({ success: true, data: response.data });
  } catch (error) {
    console.error("Error updating file:", error);
    return NextResponse.json(
      { error: "Failed to update file content" },
      { status: 500 }
    );
  }
}
