import {
  fetchGithubJson,
  fetchGithubText,
  fetchPackageReadme,
} from "@/server/convertfox/gitFetchers";
import { TaskInstanceMetaType } from "@/server/convertfox/types";
import { models } from "@/server/models";
import { ClientRequest } from "@prisma/client";
import { StreamingFucntionProps } from "@repo/ai-utils/router";
import { generateObject, tool } from "ai";
import { z } from "zod";

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
  clientRequest: ClientRequest,
  taskInstanceMeta?: TaskInstanceMetaType
) => {
  return tool({
    description:
      "Fetch required docs for a package to understand how to use it",
    parameters: z.object({
      microfoxPackages: z
        .array(z.string())
        .describe(
          "The exact names of the microfox packages to fetch docs for (@microfox/core , @microfox/aws-ses etc..)"
        ),
      externalPackages: z
        .array(z.string())
        .describe(
          "The exact names of the external packages to fetch docs for (@slack/web-api google-api-nodejs-client, stripe etc..)"
        ),
    }),
    execute: async ({ microfoxPackages, externalPackages }, options) => {
      console.log("microfoxPackages", microfoxPackages);
      console.log("externalPackages", externalPackages);
      const fetchReadMePackages = microfoxPackages.filter(
        (pkg) => pkg.includes("@microfox/") && pkg != "@microfox/null"
      );
      const readmes = await Promise.all(
        fetchReadMePackages.map(async (pkg) => {
          let readme;
          props.dataStream.writeMessageAnnotation({
            type: "loading",
            content: `Fetching documentation for ${pkg}`,
          });
          try {
            let mainReadme = await fetchPackageReadme(pkg);
            readme = mainReadme;
            // let packageInfo = await fetchGithubJson(
            //   "microfox-ai",
            //   "microfox",
            //   `/refs/heads/main/packages/${pkg.replace("@microfox/", "")}/package-info.json`
            // );
            // const isDynamicReadme =
            //   packageInfo.readme_map?.type === "dynamic_path";
            // if (isDynamicReadme) {
            //   const dynamic_setters = packageInfo.readme_map?.dynamic_setters;
            // TODO: recursively loop until you have all the readmes you need to fetch & attach
            // for (const setter of dynamic_setters) {
            //   const selectDynamicSetter = await generateObject({
            //     model: models.claude35Sonnet,
            //     schema: z.object({
            //       scopes: z.array(z.string()),
            //     }),
            //     system: `Pick the most relevant scopes that suit the task`,
            //     prompt: `Select the most relevant readmes for the package ${pkg}`,
            //   });
            // }
            // }
            console.log("fetched readme for ", pkg);
            return { readme, package: pkg };
          } catch (error) {
            console.error("Error fetching README:", error);
            return { readme: "", package: pkg };
          }
        })
      );

      console.log("all readmes", readmes.map((r) => r.package).join(", "));
      console.log(
        "readmes not found",
        readmes.filter((r) => r.readme === "").map((r) => r.package)
      );

      return readmes.concat(
        microfoxPackages
          .filter((pkg) => !pkg.includes("@microfox/"))
          .map((pkg) => ({
            readme: " No readme found for this package " + pkg,
            package: pkg,
          }))
      );
      // find my package, get some initial understanding of the package
      // accordingly fetch the readme that is most relevant for the integration

      // TODO: and then pass chunks of it to the LLM to understand the package
    },
  });
};
