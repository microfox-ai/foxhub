import {
  fetchGithubJson,
  fetchGithubText,
  fetchPackageInfo,
  fetchPackageReadme,
  fetchText,
} from "@/server/convertfox/gitFetchers";
import { TaskInstanceMetaType } from "@/server/convertfox/types";
import { models } from "@/server/models";
import { ClientRequest } from "@prisma/client";
import { StreamingFucntionProps } from "@repo/ai-utils/router";
import { generateObject, tool } from "ai";
import { z } from "zod";
import { semanticFunctionSearch } from "./functionSearch";

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

const EXCLUDED_PACKAGES_LIST = [
  "@upstash/redis",
  "puppeteer",
  "@sparticuz/chromium",
  "puppeteer-core",
  "dotenv",
];
/** this should be removed from tools */
export const fetchPackageDocs = (
  props: StreamingFucntionProps<any, any>,
  clientRequest: ClientRequest,
  taskInstanceMeta?: TaskInstanceMetaType
) => {
  return tool({
    description:
      "Fetch All related docs for each package to understand how to use it",
    parameters: z.object({
      packages: z.array(
        z.object({
          package: z
            .string()
            .describe(
              "The exact names of all the packages to fetch docs for (@microfox/core , @slack/web-api, etc..)"
            ),
          readmeSearch: z
            .string()
            .describe(
              "What functions of this package would be needed, to implement the task"
            )
            .optional(),
        })
      ),
    }),
    execute: async ({ packages }, options) => {
      const fetchReadMePackages = packages.filter((pkg) =>
        pkg.package.includes("@microfox/")
          ? pkg.package != "@microfox/null"
          : !EXCLUDED_PACKAGES_LIST.includes(pkg.package) &&
            !pkg.package.startsWith("@types/")
      );
      console.log("packages", fetchReadMePackages);
      const readmes = await Promise.all(
        fetchReadMePackages.map(async (pkg) => {
          let readme;
          props.dataStream.writeMessageAnnotation({
            type: "loading",
            content: `Fetching documentation for ${pkg.package} - ${pkg.readmeSearch}`,
          });
          try {
            // let thisPlatform =
            //   taskInstanceMeta?.taskIntegrations?.platforms.find(
            //     (p) => p.package === pkg
            //   );
            let mainReadme = await fetchPackageReadme(pkg.package);
            let packageInfo = await fetchPackageInfo(pkg.package);
            let constructorPath;
            readme = mainReadme;
            if (!pkg.readmeSearch) {
              console.log("no reason for this platform", pkg);
              return { readme, package: pkg };
            }
            if (packageInfo.readme_map?.all_readmes?.length > 0) {
              constructorPath = packageInfo.readme_map?.all_readmes.find(
                (r: any) => r.type === "constructor"
              )?.path;
              if (constructorPath) {
                const constructorReadme = await fetchText(constructorPath);
                readme += `\n\n${constructorReadme}`;
                //console.log("constructorReadme", constructorReadme);
              }
            }

            const pakageExactName = pkg.package.startsWith("@microfox/")
              ? pkg.package
              : `@ext_${pkg.package.replaceAll("/", "#")}`;
            const microfoxFunction = await semanticFunctionSearch(
              pakageExactName,
              pkg.readmeSearch
            );
            //console.log("functions", microfoxFunction);
            for (const _function of microfoxFunction) {
              if (
                _function.similarity > 1.5 &&
                readme.length < 10000 &&
                !_function.file_path.includes(`${pakageExactName}/README.md`)
              ) {
                console.log("function pattern hit", _function.function_name);
                readme += `\n\n${_function.content}`;
              }
            }
            console.log("readme char size", readme.length);
            console.log("fetched readme for ", pkg);
            return {
              docs: readme,
              package: pkg.package,
              // reason: pkg.readmeSearch,
            };
          } catch (error) {
            console.error("Error fetching README:", error);
            return {
              docs:
                "No readme found for this package " +
                pkg.package +
                ", Use your own knowledge.",
              package: pkg.package,
              //reason: pkg.readmeSearch,
            };
          }
        })
      );

      console.log("all readmes", readmes.map((r) => r.package).join(", "));
      //console.log("readmes", readmes);
      console.log(
        "readmes not found",
        readmes.filter((r) => r.readme === "").map((r) => r.package)
      );

      return readmes;
    },
  });
};
