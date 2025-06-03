import { ClientRequest } from "@prisma/client";
import { StreamingFucntionProps } from "@repo/ai-utils/router";
import { tool } from "ai";
import { z } from "zod";
import { PROJECT_REPO_OWNER } from "@/utils/constants/githubInfo";
import { Octokit } from "octokit";
import path from "path"; // Import path module
import { octokitSdk } from "@/server/buildfox/helper/gitHelpers";
/** Thinking tool */
export const editFile = (
  props: StreamingFucntionProps<any, any>,
  clientRequest: ClientRequest
) => {
  return tool({
    description: "Write code to a specific file in the project",
    parameters: z.object({
      filePath: z
        .string()
        .describe(
          "The complete file path to write to, including the extension"
        ),
      content: z.string().describe("The new content for the file"), // Updated description
    }),
    execute: async ({ filePath, content }, options) => {
      try {
        props.dataStream.writeMessageAnnotation({
          type: "thinking",
          content: `Editing ${filePath.split("/").pop()}`,
        });

        if (!clientRequest.repoName || !clientRequest.prBranch) {
          throw new Error(
            "Repository name or PR branch not found in client request"
          );
        }

        // Extract filename for commit message
        const fileName = path.basename(filePath);
        const commitMessage = `microcode: hotfix: updatefox: ${fileName}`;

        // Get current file SHA to update it
        let currentSha: string | undefined;
        try {
          const currentFile = await octokitSdk.rest.repos.getContent({
            owner: PROJECT_REPO_OWNER,
            repo: clientRequest.repoName,
            path: filePath.startsWith(clientRequest.repoName)
              ? filePath.replaceAll(clientRequest.repoName + "/", "")
              : filePath, // Assuming filePath might contain repoName prefix
            ref: clientRequest.prBranch,
          });
          // Check if it's a file and get SHA
          if (
            currentFile.data &&
            "sha" in currentFile.data &&
            currentFile.data.type === "file"
          ) {
            currentSha = currentFile.data.sha;
          } else if (currentFile.data && Array.isArray(currentFile.data)) {
            throw new Error(`Path ${filePath} is a directory, not a file.`);
          }
          // If it's not a file or doesn't exist, currentSha remains undefined (create new file)
        } catch (error: any) {
          // If file not found (404), proceed to create it. Otherwise, rethrow.
          if (error.status !== 404) {
            throw error;
          }
          console.log(`File ${filePath} not found, creating new file.`);
        }

        // Encode the new content
        const encodedContent = Buffer.from(content).toString("base64");

        // Create or update the file
        await octokitSdk.rest.repos.createOrUpdateFileContents({
          owner: PROJECT_REPO_OWNER,
          repo: clientRequest.repoName,
          path: filePath.startsWith(clientRequest.repoName)
            ? filePath.replaceAll(clientRequest.repoName + "/", "")
            : filePath, // Adjust path if needed
          message: commitMessage,
          content: encodedContent,
          branch: clientRequest.prBranch,
          sha: currentSha, // Provide SHA if updating an existing file
        });

        // TODO: check for any new added envs that are not in the type:custom, add them there, now.

        props.dataStream.writeMessageAnnotation({
          type: "update",
          content: `Successfully updated ${filePath.split("/").pop()}`,
        });
      } catch (error) {
        console.error(`Error editing file ${filePath}:`, error);
        const message = error instanceof Error ? error.message : String(error);
        props.dataStream.writeMessageAnnotation({
          type: "error",
          content: `Failed to edit file: ${message}`,
        });
        throw new Error(`Failed to edit file: ${message}`);
      }
      return {
        success: true,
        message: `File ${filePath} updated successfully`,
        filePath: filePath,
      };
    },
  });
};

export const readFile = (
  props: StreamingFucntionProps<any, any>,
  clientRequest: ClientRequest
) => {
  return tool({
    description: "Read a specific file in the project",
    parameters: z.object({
      filePath: z
        .string()
        .describe("The complete file path to read, including the extension"),
    }),
    execute: async ({ filePath }, options) => {
      try {
        if (!clientRequest.repoName || !clientRequest.prBranch) {
          throw new Error(
            "Repository name or PR branch not found in client request"
          );
        }

        props.dataStream.writeMessageAnnotation({
          type: "loading",
          content: `Reading ${filePath.split("/").pop()}`,
        });

        const fileContent = await octokitSdk.rest.repos.getContent({
          owner: PROJECT_REPO_OWNER,
          repo: clientRequest.repoName,
          path: filePath.replaceAll(clientRequest.repoName + "/", ""),
          ref: clientRequest.prBranch,
        });

        if (!fileContent || !fileContent.data) {
          throw new Error(`File ${filePath} not found in repository`);
        }

        // Check if the response is for a file and has content
        if (
          Array.isArray(fileContent.data) ||
          !("content" in fileContent.data)
        ) {
          throw new Error(
            `Path ${filePath} is not a file or content is missing.`
          );
        }

        // Decode base64 content
        const decodedContent = Buffer.from(
          fileContent.data.content, // Access the content property
          "base64"
        ).toString("utf-8");

        return {
          success: true,
          message: `File ${filePath} read successfully`,
          content: decodedContent,
        };
      } catch (error) {
        console.error("Error reading file:", error);
        // Type check for error message
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to read file: ${message}`);
      }
    },
  });
};
