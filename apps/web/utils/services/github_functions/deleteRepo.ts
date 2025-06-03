import {
  GITHUB_ACTION_POLICIES,
  GITHUB_TOKEN,
  GITHUB_TOKEN_ADMIN,
  PROJECT_REPO_OWNER,
} from "@/utils/constants/githubInfo";
import { Octokit } from "octokit";

export async function deleteRepoBranch(repoName: string, branchName: string) {
  const octokit = new Octokit({
    auth: GITHUB_TOKEN,
  });

  try {
    // Delete the branch
    await octokit.rest.git.deleteRef({
      owner: PROJECT_REPO_OWNER,
      repo: repoName,
      ref: `heads/${branchName}`,
    });
    return { success: true };
  } catch (error) {
    console.error("Error deleting branch:", error);
    return { success: false, error };
  }
}

export async function closePullRequest(repoName: string, pullNumber: number) {
  const octokit = new Octokit({
    auth: GITHUB_TOKEN,
  });

  try {
    // Close the pull request
    await octokit.rest.pulls.update({
      owner: PROJECT_REPO_OWNER,
      repo: repoName,
      pull_number: pullNumber,
      state: "closed",
    });
    return { success: true };
  } catch (error) {
    console.error("Error closing pull request:", error);
    return { success: false, error };
  }
}

export async function deleteRepository(repoName: string) {
  const octokit = new Octokit({
    auth: GITHUB_ACTION_POLICIES,
  });

  try {
    // Delete the repository
    await octokit.rest.repos.delete({
      owner: PROJECT_REPO_OWNER,
      repo: repoName,
    });
    return { success: true };
  } catch (error) {
    console.error("Error deleting repository:", error);
    return { success: false, error };
  }
}
