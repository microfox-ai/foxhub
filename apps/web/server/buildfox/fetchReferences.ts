// should fetch the reference from the database based on the task request, & its related files via git when needed.
import { tool } from "ai";
import { z } from "zod";
import { ClientRequest } from "@prisma/client";
import { prisma } from "@/prisma/prisma";
import {
  TaskInstanceMetaType,
  TaskStructure,
} from "../convertfox/helpers/types";
import path from "path";
import { Octokit } from "octokit";
import { GITHUB_TOKEN, PROJECT_REPO_OWNER } from "@/utils/constants/githubInfo";
import { AiContext } from "@repo/ai-utils/router";

const githubSdk = new Octokit({
  auth: GITHUB_TOKEN,
});

/** Tool to fetch reference code and related files based on search query */
export const fetchReferences = (
  props: AiContext<any, any, any, any>,
  clientRequest: ClientRequest
) => {
  return tool<
    {
      query: string;
      maxResults?: number;
      includeFileContents?: boolean;
    },
    {
      success: boolean;
    }
  >({
    description:
      "Fetch reference code and related files based on search criteria",
    inputSchema: z.object({
      query: z
        .string()
        .describe(
          "Search query to find relevant code examples (e.g., 'google youtube shorts api', 'salesforce b2c integration')"
        ),
      maxResults: z
        .number()
        .optional()
        .default(5)
        .describe("Maximum number of reference examples to return"),
      includeFileContents: z
        .boolean()
        .optional()
        .default(false)
        .describe("Whether to include the full file contents in the response"),
    }),
    execute: async ({ query, maxResults, includeFileContents }, options) => {
      try {
        // 1. Searching through a code database
        const taskInstanceMetas = await prisma.taskInstanceMeta.findMany({
          where: {
            initialSummary: {
              contains: query,
            },
          },
          include: {
            originClientRequest: true,
          },
          take: maxResults,
        });

        // TODO: CURRENTLY NOT_TESTED & NOT_WORKING
        const results = await Promise.all(
          (taskInstanceMetas as any[]).map(
            async (
              taskInstanceMeta: TaskInstanceMetaType & {
                originClientRequest: ClientRequest;
              }
            ) => {
              const repoName = taskInstanceMeta.originClientRequest.repoName;
              const requestDir =
                taskInstanceMeta.originClientRequest.requestDir;

              const files = taskInstanceMeta?.buildingStep?.files.filter(
                (file) => file.fileDescription?.includes(query)
              );
              if (!files || !repoName || !requestDir) {
                return null;
              }
              const fileContents = [];
              for (const file of files) {
                // 2. Making API calls to GitHub
                const fileContent = await githubSdk.rest.repos.getContent({
                  owner: PROJECT_REPO_OWNER,
                  repo: repoName,
                  path: `${requestDir}/${file.filePath}`,
                });
                if (!fileContent) {
                  return null;
                }
                fileContents.push(fileContent.data);
              }

              return {
                fileContent: fileContents,
              };
            }
          )
        );

        return {
          success: true,
          message: `Found ${results.length} references for query: ${query}`,
          results: results,
        };
      } catch (error) {
        console.error("Error fetching references:", error);
        throw new Error("Failed to fetch references");
      }
    },
  });
};
