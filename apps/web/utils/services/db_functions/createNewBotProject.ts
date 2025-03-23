import { prisma } from "@/prisma/prisma";
import { APP_BASE_FOR_SHARD, IN_DEV } from "@/utils/constants/appInfo";
import { GITHUB_TOKEN, PROJECT_BRANCH_NAME, PROJECT_INFO_DIR, PROJECT_JSON_FILE_DIR, TEMPLATE_REPO_OWNER } from "@/utils/constants/githubInfo";
import { TEMPLATE_REPO } from "@/utils/constants/githubInfo";
import { Octokit } from "octokit";

export async function createNewBotProject({
    userId,
    projectName,
    projectDescription,
}: {
    userId: string;
    projectName: string;
    projectDescription: string;
}) {
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
        private: true,
        name: `space-${projectName.toLowerCase().replace(/ /g, "-")}-${Date.now()}`,
        description: projectDescription,
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
    const newBranchResult = await githubSdk.rest.git.createRef({
        owner: TEMPLATE_REPO_OWNER,
        repo: repoResult.data.name,
        ref: `refs/heads/${newBranch}`,
        sha: repoResult.data.default_branch,
    });
    if (!newBranchResult) {
        throw new Error("Failed to create new branch");
    }
    console.log("newBranchResult", newBranchResult);

    // Create README.md file on new branch with project description
    const readmeFilePath = `${PROJECT_INFO_DIR}/README.md`;
    const readmeFileContent = await githubSdk.rest.repos.createOrUpdateFileContents({
        owner: TEMPLATE_REPO_OWNER,
        repo: repoResult.data.name,
        path: readmeFilePath,
        message: `Add README for ${projectName}`,
        content: `DESCRIPTION: ${projectDescription}`,
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
        owner: TEMPLATE_REPO_OWNER,
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
            metadata: {
                repo: repoResult.data as any,
                pr: prResult.data as any,
            },
        },
    });
    if (!botProject) {
        throw new Error("Failed to create bot project");
    }
    console.log("botProject", botProject);

    // Create botProject.json file
    const botProjectData = {
        ...botProject,
        server_url: APP_BASE_FOR_SHARD,
        server_env: IN_DEV ? "staging" : "production",
    };
    const botProjectFile = await githubSdk.rest.repos.createOrUpdateFileContents({
        owner: TEMPLATE_REPO_OWNER,
        repo: repoResult.data.name,
        path: PROJECT_JSON_FILE_DIR,
        message: `Add initial configs to the project`,
        content: JSON.stringify(botProjectData, null, 2),
        branch: newBranch,
    });
    if (!botProjectFile) {
        throw new Error("Failed to update botProject.json");
    }
    console.log("botProjectFile", botProjectFile);

    // Create empty ClientRequest
    const clientRequest = await prisma.clientRequest.create({
        data: {
            botProjectId: botProject.id,
            userId,
            title: "Untitled",
        },
    }) || {};

    return { ...botProject, clientRequests: [clientRequest] };
}
