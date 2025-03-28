import { ClientRequest } from "@prisma/client";
import { StreamingFucntionProps } from "@repo/ai-utils/router";
import { tool } from "ai";
import { z } from "zod";

export async function fetchGithubJson(
  owner: string,
  repo: string,
  path: string
): Promise<any> {
  // GitHub raw content URL format
  const url = `https://raw.githubusercontent.com/${owner}/${repo}${path}`;

  console.log("fetching", url);
  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.text();
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
/** this should be removed from tools */
export const fetchPackageDocs = (
  props: StreamingFucntionProps<any, any>,
  clientRequest: ClientRequest
) => {
  return tool({
    description:
      "Fetch required docs for a package to understand how to use it",
    parameters: z.object({
      microfoxPackages: z
        .array(z.string())
        .describe(
          "The exact names of the packages to fetch docs for (@microfox/core , @microfox/aws-ses etc..)"
        ),
    }),
    execute: async ({ microfoxPackages }, options) => {
      const readmes = await Promise.all(
        microfoxPackages.map(async (pkg) => {
          let readme;
          try {
            readme = await fetchGithubJson(
              "microfox-ai",
              "microfox",
              `/refs/heads/main/packages/${pkg.replace("@microfox/", "")}/README.md`
            );
            return { readme, package: pkg };
          } catch (error) {
            console.error("Error fetching README:", error);
            return { readme: "", package: pkg };
          }
        })
      );
      return readmes;
      // find my package, get some initial understanding of the package
      // accordingly fetch the readme that is most relevant for the integration

      // TODO: and then pass chunks of it to the LLM to understand the package
    },
  });
};
