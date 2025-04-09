import { prisma } from "@/prisma/prisma";
import {
  GITHUB_TOKEN,
  TEMPLATE_REPO_OWNER,
} from "@/utils/constants/githubInfo";
import { Octokit } from "octokit";
import { GenAiSdk } from "../../utils/services/GenAiSdk";
import { createSlackSDK } from "@microfox/slack-web-tiny";
import {
  MICROFOX_LOGO,
  MySlackChannels,
  slackBotSdk,
} from "@/utils/services/slackBotSdk";
import { SLACK_BOT_OAUTH_TOKEN } from "@/utils/services/slackBotSdk";
import { DataStreamWriter } from "ai";

export async function createPullRequest({
  clientRequestId,
  description,
  title,
  dataStream,
  requestSubdir,
}: {
  clientRequestId: string;
  description: string;
  title?: string;
  dataStream?: DataStreamWriter;
  requestSubdir?: string;
}) {
  console.log("triggering Pull Request creation");
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
    // TODO: remove this generation
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

  const uniqueRequestTitle = `${requestTitle
    ?.toLowerCase()
    .replace(/ /g, "-")
    // make requestTitle aa good acceptable git branch name
    .replace(/[^a-z0-9-]/g, "-")
    .substring(0, 20)}-${Date.now()}`;

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

  if (!requestSubdir) {
    // TODO: remove this randomization & set requestDIr at a different step when templateType is known.
    requestSubdir = ["alpha", "beta", "gamma", "delta", "omega", "sigma"][
      Math.floor(Math.random() * 6)
    ];
  }
  //console.log("newBranchResult", newBranchResult);

  // Create README.md file on new branch with request description
  const requestDir = `apps/${uniqueRequestTitle}/${requestSubdir}`;
  const readmeFilePath = `apps/${uniqueRequestTitle}/README.md`;
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
  //console.log("readmeFileContent", readmeFileContent);

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
  //console.log("pr", pr);

  const updatedClientRequest = await prisma.clientRequest.update({
    where: {
      id: clientRequestId,
    },
    data: {
      title: requestTitle,
      description: description,
      requestDir: requestDir,
      repoName: botProject.githubRepoName,
      prUrl: pr.data.html_url,
      prNumber: pr.data.number,
      prBranch: pr.data.head.ref,
      prTargetBranch: pr.data.base.ref,
      templateVersion: botProject.templateVersion,
      metadata: {
        pr: pr.data,
        uniqueRequestTitle: uniqueRequestTitle,
        requestSubdir: requestSubdir,
        requestFullDir: requestDir,
      },
      lastUpdatedAt: new Date(),
      updatedAt: new Date(),
      createdAt: new Date(),
    },
  });
  //console.log("updatedClientRequest", updatedClientRequest);

  // Create clientRequest.json file on new branch
  const clientRequestFilePath = `apps/${uniqueRequestTitle}/clientRequest.json`;
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
    dataStream?.writeMessageAnnotation({
      type: "thinking_dev",
      content: "Failed to update clientRequest.json",
    });
    throw new Error("Failed to update clientRequest.json");
  }

  //console.log("clientRequestFileContent", clientRequestFile);

  // Send slack message
  const slackMsg = `A new request has been created for the project: *${botProject.name}*\n\n*Title*: ${requestTitle}\n*Description*: ${description}\n*PR Link*: ${pr.data.html_url}`;
  await slackBotSdk.sendMessage({
    text: slackMsg,
    channel: MySlackChannels.microfox_updates,
    icon_url: MICROFOX_LOGO,
    username: "Microfox",
  });
  console.log("slackMsg", slackMsg);

  return updatedClientRequest;
}
