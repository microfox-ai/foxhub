import { Octokit } from "octokit";
import {
  GITHUB_TOKEN,
  TEMPLATE_REPO,
  TEMPLATE_REPO_OWNER,
} from "@/utils/constants/githubInfo";
import { ClientRequest } from "@prisma/client";
import { StreamingFucntionProps } from "@repo/ai-utils/router";

interface CloneTemplateParams {
  sourceRepo: string;
  targetRepo: string;
  sourcePath?: string;
  targetPath?: string;
  sourceBranch?: string;
  targetBranch?: string;
}

export const recloneTemplateStuffToClientRequest = async (
  props: StreamingFucntionProps<any, any>,
  clientRequest: ClientRequest
) => {
  const { dataStream } = props;
  if (!clientRequest.repoName || !clientRequest.prBranch) {
    throw new Error("Client request repo name or branch is not set");
  }
  dataStream.writeMessageAnnotation({
    type: "success",
    value: "Template stuff cloning..",
  });
  await cloneTemplate({
    sourceRepo: TEMPLATE_REPO,
    targetRepo: clientRequest.repoName,
    sourcePath: "",
    targetPath: "",
    sourceBranch: "main",
    targetBranch: clientRequest.prBranch,
  });
  dataStream.writeMessageAnnotation({
    type: "success",
    value: "Template stuff cloned to client request",
  });
};

export const cloneTemplate = async ({
  sourceRepo,
  targetRepo,
  sourcePath = "",
  targetPath = "",
  sourceBranch = "main",
  targetBranch = "main",
}: CloneTemplateParams) => {
  const octokit = new Octokit({
    auth: GITHUB_TOKEN,
  });

  try {
    const fileBlobs: { path: string; sha: string }[] = [];

    async function processContents(path: string) {
      const { data: contents } = await octokit.rest.repos.getContent({
        owner: TEMPLATE_REPO_OWNER,
        repo: sourceRepo,
        path,
        ref: sourceBranch,
      });

      if (Array.isArray(contents)) {
        for (const item of contents) {
          if (item.type === "file") {
            const { data: fileContent } = await octokit.rest.repos.getContent({
              owner: TEMPLATE_REPO_OWNER,
              repo: sourceRepo,
              path: item.path,
              ref: sourceBranch,
            });

            if (!Array.isArray(fileContent) && "content" in fileContent) {
              // Decode the base64 content
              const content = Buffer.from(
                fileContent.content,
                "base64"
              ).toString();

              // Create a blob for the file content
              const { data: blob } = await octokit.rest.git.createBlob({
                owner: TEMPLATE_REPO_OWNER,
                repo: targetRepo,
                content,
                encoding: "utf-8",
              });

              fileBlobs.push({
                path: item.path,
                sha: blob.sha,
              });
            }
          } else if (item.type === "dir") {
            await processContents(item.path);
          }
        }
      } else if ("content" in contents) {
        const targetFilePath = targetPath || contents.path;
        const content = Buffer.from(contents.content, "base64").toString();

        // Create a blob for the file content
        const { data: blob } = await octokit.rest.git.createBlob({
          owner: TEMPLATE_REPO_OWNER,
          repo: targetRepo,
          content,
          encoding: "utf-8",
        });

        fileBlobs.push({
          path: targetFilePath,
          sha: blob.sha,
        });
      }
    }

    await processContents(sourcePath);

    // Get the latest commit SHA of the target branch
    const { data: ref } = await octokit.rest.git.getRef({
      owner: TEMPLATE_REPO_OWNER,
      repo: targetRepo,
      ref: `heads/${targetBranch}`,
    });

    // Create a new tree with all the blobs
    const tree = fileBlobs.map(({ path: filePath, sha }) => ({
      path: filePath,
      mode: "100644" as const,
      type: "blob" as const,
      sha,
    }));

    const { data: newTree } = await octokit.rest.git.createTree({
      owner: TEMPLATE_REPO_OWNER,
      repo: targetRepo,
      tree,
      base_tree: ref.object.sha,
    });

    // Create a new commit
    const { data: commit } = await octokit.rest.git.createCommit({
      owner: TEMPLATE_REPO_OWNER,
      repo: targetRepo,
      message: `nodeploy: Clone template files`,
      tree: newTree.sha,
      parents: [ref.object.sha],
    });

    // Update the branch reference
    await octokit.rest.git.updateRef({
      owner: TEMPLATE_REPO_OWNER,
      repo: targetRepo,
      ref: `heads/${targetBranch}`,
      sha: commit.sha,
    });

    return { success: true };
  } catch (error) {
    console.error("Error cloning template:", error);
    throw error;
  }
};
