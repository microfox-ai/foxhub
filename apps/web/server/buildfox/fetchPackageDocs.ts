import { ClientRequest } from "@prisma/client";
import { StreamingFucntionProps } from "@repo/ai-utils/router";
import { tool } from "ai";
import { z } from "zod";

async function fetchGithubJson(
  owner: string,
  repo: string,
  path: string
): Promise<any> {
  // GitHub raw content URL format
  const url = `https://raw.githubusercontent.com/${owner}/${repo}${path}`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching GitHub JSON:", error);
    throw error;
  }
}
async function fetchGithubReadMe(
  owner: string,
  repo: string,
  path: string
): Promise<any> {
  const url = `https://raw.githubusercontent.com/${owner}/${repo}${path}`;
  const response = await fetch(url);
  const data = await response.text();
  return data;
}

export const fetchPackageDocs = (
  props: StreamingFucntionProps<any, any>,
  clientRequest: ClientRequest
) => {
  return tool({
    description:
      "Fetch required docs for a package to understand how to use it",
    parameters: z.object({
      packages: z
        .array(z.string())
        .describe(
          "The exact names of the packages to fetch docs for (@microfox/core , @microfox/aws-ses etc..)"
        ),
    }),
    execute: async ({ packages }, options) => {
      const allPackages = await fetchGithubJson(
        "microfox-ai",
        "microfox",
        "/refs/heads/main/packages-info.json"
      );

      // find my package, get some initial understanding of the package
      // accordingly fetch the readme that is most relevant for the integration

      // TODO: and then pass chunks of it to the LLM to understand the package
    },
  });
};
