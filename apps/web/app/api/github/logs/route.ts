import { NextRequest, NextResponse } from "next/server";
import {
  GITHUB_TOKEN,
  TEMPLATE_REPO_OWNER,
} from "@/utils/constants/githubInfo";
import { Octokit } from "octokit";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const jobId = searchParams.get("jobId");
    const repoName = searchParams.get("repoName");

    if (!jobId || !repoName) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

    const octokit = new Octokit({
      auth: GITHUB_TOKEN,
    });

    console.log("jobId", jobId);

    const { data: logs } =
      await octokit.rest.actions.downloadJobLogsForWorkflowRun({
        owner: TEMPLATE_REPO_OWNER,
        repo: repoName,
        job_id: parseInt(jobId),
      });

    return NextResponse.json({ logs });
  } catch (error) {
    console.error("Error fetching GitHub logs:", error);
    return NextResponse.json(
      { error: "Failed to fetch logs" },
      { status: 500 }
    );
  }
}
