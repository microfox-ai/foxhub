import { prisma } from "@/prisma/prisma";
import {
  GITHUB_TOKEN,
  TEMPLATE_REPO_OWNER,
} from "@/utils/constants/githubInfo";
import { Octokit } from "octokit";
import { GenAiSdk } from "../GenAiSdk";
import { SlackBotSdk, SlackChannels } from "../slackBotSdk";

export async function createClientRequestPR({
  clientRequestId,
  description,
  title,
}: {
  clientRequestId: string;
  description: string;
  title?: string;
}) {
  const clientRequest = await prisma.clientRequest.findUnique({
    where: {
      id: clientRequestId,
    },
  });
  if (!clientRequest) {
    throw new Error("Client request not found");
  }

  const botProject = await prisma.botProject.findUnique({
    where: {
      id: clientRequest.botProjectId,
    },
  });
  if (!botProject) {
    throw new Error("Bot project not found");
  }

  let requestTitle = title;
  if (!requestTitle) {
    // 🔹 Use GenAI to generate a meaningful title for the request
    const generatedTitle = await GenAiSdk.generateShortTitle(
      `client's request: "${description}"`
    );

    if (!generatedTitle) {
      throw new Error("Failed to generate title");
    }

    requestTitle = generatedTitle;
  }

  const githubSdk = new Octokit({
    auth: GITHUB_TOKEN,
  });

  const uniqueRequestTitle = `${requestTitle?.toLowerCase().replace(/ /g, "-").substring(0, 20)}-${Date.now()}`;

  // Create new branch on GitHub
  const newBranch = `request/${uniqueRequestTitle}`;
  const targetBranch = botProject.githubRepoBranch || "project/master";
  const defaultBranchSha = await githubSdk.rest.git.getRef({
    owner: TEMPLATE_REPO_OWNER,
    repo: botProject.githubRepoName,
    ref: `heads/${targetBranch}`,
  });
  const newBranchResult = await githubSdk.rest.git.createRef({
    owner: TEMPLATE_REPO_OWNER,
    repo: botProject.githubRepoName,
    ref: `refs/heads/${newBranch}`,
    sha: defaultBranchSha.data.object.sha,
  });
  if (!newBranchResult) {
    throw new Error("Failed to create new branch");
  }
  console.log("newBranchResult", newBranchResult);

  // Create README.md file on new branch with request description
  const requestDir = `apps/${uniqueRequestTitle}`;
  const readmeFilePath = `${requestDir}/README.md`;
  const readmeFileContent =
    await githubSdk.rest.repos.createOrUpdateFileContents({
      owner: TEMPLATE_REPO_OWNER,
      repo: botProject.githubRepoName,
      path: readmeFilePath,
      message: `Add README for ${requestTitle}`,
      content: Buffer.from(`DESCRIPTION: ${description}`).toString("base64"),
      branch: newBranch,
    });
  if (!readmeFileContent) {
    throw new Error("Failed to update README.md");
  }
  console.log("readmeFileContent", readmeFileContent);

  // Create pull request from new branch to target branch
  const pr = await githubSdk.rest.pulls.create({
    owner: TEMPLATE_REPO_OWNER,
    repo: botProject.githubRepoName,
    title: `New Client Request: ${requestTitle}`,
    body: `<Not for Client> Description: ${description}`,
    head: `${newBranch}`,
    base: targetBranch,
  });
  if (!pr) {
    throw new Error("Failed to create pull request");
  }
  console.log("pr", pr);

  const updatedClientRequest = await prisma.clientRequest.update({
    where: {
      id: clientRequestId,
    },
    data: {
      title: requestTitle,
      description: description,
      requestDir: requestDir,
      prUrl: pr.data.html_url,
      prNumber: pr.data.number,
      prBranch: pr.data.head.ref,
      prTargetBranch: pr.data.base.ref,
      metadata: {
        pr: pr.data,
      },
      lastUpdatedAt: new Date(),
      updatedAt: new Date(),
      createdAt: new Date(),
    },
  });
  console.log("updatedClientRequest", updatedClientRequest);

  // Create clientRequest.json file on new branch
  const clientRequestFilePath = `${requestDir}/clientRequest.json`;
  const clientRequestFile =
    await githubSdk.rest.repos.createOrUpdateFileContents({
      owner: TEMPLATE_REPO_OWNER,
      repo: botProject.githubRepoName,
      path: clientRequestFilePath,
      message: `Add clientRequest.json for ${requestTitle}`,
      content: Buffer.from(
        JSON.stringify(updatedClientRequest, null, 2)
      ).toString("base64"),
      branch: newBranch,
    });
  if (!clientRequestFile) {
    throw new Error("Failed to update clientRequest.json");
  }
  console.log("clientRequestFileContent", clientRequestFile);

  // Send slack message
  const slackBotSdk = new SlackBotSdk();
  const slackMsg = `A new request has been created for the project: *${botProject.name}*\n\n*Title*: ${requestTitle}\n*Description*: ${description}\n*PR Link*: ${pr.data.html_url}`;
  await slackBotSdk.sendSlackMessageviaAPI({
    text: slackMsg,
    channel:
      process.env.NODE_ENV === "production"
        ? SlackChannels.p_3_custombots
        : SlackChannels.test_slackbot,
  });

  return updatedClientRequest;
}
