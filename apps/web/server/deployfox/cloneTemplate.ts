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
            const targetFilePath = item.path;

            // Try to get the SHA of existing file if it exists
            let sha: string | undefined;
            try {
              const { data: existingFile } =
                await octokit.rest.repos.getContent({
                  owner: TEMPLATE_REPO_OWNER,
                  repo: targetRepo,
                  path: targetFilePath,
                  ref: targetBranch,
                });

              if (!Array.isArray(existingFile)) {
                sha = existingFile.sha;
              }
            } catch (error) {
              // File doesn't exist yet, which is fine
            }

            // Create or update the file in the target repository
            await octokit.rest.repos.createOrUpdateFileContents({
              owner: TEMPLATE_REPO_OWNER,
              repo: targetRepo,
              path: targetFilePath,
              message: `nodeploy: Clone template: ${item.path}`,
              content: fileContent.content,
              branch: targetBranch,
              ...(sha ? { sha } : {}),
            });
          }
        } else if (item.type === "dir") {
          console.log("Cloning directory:", item.path);
          // Recursively process subdirectories
          await cloneTemplate({
            sourceRepo,
            targetRepo,
            sourcePath: item.path,
            targetPath: item.path,
            sourceBranch,
            targetBranch,
          });
        }
      }
    } else if ("content" in contents) {
      // If it's a single file
      const targetFilePath = targetPath || contents.path;

      // Try to get the SHA of existing file if it exists
      let sha: string | undefined;
      try {
        const { data: existingFile } = await octokit.rest.repos.getContent({
          owner: TEMPLATE_REPO_OWNER,
          repo: targetRepo,
          path: targetFilePath,
          ref: targetBranch,
        });

        if (!Array.isArray(existingFile)) {
          sha = existingFile.sha;
        }
      } catch (error) {
        // File doesn't exist yet, which is fine
      }

      await octokit.rest.repos.createOrUpdateFileContents({
        owner: TEMPLATE_REPO_OWNER,
        repo: targetRepo,
        path: targetFilePath,
        message: `nodeploy: Clone template: ${contents.path}`,
        content: contents.content,
        branch: targetBranch,
        ...(sha ? { sha } : {}),
      });
    }

    return { success: true };
  } catch (error) {
    console.error("Error cloning template:", error);
    throw error;
  }
};
