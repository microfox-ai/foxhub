import { StreamingFucntionProps } from "@repo/ai-utils/router";
import { tool } from "ai";
import fs from "fs/promises";
import { z } from "zod";
import { ClientRequest } from "@prisma/client";
import path from "path";

/** Read multiple files from the project */
export const readInternalFiles = (
  props: StreamingFucntionProps<any, any>,
  clientRequest: ClientRequest
) => {
  return tool({
    description: "Read content from multiple files in the project",
    parameters: z.object({
      filePaths: z
        .array(z.string())
        .describe(
          "Array of file paths to read from - relative to the project root"
        ),
    }),
    execute: async ({ filePaths }, options) => {
      if (!clientRequest.repoName || !clientRequest.requestDir) {
        throw new Error("Client request does not have a repo name");
      }

      try {
        const rootDir = path.join(
          clientRequest.repoName,
          clientRequest.requestDir
        );

        const fileContents = await Promise.all(
          filePaths.map(async (filePath) => {
            const fullPath = path.join(rootDir, filePath);
            try {
              const content = await fs.readFile(fullPath, "utf-8");
              return {
                filePath,
                content,
                success: true,
              };
            } catch (error) {
              console.error(`Error reading file ${filePath}:`, error);
              return {
                filePath,
                content: null,
                success: false,
                error: `Failed to read file: ${error instanceof Error ? error.message : "Unknown error"}`,
              };
            }
          })
        );

        return {
          success: true,
          files: fileContents,
        };
      } catch (error) {
        console.error("Error reading files:", error);
        throw new Error("Failed to read files");
      }
    },
  });
};
