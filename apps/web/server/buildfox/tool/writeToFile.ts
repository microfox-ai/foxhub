import {
  codeTemplateAddon,
  codeTemplateType,
  CodeTemplateType,
} from "@/server/convertfox/types";
import { ClientRequest } from "@prisma/client";
import { StreamingFucntionProps } from "@repo/ai-utils/router";
import { tool } from "ai";
import dedent from "dedent";
import fs from "fs/promises";
import path from "path";
import { z } from "zod";
// GIT - 1000 requests per hour per repo

export const INTERNAL_TEMPLATE_PLAIN_ROOT = `server/buildfox/templates/serverless/plain`;
export const INTERNAL_TEMPLATE_UPSTASH_ROOT = `server/buildfox/templates/serverless/upstash`;
export const INTERNAL_TEMPLATE_MONGODB_ROOT = `server/buildfox/templates/serverless/mongodb`;

export const INTERNAL_TEMPLATE_ADDON_PUPPETEER_ROOT = `server/buildfox/templates/serverless/addons/puppeteer`;

export const fetchTemplateDir = (templateType?: CodeTemplateType) => {
  // if (templateType === codeTemplateType.enum.plain_sls) {
  //   return INTERNAL_TEMPLATE_PLAIN_ROOT;
  // }
  if (templateType === codeTemplateType.enum.upstash_sls) {
    return INTERNAL_TEMPLATE_UPSTASH_ROOT;
  }
  return INTERNAL_TEMPLATE_PLAIN_ROOT;
};

export const fetchAddonDir = (addon: string) => {
  if (addon === codeTemplateAddon.enum.sls_puppeteer_chrome) {
    return INTERNAL_TEMPLATE_ADDON_PUPPETEER_ROOT;
  }
  return INTERNAL_TEMPLATE_PLAIN_ROOT;
};

export const getRootDir = async (clientRequest: ClientRequest) => {
  if (!clientRequest.repoName || !clientRequest.requestDir) {
    throw new Error("Client request does not have a repo name or request dir");
  }
  return path.join(clientRequest.repoName, clientRequest.requestDir);
};

export const getFilePath = async (
  clientRequest: ClientRequest,
  props: {
    fileName: string;
    filePath: string;
    fileType: string;
  }
) => {
  if (!clientRequest.repoName || !clientRequest.requestDir) {
    throw new Error("Client request does not have a repo name or request dir");
  }
  const rootDir = path.join(clientRequest.repoName, clientRequest.requestDir); // space-personal-space-1742837067481/apps/linkedin-hiring-flow-1742970093645
  const fullPath = path.join(rootDir, props.filePath); // src/db or prisma
  let fileWritePath = fullPath; // path.join(fullPath, `${fileName}.${fileType}`);

  if (fileWritePath.indexOf(".") === -1) {
    if (props.fileName.endsWith(props.fileType)) {
      fileWritePath = path.join(fileWritePath, props.fileName);
    } else {
      fileWritePath = path.join(
        fileWritePath,
        `${props.fileName}.${props.fileType}`
      );
    }
  }

  // Create directories recursively if they don't exist
  const dirPath = path.dirname(fileWritePath);
  //console.log("dirPath", dirPath);
  await fs.mkdir(dirPath, { recursive: true });
  // Write file content
  return { fileWritePath, dirPath, rootDir };
};

export const writeToFileSystem = async (
  props: {
    fileName: string;
    filePath: string;
    fileType: string;
    content: string;
    meta?: any;
  },
  clientRequest: ClientRequest
) => {
  if (
    !clientRequest.prBranch ||
    !clientRequest.repoName ||
    !clientRequest.requestDir
  ) {
    throw new Error("Client request does not have a branch or repo name");
  }
  const { fileWritePath } = await getFilePath(clientRequest, props);
  await fs.writeFile(fileWritePath, props.content, "utf-8");
};

export const writeToFileSystemAndUpdateSteps = async (
  props: {
    fileName: string;
    filePath: string;
    fileType: string;
    content: string;
    meta?: any;
  },
  clientRequest: ClientRequest
) => {
  await writeToFileSystem(props, clientRequest);
  //await updateSteps(clientRequest, props);
};

export const deleteAllGenFiles = async (clientRequest: ClientRequest) => {
  const rootDir = await getRootDir(clientRequest);
  await fs.rm(rootDir, { recursive: true, force: true, maxRetries: 3 });
};

export const readAllGenFilesList = async (
  clientRequest: ClientRequest,
  withPackages?: boolean
) => {
  const rootDir = await getRootDir(clientRequest);
  // read all the files in the rootDir
  const files = await fs.readdir(rootDir, {
    recursive: true,
    withFileTypes: true,
  });
  let filesList = files
    .filter((file) => !file.isDirectory())
    .map((file) => ({
      fileName: file.name,
      filePath: path.join(file.parentPath, file.name),
      fileType: file.name.split(".").pop(),
      meta: {},
    }));
  filesList = await Promise.all(
    filesList.map(async (file) => {
      if (
        file.fileType != "ts" &&
        file.fileType != "tsx" &&
        file.fileType != "js"
      ) {
        return file;
      }
      const fileContent = await fs.readFile(file.filePath, "utf-8");
      /**
     * detect regex for statements like
      import  pkg from "@hello"
      import { pkg } from "@hello"
      import * as pkg from "@hello"
      import _pkg from '@hello'
      hello can be anything, pkg can be anything I need an array like - ["@hellos", "@hello"] 
     */
      const packagesUsed = fileContent
        .match(
          /import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+))\s+from\s+['"]([^'"]+)['"]/g
        )
        ?.map((match) => {
          const matches = match.match(/from\s+['"]([^'"]+)['"]/);
          const pkg = matches?.[1];
          // Only include if it's a package (starts with @ or a letter, and doesn't contain . or /)
          return pkg &&
            !pkg.startsWith(".") &&
            !pkg.startsWith("/") &&
            !pkg.includes(".")
            ? pkg
            : undefined;
        })
        .filter(Boolean);
      const envVariablesUsed = fileContent
        .match(/process\.env\.([\w]+)/g)
        ?.map((match) => {
          const matches = match.match(/process\.env\.([\w]+)/);
          return matches?.[1];
        });
      const importsUsed =
        fileContent
          .match(
            /import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+))\s+from\s+['"]([^'"]+)['"]/g
          )
          ?.map((match: string) => {
            const matches = match.match(/from\s+['"]([^'"]+)['"]/);
            return matches?.[1];
          })
          .filter(Boolean) || [];
      if (withPackages) {
        return {
          ...file,
          meta: {
            packagesUsed:
              packagesUsed?.filter(
                (pkg) => pkg != undefined && pkg != "undefined"
              ) ?? [],
            envVariablesUsed: envVariablesUsed ?? [],
            importsUsed: importsUsed ?? [],
          },
        };
      }
      return file;
    })
  );
  //console.log("filesList", filesList);
  return filesList;
};
const fileExists = async (path: string) =>
  !!(await fs.stat(path).catch((e) => false));

export const updateSteps = async (
  clientRequest: ClientRequest,
  props: {
    fileName: string;
    filePath: string;
    fileType: string;
    content: string;
    meta?: any;
  }
) => {
  const { rootDir } = await getFilePath(clientRequest, props);
  let steps = [];
  let stepsFileExists = await fileExists(path.join(rootDir, "steps.json"));
  if (stepsFileExists) {
    try {
      const fileContent = await fs.readFile(
        path.join(rootDir, "steps.json"),
        "utf-8"
      );
      //console.log("fileContent", fileContent);
      steps = JSON.parse(fileContent ?? "[]");
    } catch (error) {
      console.log("error", error);
    }
  }
  steps = steps.filter((step: any) => step.fileName !== props.fileName);
  steps.push({
    fileName: props.fileName,
    filePath: props.filePath,
    fileType: props.fileType,
    timestamp: new Date().toISOString(),
    contentSize: props.content?.length ?? 0,
    meta: props.meta,
  });
  //console.log("steps", steps);
  await fs.writeFile(
    path.join(rootDir, "steps.json"),
    JSON.stringify(steps, null, 2),
    "utf-8"
  );
};

/** Thinking tool */
export const writeToFile = (
  props: StreamingFucntionProps<any, any>,
  clientRequest: ClientRequest,
  templateType?: CodeTemplateType
) => {
  return tool({
    description:
      "Write code to a specific file in the project. CRITICAL: fileContent parameter must contain complete, working code - never empty or placeholder text.",
    parameters: z.object({
      fileName: z.string().describe("The name of the file to write to"),
      filePath: z
        .string()
        .describe(
          "The complete file path to write to - relative to the project root"
        ),
      fileType: z
        .string()
        .describe("The type of file to write to - ts, tsx, json, etc"),
      fileContent: z
        .string()
        .min(1, "fileContent cannot be empty - it must contain the actual code")
        .describe(
          "The code content to write to the file - MUST required, as it holds the actual code. This parameter is MANDATORY and must contain complete, working code."
        ),
      // packagesUsed: z
      //   .array(z.string())
      //   .describe(
      //     "The packages used in the file - @microfox/core, @microfox/aws-ses etc.."
      //   )
      //   .optional(),
    }),
    execute: async ({ fileName, filePath, fileType, fileContent }, options) => {
      try {
        // Validate fileContent is not empty or placeholder
        if (!fileContent || fileContent.trim().length === 0) {
          throw new Error(
            "fileContent parameter is required and cannot be empty. You must provide the complete, actual code content."
          );
        }

        // Check for common placeholder patterns
        const placeholderPatterns = [
          /\/\/\s*code\s*goes\s*here/i,
          /\/\/\s*todo/i,
          /\/\/\s*implement/i,
          /\/\/\s*placeholder/i,
          /\/\*\s*code\s*goes\s*here\s*\*\//i,
          /\/\*\s*todo\s*\*\//i,
        ];

        const hasPlaceholders = placeholderPatterns.some((pattern) =>
          pattern.test(fileContent)
        );
        if (hasPlaceholders) {
          throw new Error(
            "fileContent contains placeholder text. You must provide complete, working code, not placeholders or TODO comments."
          );
        }

        console.log(
          "updatedFileContent",
          //updatedFileContent,
          fileName,
          filePath,
          fileType
        );
        props.dataStream.writeMessageAnnotation({
          type: "thinking",
          content: `Coding ${fileName}`,
        });
        await writeToFileSystemAndUpdateSteps(
          {
            fileName,
            filePath,
            fileType,
            content: fileContent, //.replace(/\\`/g, "`").replace(/\\'/g, "'"),
            meta: {
              //packagesUsed,
              timestamp: new Date().toISOString(),
            },
          },
          clientRequest
        );
      } catch (error) {
        console.log("error", error);
        throw new Error("Failed to add file");
      }
      return {
        success: true,
        message: `File ${fileName} updated successfully`,
        filePath: filePath,
        fileType: fileType,
      };
    },
  });
};
