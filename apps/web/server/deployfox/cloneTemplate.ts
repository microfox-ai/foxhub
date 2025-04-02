import { Octokit } from "octokit";
import {
  GITHUB_TOKEN,
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
  await cloneTemplate({
    sourceRepo: "shard-template",
    targetRepo: clientRequest.repoName,
    sourcePath: "src/functions",
    targetPath: "src/functions",
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
    // Get the contents of the source repository
    const { data: contents } = await octokit.rest.repos.getContent({
      owner: TEMPLATE_REPO_OWNER,
      repo: sourceRepo,
      path: sourcePath,
      ref: sourceBranch,
    });

    // Handle both single file and directory contents
    if (Array.isArray(contents)) {
      // If it's a directory, recursively process each item
      for (const item of contents) {
        if (item.type === "file") {
          // Get the file content
          const { data: fileContent } = await octokit.rest.repos.getContent({
            owner: TEMPLATE_REPO_OWNER,
            repo: sourceRepo,
            path: item.path,
            ref: sourceBranch,
          });

          if (!Array.isArray(fileContent) && "content" in fileContent) {
            // Create or update the file in the target repository
            await octokit.rest.repos.createOrUpdateFileContents({
              owner: TEMPLATE_REPO_OWNER,
              repo: targetRepo,
              path: `${targetPath}/${item.path}`,
              message: `Clone template: ${item.path}`,
              content: fileContent.content,
              branch: targetBranch,
            });
          }
        } else if (item.type === "dir") {
          // Recursively process subdirectories
          await cloneTemplate({
            sourceRepo,
            targetRepo,
            sourcePath: item.path,
            targetPath: `${targetPath}/${item.path}`,
            sourceBranch,
            targetBranch,
          });
        }
      }
    } else if ("content" in contents) {
      // If it's a single file
      await octokit.rest.repos.createOrUpdateFileContents({
        owner: TEMPLATE_REPO_OWNER,
        repo: targetRepo,
        path: targetPath || contents.path,
        message: `nodeploy: Clone template: ${contents.path}`,
        content: contents.content,
        branch: targetBranch,
      });
    }

    return { success: true };
  } catch (error) {
    console.error("Error cloning template:", error);
    throw error;
  }
};
