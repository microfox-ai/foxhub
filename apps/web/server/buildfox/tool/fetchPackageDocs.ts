import { TokenUsageAnalyticsTracker } from "@/server/analytics/helper";
import {
  fetchPackageReadme,
  fetchText,
} from "@/server/convertfox/helpers/gitFetchers";
import {
  CodeTemplateType,
  TaskInstanceMetaType,
} from "@/server/convertfox/helpers/types";
import { models } from "@/server/models";
import { PackageInfoHelper } from "@/utils/services/embeddings/packageSearch";
import { ClientRequest, ClientSecret } from "@prisma/client";
import { AiContext } from "@repo/ai-utils/router";
import { generateText, tool } from "ai";
import dedent from "dedent";
import fs from "fs/promises";
import path from "path";
import { z } from "zod";
import { baseFilePrompt } from "../prompts/basePrompt";
import { envsPrompt } from "../prompts/envsPrompt";
import { helperFilesContext } from "../prompts/helperFilesContext";
import { semanticFunctionSearch } from "./functionSearch";
import { fetchTemplateDir, readAllGenFilesList } from "./writeToFile";

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

const generateCodingBrief = async (config: {
  ctx: AiContext<any, any, any, any>;
  readmes: {
    docs: string;
    package: string;
    reason?: string;
  }[];
  template_type: CodeTemplateType;
  clientRequest?: ClientRequest;
  clientSecrets?: ClientSecret[];
  type: "lambda" | "cron";
  _function: any;
  taskInstanceMeta?: TaskInstanceMetaType;
}) => {
  const rootDir = fetchTemplateDir(config.template_type);

  const lambdaExample = await fs.readFile(
    path.join(process.cwd(), rootDir, "function.txt"),
    "utf8"
  );
  const cronExample = await fs.readFile(
    path.join(process.cwd(), rootDir, "cron.txt"),
    "utf8"
  );

  let files = await readAllGenFilesList(config.clientRequest!);

  if (!config.clientRequest || !config.taskInstanceMeta) {
    return config.readmes;
  }

  let helperFileContext = await helperFilesContext(
    config.clientRequest,
    config.taskInstanceMeta,
    files
  );
  let envsPromptContext = await envsPrompt(
    config.clientRequest,
    config.clientSecrets ?? [],
    config.taskInstanceMeta,
    files,
    config.type
  );

  const nameOfFunction = config?._function?.name
    ?.split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((word: String, index: number) =>
      index === 0
        ? word.toLowerCase()
        : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    )
    .join("");

  const codingBrief = await generateText({
    model: models.googleGeminiTwoFive,
    system: dedent`
    You are a highly experienced senior Fullstack Developer.
    You experise in writing microservices in typescript & deploy them to aws lambda functions using serverless framework.
    You understand the technical knowledge & know how to express it in layman terms, so any jr. developer can write the code.

    Key rules:
    1. Only use that part of the documentation that makes sense for the given task.
    2. The brief should by HIGHLY DETAILED, with all the steps, and the code snippets needed.
    3. With the brief, any developer should be able to write the required code.
    4. The brief should be highly accurate to what is required as detailed in Task Details.
    5. Try to use existing env variables, as much as possible
    6. No need to detail on serverless settings, that is taken care of.
    7. DO NOT ASSUME ANY HELPER FUNCTIONS OTHER THAN THE ONES THAT ARE PROVIDED.
    8. Do not ever use redis directly, always use the helper functions exported from the helper file.

    A few things about your workflow:
    - You first carefully analyse the requirements, read the docs, and then plan what needs to be done.
    - You then critisize your plan, and then refine it to this specific task.
    - if a package has ratelimits (mentioned in the docs), carefully check the docs on how to handle multiple requests.
    - if you cant find any info on how to handle ratelimits, assume a default ratelimit, so try to handle multiple requests sequentially with a for loop with inbetween delays.
    - If a package doc is not available, then you can use your own knowledge to integrate said platform

    Silly errors to avoid:
    - DO not scope env variable to tyoe of function like CRON_VARIABLE, LAMBDA_VARIABLE, keep it generalistic, so it can be reused across files if needed.
    - Do not create unnecessary env variables, carefully judge if the situation demands it, prefer to use event.body.
    `,
    prompt: `
    Generate a highly detailed brief for the given function
    based on the given docs for the packages

    The brief should explain step by step on how to code the required function.
    and how exactly to use the packages based on the given documentations.
    Only focus on giving the complete brief, but not on the actual code, 
    the code is written by another developer.

    The brief should be in a very detailed format, so that any junior developer can write the code.
    ---
    Documentation Available to you.
    ${config.readmes.map((r) => `Package: ${r.package}\n\n - Docs: \n${r.docs}`)}
    ---
    Task Details
    ${baseFilePrompt(config.type, config._function, true)}

    Helper Files Context
    ${helperFileContext}
    The .js extension is important for importing the helper files.

    DO NOT ASSUME ANY HELPER FUNCTIONS OTHER THAN THE ABOVE ONES THAT ARE PROVIDED.

    Environment Variables Context
    ${envsPromptContext}

    Example of a Function Code file
    ${config.type === "lambda" ? lambdaExample : cronExample}


    Complete example for a function stored at src/functions/${config.type === "lambda" ? "getExternalData" : "dailyMorningJob"}.ts:
    ${dedent`${config.type === "lambda" ? lambdaExample : cronExample}`}

    functionNaming should be like this:
    ${nameOfFunction}.ts in camelCase
     
    - openapi docs export should be like this: 
    export const ${config.type === "lambda" ? (nameOfFunction ?? "").charAt(0).toLowerCase() + (nameOfFunction ?? "").slice(1) : (nameOfFunction ?? "").charAt(0).toLowerCase() + (nameOfFunction ?? "").slice(1)}Docs in camelCase
    `,
    maxRetries: 1,
  });

  TokenUsageAnalyticsTracker.trackUsage({
    userId: config.ctx.request.userId,
    clientRequestId: config.ctx.request.clientRequestId,
    model: models.googleGeminiTwoFive.modelId,
    usage: codingBrief.usage,
  });

  console.log("codingBrief usage", codingBrief.usage);

  return codingBrief.text;
};

const EXCLUDED_PACKAGES_LIST = [
  "@upstash/redis",
  "puppeteer",
  "@sparticuz/chromium",
  "puppeteer-core",
  "dotenv",
];
/** this should be removed from tools */
export const fetchPackageDocs = (
  ctx: AiContext<any, any, any, any>,
  clientRequest: ClientRequest,
  taskInstanceMeta?: TaskInstanceMetaType,
  otherDetails?: {
    clientSecrets: ClientSecret[];
    type: "lambda" | "cron";
    _function: any;
  }
) => {
  return tool<
    {
      packages: {
        package: string;
        readmeSearch?: string;
      }[];
    },
    any
  >({
    description:
      "Fetch All related docs for each package to understand how to use it",
    inputSchema: z.object({
      packages: z
        .array(
          z.object({
            package: z
              .string()
              .describe(
                "The exact names of the packages to fetch docs for (@microfox/core , @slack/web-api, etc..)"
              ),
            readmeSearch: z
              .string()
              .describe(
                "What functions of this package would be needed, to implement the task"
              )
              .optional(),
          })
        )
        .describe(
          "A list of packages to fetch docs which would be needed for the task"
        ),
    }),
    execute: async ({ packages }, options) => {
      console.log("packages raw", packages);
      const fetchReadMePackages = packages.filter((pkg) =>
        pkg.package.includes("@microfox/")
          ? pkg.package != "@microfox/null"
          : !EXCLUDED_PACKAGES_LIST.includes(pkg.package) &&
            !pkg.package.startsWith("@types/")
      );
      console.log("packages filtered", fetchReadMePackages);
      const readmes = await Promise.all(
        fetchReadMePackages.map(async (pkg) => {
          let readme;
          ctx.response.writeMessageMetadata({
            loader: `Fetching documentation for ${pkg.package} - ${pkg.readmeSearch}`,
          });
          try {
            // let thisPlatform =
            //   taskInstanceMeta?.taskIntegrations?.platforms.find(
            //     (p) => p.package === pkg
            //   );
            let mainReadme = await fetchPackageReadme(pkg.package);
            let packageInfo = await PackageInfoHelper.getPackageInfo(
              pkg.package
            );
            let constructorPath;
            readme = mainReadme;
            if (!pkg.readmeSearch) {
              console.log("no reason for this platform", pkg);
              return {
                docs: readme,
                package: pkg.package,
                reason: pkg.readmeSearch,
              };
            }
            if (
              packageInfo &&
              packageInfo?.readme_map?.all_readmes?.length > 0
            ) {
              constructorPath = packageInfo?.readme_map?.all_readmes.find(
                (r: any) => r.type === "constructor"
              )?.path;
              if (constructorPath) {
                const constructorReadme = await fetchText(constructorPath);
                readme += `For constructor of this sdk - You Must use this documentation as reference, do not assume your own knowledge\n\n${constructorReadme}`;
                //console.log("constructorReadme", constructorReadme);
              }
            }

            const pakageExactName = pkg.package.startsWith("@microfox/")
              ? pkg.package
              : `@ext_${pkg.package.replaceAll("/", "#")}`;
            const platform = taskInstanceMeta?.taskIntegrations?.platforms.find(
              (p) => p.package === pkg.package
            );
            const readmeSearch = platform?.reason
              ? pkg.readmeSearch // + `\n\n${platform?.reason}`
              : pkg.readmeSearch;
            const microfoxFunction = await semanticFunctionSearch(
              pakageExactName,
              readmeSearch
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
              reason: pkg.readmeSearch,
            };
          } catch (error) {
            console.error("Error fetching README:", error);
            return {
              docs:
                "No readme found for this package " +
                pkg.package +
                ", Use your own knowledge.",
              package: pkg.package,
              reason: pkg.readmeSearch,
            };
          }
        })
      );

      console.log("all readmes", readmes.map((r) => r.package).join(", "));
      //console.log("readmes", readmes);
      const notFoundPackages = readmes
        .filter((r) => r.docs === "")
        .map((r) => r.package);
      if (notFoundPackages.length > 0) {
        console.log("readmes not found", notFoundPackages);
      }

      const foundPackages = readmes
        .filter((r) => r.docs !== "")
        .map((r) => r.package);
      if (foundPackages.length > 0) {
        console.log(
          "readmes found",
          foundPackages,
          "char length",
          readmes.map((r) => r.docs).join(", ").length
        );
      }

      // if (otherDetails?._function.name) {
      //   ctx.dataStream.writeMessageAnnotation({
      //     type: "thinking",
      //     content: `Summarizing the docs for ${otherDetails?._function.name}`,
      //   });
      // }

      // const brief = await generateCodingBrief({
      //   readmes,
      //   template_type:
      //     taskInstanceMeta?.taskStructure?.templateType ??
      //     codeTemplateType.enum.upstash_sls,
      //   clientRequest,
      //   clientSecrets: otherDetails?.clientSecrets,
      //   type: otherDetails?.type ?? "lambda",
      //   _function: otherDetails?._function,
      //   taskInstanceMeta,
      //   ctx,
      // });

      if (otherDetails?._function.name) {
        ctx.response.writeMessageMetadata({
          loader: `Coding ${otherDetails?._function.name}`,
        });
      }
      //console.log("brief", brief);
      return readmes;
    },
  });
};
