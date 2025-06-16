"use server";

import { prisma } from "@/prisma/prisma";
import { INTERNAL_TEMPLATE_UPSTASH_ROOT } from "@/server/buildfox/tool/writeToFile";
import {
  codeTemplateType,
  TaskInstanceMetaType,
} from "@/server/convertfox/types";
import { APP_BASE_FOR_SHARD, IN_DEV } from "@/utils/constants/appInfo";
import {
  GITHUB_ACTION_POLICIES,
  GITHUB_TOKEN,
  PROJECT_BRANCH_NAME,
  PROJECT_INFO_DIR,
  PROJECT_JSON_FILE_DIR,
  PROJECT_REPO_OWNER,
  TEMPLATE_REPO,
  TEMPLATE_REPO_OWNER,
} from "@/utils/constants/githubInfo";
import fs from "fs/promises";
import { Octokit } from "octokit";
import path from "path";
import { getTemplateVersion } from "../github_functions/getTemplateVersion";
import { MinionFlow } from "@/components/screens/hooks/convertors";
import { detectOptimalAwsRegion } from "../aws/region-detector";

export async function createNewBotProject({
  userId,
  projectName,
  projectDescription,
  slug,
  homepageUrl,
  imageUrl,
}: {
  userId: string;
  projectName: string;
  projectDescription: string;
  slug?: string;
  homepageUrl?: string;
  imageUrl?: string;
}) {
  if (!userId) {
    console.error("No user ID provided");
    throw new Error("No user ID provided");
  }
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });
  if (!user || !userId) {
    console.error("User not found");
    throw new Error("User not found");
  }
  if (!GITHUB_TOKEN) {
    console.error("No Github token provided");
    throw new Error("No Github token provided");
  }
  if (!projectName || !userId) {
    console.error("Missing required fields");
    throw new Error("Missing required fields");
  }

  // Initialize Github SDK
  const githubSdk = new Octokit({
    auth: GITHUB_TOKEN,
  });

  // Create new repo from template
  const repoResult = await githubSdk.rest.repos.createUsingTemplate({
    mediaType: {
      format: "json",
    },
    template_repo: TEMPLATE_REPO,
    template_owner: TEMPLATE_REPO_OWNER,
    owner: PROJECT_REPO_OWNER,
    name: `space-${projectName.toLowerCase().replace(/ /g, "-")}-${Date.now()}`,
    description: projectDescription,
    private: true,
    include_all_branches: false,
  });
  if (!repoResult) {
    throw new Error("Failed to create bot project");
  }
  console.log("repoResult", repoResult);

  // Wait for 2 seconds to ensure the repo is created
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Create new branch from main
  const newBranch = PROJECT_BRANCH_NAME;
  const defaultBranchSha = await githubSdk.rest.git.getRef({
    owner: repoResult.data.owner.login,
    repo: repoResult.data.name,
    ref: `heads/${repoResult.data.default_branch || "main"}`,
  });
  const newBranchResult = await githubSdk.rest.git.createRef({
    owner: repoResult.data.owner.login,
    repo: repoResult.data.name,
    ref: `refs/heads/${newBranch}`,
    sha: defaultBranchSha.data.object.sha,
  });
  if (!newBranchResult) {
    throw new Error("Failed to create new branch");
  }
  console.log("newBranchResult", newBranchResult);

  // Create README.md file on new branch with project description
  const readmeFilePath = `${PROJECT_INFO_DIR}/README.md`;
  const readmeFileContent =
    await githubSdk.rest.repos.createOrUpdateFileContents({
      owner: PROJECT_REPO_OWNER,
      repo: repoResult.data.name,
      path: readmeFilePath,
      message: `Add README for ${projectName}`,
      content: Buffer.from(`DESCRIPTION: ${projectDescription}`).toString(
        "base64"
      ),
      branch: newBranch,
    });
  if (!readmeFileContent) {
    throw new Error("Failed to update README.md");
  }
  console.log("readmeFileContent", readmeFileContent);

  // Create pull request from new branch to main
  const prResult = await githubSdk.rest.pulls.create({
    mediaType: {
      format: "json",
    },
    owner: PROJECT_REPO_OWNER,
    repo: repoResult.data.name,
    base: "main",
    head: newBranch,
    title: `Project: ${projectName}`,
    body: `DESCRIPTION: ${projectDescription}`,
  });
  if (!prResult) {
    throw new Error("Failed to create new pull request");
  }
  console.log("prResult", prResult);
  const templateVersion = await getTemplateVersion();

  // Detect optimal AWS region based on request metadata
  const regionInfo = await detectOptimalAwsRegion();
  console.log(`AWS Region Detection: ${regionInfo.reasoning}`);

  // Save botProject to DB
  const botProject = await prisma.botProject.create({
    data: {
      userId,
      name: projectName,
      githubRepoName: repoResult.data.name,
      githubRepoUrl: repoResult.data.html_url,
      githubRepoBranch: newBranch,
      projectDir: PROJECT_INFO_DIR,
      prUrl: prResult.data.html_url,
      prNumber: prResult.data.number,
      description: projectDescription,
      homepageUrl: homepageUrl,
      imageUrl: imageUrl,
      slug: slug,
      templateVersion,
      awsRegion: regionInfo.region,
      metadata: {
        repo: repoResult.data as any,
        pr: prResult.data as any,
        regionDetection: {
          detectedRegion: regionInfo.region,
          geoInfo: regionInfo.geoInfo,
          reasoning: regionInfo.reasoning,
          detectedAt: new Date().toISOString(),
        } as any,
      },
      permissions: {
        create: {
          userId: userId,
          accessType: "WRITE",
          role: "OWNER",
        },
      },
    },
    include: {
      permissions: {
        include: {
          user: true,
        },
      },
    },
  });
  if (!botProject) {
    throw new Error("Failed to create bot project");
  }
  console.log("botProject", botProject);

  // await createClientMongoDB({
  //     userId: botProject.userId,
  //     botProjectId: botProject.id,
  //     name: repoResult.data.name,
  // });

  await addGithubSecretsToRepo({
    githubSdk,
    repoName: repoResult.data.name,
  });

  // Create botProject.json file
  const botProjectData = {
    ...botProject,
    server_url: APP_BASE_FOR_SHARD,
    server_env: IN_DEV ? "staging" : "production",
  };
  const botProjectFile = await githubSdk.rest.repos.createOrUpdateFileContents({
    owner: PROJECT_REPO_OWNER,
    repo: repoResult.data.name,
    path: PROJECT_JSON_FILE_DIR,
    message: `Add initial configs to the project`,
    content: Buffer.from(JSON.stringify(botProjectData, null, 2)).toString(
      "base64"
    ),
    branch: newBranch,
  });
  if (!botProjectFile) {
    console.log("botProjectFile", botProjectFile);
    throw new Error("Failed to update botProject.json");
  }
  console.log("botProjectFile", botProjectFile);

  // Create empty ClientRequest with awsRegion from botProject
  const clientRequest =
    (await prisma.clientRequest.create({
      data: {
        botProjectId: botProject.id,
        userId,
        title: "Untitled",
        description: "",
        minionFlow: MinionFlow.Unknown,
        awsRegion: botProject.awsRegion,
      },
    })) || {};

  return { ...botProject, clientRequests: [clientRequest] };
}

export async function createOrUpdateRepoVariable({
  githubSdk,
  repoName,
  name,
  value,
  variables,
}: {
  githubSdk: Octokit;
  repoName: string;
  name: string;
  value: string;
  variables: { name: string; value: string }[];
}) {
  if (variables.find((variable) => variable.name === name)) {
    await githubSdk.rest.actions.updateRepoVariable({
      owner: PROJECT_REPO_OWNER,
      repo: repoName,
      name: name,
      value: value,
    });
  } else {
    await githubSdk.rest.actions.createRepoVariable({
      owner: PROJECT_REPO_OWNER,
      repo: repoName,
      name: name,
      value: value,
    });
  }
}

export async function addGithubSecretsToRepo({
  githubSdk,
  repoName,
  taskInstanceMeta,
}: {
  githubSdk?: Octokit;
  repoName: string;
  taskInstanceMeta?: TaskInstanceMetaType;
}) {
  const awsAccessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const awsSecretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const awsDefaultRegion = process.env.AWS_REGION;
  const microfoxApiKey = process.env.MICROFOX_API_KEY;

  const thisSdk =
    githubSdk ??
    new Octokit({
      auth: GITHUB_TOKEN,
    });

  const alreadyListedVariables = await thisSdk.rest.actions.listRepoVariables({
    owner: PROJECT_REPO_OWNER,
    repo: repoName,
  });

  //console.log("taskInstanceMeta", repoName, PROJECT_REPO_OWNER);
  try {
    if (
      taskInstanceMeta?.taskStructure?.templateType ===
      codeTemplateType.enum.upstash_sls
    ) {
      const upstashEnvsFile = await fs.readFile(
        path.join(process.cwd(), INTERNAL_TEMPLATE_UPSTASH_ROOT, "/envs.json"),
        "utf8"
      );
      const upstashEnvs = JSON.parse(upstashEnvsFile);
      //console.log("upstashEnvs", upstashEnvs);
      // PROD TODO: the envs only are for staging, production envs need to be added manually in env variables
      for (const env of upstashEnvs) {
        createOrUpdateRepoVariable({
          githubSdk: thisSdk,
          repoName: repoName,
          name: env.key,
          value: IN_DEV ? env.value : (process.env[env.key] ?? env.value),
          variables: alreadyListedVariables.data.variables,
        });
      }
    }

    if (
      awsAccessKeyId &&
      awsSecretAccessKey &&
      awsDefaultRegion &&
      microfoxApiKey
    ) {
      createOrUpdateRepoVariable({
        githubSdk: thisSdk,
        repoName: repoName,
        name: "AWS_ACCESS_KEY_ID",
        value: awsAccessKeyId,
        variables: alreadyListedVariables.data.variables,
      });
      createOrUpdateRepoVariable({
        githubSdk: thisSdk,
        repoName: repoName,
        name: "AWS_SECRET_ACCESS_KEY",
        value: awsSecretAccessKey,
        variables: alreadyListedVariables.data.variables,
      });
      createOrUpdateRepoVariable({
        githubSdk: thisSdk,
        repoName: repoName,
        name: "AWS_DEFAULT_REGION",
        value: awsDefaultRegion,
        variables: alreadyListedVariables.data.variables,
      });
      createOrUpdateRepoVariable({
        githubSdk: thisSdk,
        repoName: repoName,
        name: "MICROFOX_API_KEY",
        value: microfoxApiKey,
        variables: alreadyListedVariables.data.variables,
      });
    }
  } catch (error) {
    console.error(
      "Error adding github secrets to repo",
      JSON.stringify((error as any)?.response)
    );
    throw new Error("Error adding github secrets to repo");
  }
}
