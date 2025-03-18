import { NextResponse } from "next/server";
import { prisma } from "@/prisma/prisma";
import {
  TEMPLATE_REPO,
  TEMPLATE_REPO_OWNER,
} from "@/utils/constants/customBots";
import { GithubSdk } from "@/utils/services/githubSdk";

export async function POST(request: Request) {
  const body = await request.json();
  let { userId, projectName, projectDescription } = body;

  if (!projectName || !userId) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  try {
    const TOKEN = process.env.TMD_GITHUB_TOKEN;

    if (!TOKEN) {
      console.error("No Github token provided");
    }

    // Create an instance for the template repository.
    const templateRepoSdk = new GithubSdk({
      owner: TEMPLATE_REPO_OWNER,
      repo: TEMPLATE_REPO,
      token: TOKEN as string,
    });

    const randomString = Math.random().toString(36).substring(2, 8);

    const newRepoName = `CustomBots-${projectName.toLowerCase().replace(/ /g, "-")}-${randomString}`;

    const repoResult: any = await templateRepoSdk.createRepositoryFromTemplate({
      newRepoName,
    });

    if (!repoResult) {
      return NextResponse.json(
        { error: "Failed to create bot project" },
        { status: 500 }
      );
    }

    // Create an instance for the new repository.
    const newRepoSdk = new GithubSdk({
      owner: TEMPLATE_REPO_OWNER,
      repo: repoResult?.name || newRepoName,
      token: TOKEN as string,
    });

    const newBranch = `project/master`;

    await new Promise((resolve) => setTimeout(resolve, 2000));

    // 1. Create a new branch from "main"
    await newRepoSdk.createBranch({
      branchName: newBranch,
      baseBranch: "main",
    });

    const projectDir = `ProjectInfo`;
    const readmeFilePath = `${projectDir}/README.md`;

    // 2. Construct the file path and update the README.md file on the new branch.
    await newRepoSdk.updateFile({
      path: readmeFilePath,
      content: `DESCRIPTION: ${projectDescription}`,
      commitMessage: `Add README for ${projectName}`,
      branch: newBranch,
    });

    // 3. Create a pull request from the new branch to "main"
    const prTitle = `Project: ${projectName}`;
    const prBody = `DESCRIPTION: ${projectDescription}`;
    const prResult: any = await newRepoSdk.createPullRequest({
      title: prTitle,
      head: newBranch,
      base: "main",
      body: prBody,
    });

    const botProject = await prisma.botProject.create({
      data: {
        userId,
        name: projectName,
        projectDir,
        githubRepoName: newRepoName,
        githubRepoUrl:
          (prResult?.head?.repo?.html_url as string) ||
          `https://github.com/${TEMPLATE_REPO_OWNER}/${newRepoName}`,
        githubRepoBranch: newBranch,
        prUrl: (prResult?.html_url as string) || "",
        prNumber: (prResult?.number as number) || null,
        description: projectDescription,
        metadata: {
          repo: repoResult,
          pr: prResult,
        },
        previewConfigs: {},
        prodConfigs: {},
        stagingConfigs: {},
      },
    });

    const botProjectFilePath = `${projectDir}/botProject.json`;
    // 4. Create the botProject.json file on the new branch with the updated ID.
    const botProjectData = {
      id: botProject.id,
      userId: botProject.userId,
      name: botProject.name,
      projectDir: botProject.projectDir,
      githubRepoName: botProject.githubRepoName,
      githubRepoUrl: botProject.githubRepoUrl,
      githubRepoBranch: botProject.githubRepoBranch,
      prUrl: botProject.prUrl,
      prNumber: botProject.prNumber,
      description: botProject.description,
      metadata: botProject.metadata,
      createdAt: botProject.createdAt,
    };

    await newRepoSdk.updateFile({
      path: botProjectFilePath,
      content: JSON.stringify(botProjectData, null, 2),
      commitMessage: `Add botProject.json for ${projectName}`,
      branch: newBranch,
    });

    return NextResponse.json(botProject);
  } catch (error) {
    console.error("Error creating bot project:", error);
    return NextResponse.json(
      { error: "Failed to create bot project" },
      { status: 500 }
    );
  }
}
