import { ClientRequest, TaskInstanceMeta } from "@prisma/client";
import {
  TaskCronJob,
  taskCronJob,
  TaskDBSchema,
  taskDBSchema,
  taskInfo,
  TaskInstanceMetaType,
  TaskLambdaFunction,
  taskLambdaFunction,
} from "./types";
import {
  getFunctionNameFromKebabCase,
  getKebabCaseFunctionNameFromCamelCase,
} from "../buildfox/prompt.coding";
import { Octokit } from "octokit";
import { PROJECT_REPO_OWNER, GITHUB_TOKEN } from "@/utils/constants/githubInfo";
import dedent from "dedent";
import { generateObject } from "ai";
import { models } from "../models";
import { z } from "zod";
import { TokenUsageAnalyticsTracker } from "../analytics/helper";

type CommitFile = {
  filename: string;
  status:
    | "added"
    | "removed"
    | "modified"
    | "renamed"
    | "copied"
    | "changed"
    | "unchanged";
  additions: number;
  deletions: number;
  changes: number;
  patch?: string;
};

export const getCommitChanges = async ({
  enableGitFetch,
  commitSha,
  repoName,
  filesChanged,
}: {
  enableGitFetch: boolean;
  commitSha: string;
  repoName: string;
  filesChanged: string[];
}): Promise<CommitFile[]> => {
  let commitFiles: CommitFile[] = [];

  // If enableGitFetch is true, use Octokit to get file diffs for the commitSha
  if (enableGitFetch && commitSha && repoName) {
    try {
      console.log(`Fetching file diffs for commit ${commitSha} using Octokit`);

      const octokit = new Octokit({
        auth: GITHUB_TOKEN,
      });

      // Get the commit details which includes file changes
      const { data: commitData } = await octokit.rest.repos.getCommit({
        owner: PROJECT_REPO_OWNER,
        repo: repoName,
        ref: commitSha,
      });

      // Extract files that were changed in this commit
      commitFiles = commitData.files || [];

      console.log(
        `Found ${commitFiles.length} changed files from commit:`,
        commitFiles
      );
    } catch (error) {
      console.error("Error fetching commit data from GitHub:", error);
      // Fall back to using the originally provided filesChanged array
      console.log("Falling back to provided filesChanged array");
    }
  }

  return commitFiles;
};

export const updateBuildStepFiles = (
  buildingStep: any,
  commitFiles: CommitFile[],
  repoName: string
) => {
  const buildFiles = buildingStep?.files;
  const buildFilesMap = new Map<string, any>();

  buildFiles.forEach((file: any) => {
    buildFilesMap.set(file.filePath.replace(repoName + "/", ""), file);
  });

  commitFiles.forEach((file) => {
    const isInBuildFiles = buildFilesMap.get(file.filename);
    switch (file.status) {
      case "added":
        buildFilesMap.set(file.filename, {
          filePath: repoName + "/" + file.filename,
          fileName: file.filename.split("/").pop(),
          fileType: file.filename.split(".").pop(),
          meta: {
            ...isInBuildFiles?.meta,
          },
        });
        break;
      case "removed":
        buildFilesMap.delete(file.filename);
        break;
      case "modified":
        buildFilesMap.set(file.filename, {
          filePath: repoName + "/" + file.filename,
          fileName: file.filename.split("/").pop(),
          fileType: file.filename.split(".").pop(),
          meta: {
            ...isInBuildFiles?.meta,
          },
        });
        break;
      case "changed":
        buildFilesMap.set(file.filename, {
          filePath: repoName + "/" + file.filename,
          fileName: file.filename.split("/").pop(),
          fileType: file.filename.split(".").pop(),
          meta: {
            ...isInBuildFiles?.meta,
          },
        });
        break;
      case "renamed":
        console.error("File renamed: ", file.filename);
        break;
    }
  });

  return Array.from(buildFilesMap.values());
};

export const modifyTaskStructureBasedOnCommitFiles = async (
  taskStructure: TaskInstanceMetaType["taskStructure"],
  commitFiles: CommitFile[],
  clientRequest: ClientRequest
) => {
  let updatedTaskStructure = {
    ...taskStructure,
  };
  const lambdaMap = new Map<string, TaskLambdaFunction>();
  const cronJobMap = new Map<string, TaskCronJob>();
  const dbSchemaMap = new Map<string, { dbSchemas: TaskDBSchema[] }>();

  let prompt = `
  The following are the meta information for the lambdaFunctions, cronJobs and dbSchemas that currently exist in the task:
  `;

  updatedTaskStructure?.lambdaFunctions?.forEach((lambdaFunction) => {
    lambdaMap.set(getFunctionNameFromKebabCase(lambdaFunction.name) + ".ts", {
      ...lambdaFunction,
      name: getFunctionNameFromKebabCase(lambdaFunction.name),
    });
    prompt += dedent`
    lambdaFunction: ${JSON.stringify(lambdaFunction)}
    `;
  });
  updatedTaskStructure?.cronJobs?.forEach((cronJob) => {
    cronJobMap.set(getFunctionNameFromKebabCase(cronJob.name) + ".ts", {
      ...cronJob,
      name: getFunctionNameFromKebabCase(cronJob.name),
    });
    prompt += dedent`
    cronJob: ${JSON.stringify(cronJob)}
    `;
  });
  if (updatedTaskStructure?.dbSchemas) {
    dbSchemaMap.set("redis.ts", { dbSchemas: updatedTaskStructure?.dbSchemas });
    prompt += dedent`
    dbSchemas in redis.ts: ${JSON.stringify(dbSchemaMap.get("redis.ts"))}
    `;
  }

  prompt += dedent`
  The following are the files that have been added/changed in the commit:
  `;

  commitFiles.forEach((file) => {
    const name = getFunctionNameFromKebabCase(
      file.filename.split("/").pop()?.split(".")[0] ?? ""
    );
    const nameString = file.filename.includes("/functions/")
      ? `Name of lambda function / cron job : ${name}`
      : file.filename.includes("/helpers/redis")
        ? `DB Schemas at : ${name}`
        : undefined;
    switch (file.status) {
      case "added":
        prompt += dedent`
        ${file.filename} has been added.
        ${nameString}
        THE DIFF IS:
        ${file.patch ?? ""}
        `;
        break;
      case "removed":
        // 1. remove in both lambdaMap and cronJobMap
        lambdaMap.delete(file.filename.split("/").pop() ?? "");
        cronJobMap.delete(file.filename.split("/").pop() ?? "");
        dbSchemaMap.delete(file.filename.split("/").pop() ?? "");
        break;
      case "modified":
        prompt += dedent`
        ${file.filename} has been changed.
        ${nameString}
        THE DIFF IS:
        ${file.patch ?? ""}
        `;
        break;
      case "changed":
        prompt += dedent`
        ${file.filename} has been changed.
        ${nameString}
        THE DIFF IS:
        ${file.patch ?? ""}
        `;
        break;
      case "renamed":
        console.error("File renamed: ", file.filename);
        break;
    }
  });
  updatedTaskStructure.lambdaFunctions = Array.from(lambdaMap.values());
  updatedTaskStructure.cronJobs = Array.from(cronJobMap.values());
  updatedTaskStructure.dbSchemas = dbSchemaMap.get("redis.ts")?.dbSchemas ?? [];

  // generate
  const generateOutput = await generateObject({
    model: models.claude4Sonnet,
    system: `
    You are a Sr. Fullstack developer with a great understanding of higher level architecture.
    You are given a prompt and a list of files that have been changed/updated.
    You need to understand the changes and update the meta information accordingly.
    only output the lambdaFunctions, cronJobs and dbSchemas that have been changed/updated.
    No need to output if a particular lambdaFunction, cronJob or dbSchema is not changed/updated.

    Rules & Workflow:
    Do not modify paths/method unless in the changes it was changed in serverless.yml file.
    name: should be in camel case, without any extension.
    modify/update brief, endResult, description, by understanding the code changes made.
    if the code changes are minor/unwarrented to update the brief, endResult, description, do not update it.
    brief: should be as detailed as possible of the code step by step (since you are only given the code diff, you need to only modify parts of the brief that are relevant to the code changes)
    `,
    prompt,
    schema: z.object({
      lambdaFunctions: z.array(
        taskLambdaFunction.extend({
          reason: z
            .enum(["added", "updated"])
            .describe("The reason for the change"),
        })
      ),
      cronJobs: z.array(
        taskCronJob.extend({
          reason: z
            .enum(["added", "updated"])
            .describe("The reason for the change"),
        })
      ),
      dbSchemas: z.array(
        taskDBSchema.extend({
          reason: z
            .enum(["added", "updated"])
            .describe("The reason for the change"),
        })
      ),
    }),
  });
  console.log("taskStructure Usage", generateOutput.usage);
  TokenUsageAnalyticsTracker.trackUsage({
    userId: clientRequest.userId,
    originClientRequestId: clientRequest.id,
    clientRequestId: clientRequest.id,
    model: models.claude4Sonnet.modelId,
    usage: generateOutput.usage,
  });

  const generatedLambdaFunctions = generateOutput.object.lambdaFunctions;
  const generatedCronJobs = generateOutput.object.cronJobs;
  const generatedDbSchemas = generateOutput.object.dbSchemas;

  if (!updatedTaskStructure.lambdaFunctions) {
    updatedTaskStructure.lambdaFunctions = [];
  }
  if (!updatedTaskStructure.cronJobs) {
    updatedTaskStructure.cronJobs = [];
  }
  if (!updatedTaskStructure.dbSchemas) {
    updatedTaskStructure.dbSchemas = [];
  }

  generatedLambdaFunctions.forEach(({ reason, ...lambdaFunction }) => {
    const existingLambdaFunctionIndex =
      updatedTaskStructure.lambdaFunctions?.findIndex(
        (lambda) =>
          getFunctionNameFromKebabCase(lambda.name) ===
          getFunctionNameFromKebabCase(lambdaFunction.name)
      );
    if (existingLambdaFunctionIndex && existingLambdaFunctionIndex >= 0) {
      (updatedTaskStructure.lambdaFunctions as TaskLambdaFunction[])[
        existingLambdaFunctionIndex
      ] = {
        ...(updatedTaskStructure.lambdaFunctions as TaskLambdaFunction[])[
          existingLambdaFunctionIndex
        ],
        ...{
          ...lambdaFunction,
          name: getFunctionNameFromKebabCase(lambdaFunction.name),
        },
      };
    } else {
      updatedTaskStructure.lambdaFunctions?.push({
        ...lambdaFunction,
        name: getFunctionNameFromKebabCase(lambdaFunction.name),
      });
    }
  });

  generatedCronJobs.forEach(({ reason, ...cronJob }) => {
    const existingCronJobIndex = updatedTaskStructure.cronJobs?.findIndex(
      (cron) =>
        getFunctionNameFromKebabCase(cron.name) ===
        getFunctionNameFromKebabCase(cronJob.name)
    );
    if (existingCronJobIndex && existingCronJobIndex >= 0) {
      (updatedTaskStructure.cronJobs as TaskCronJob[])[existingCronJobIndex] = {
        ...(updatedTaskStructure.cronJobs as TaskCronJob[])[
          existingCronJobIndex
        ],
        ...{ ...cronJob, name: getFunctionNameFromKebabCase(cronJob.name) },
      };
    } else {
      updatedTaskStructure.cronJobs?.push({
        ...cronJob,
        name: getFunctionNameFromKebabCase(cronJob.name),
      });
    }
  });

  generatedDbSchemas.forEach(({ reason, ...dbSchema }) => {
    const existingDbSchemaIndex = updatedTaskStructure.dbSchemas?.findIndex(
      (db) =>
        getFunctionNameFromKebabCase(db.modelName) ===
        getFunctionNameFromKebabCase(dbSchema.modelName)
    );
    if (existingDbSchemaIndex && existingDbSchemaIndex >= 0) {
      (updatedTaskStructure.dbSchemas as TaskDBSchema[])[
        existingDbSchemaIndex
      ] = {
        ...(updatedTaskStructure.dbSchemas as TaskDBSchema[])[
          existingDbSchemaIndex
        ],
        ...{
          ...dbSchema,
          modelName: getFunctionNameFromKebabCase(dbSchema.modelName),
        },
      };
    } else {
      updatedTaskStructure.dbSchemas?.push({
        ...dbSchema,
        modelName: getFunctionNameFromKebabCase(dbSchema.modelName),
      });
    }
  });

  return updatedTaskStructure as TaskInstanceMetaType["taskStructure"];
};

export const modifyTaskInfoBasedOnChanges = async (
  originalTaskInfo: TaskInstanceMetaType["taskInfo"],
  originalTaskStructure: TaskInstanceMetaType["taskStructure"],
  updatedTaskStructure: TaskInstanceMetaType["taskStructure"],
  clientRequest: ClientRequest
) => {
  const generatedTaskInfoOutput = await generateObject({
    model: models.claude4Sonnet,
    system: `
    You are a Sr. Fullstack developer with a great understanding of higher level architecture.
    You are given a task information and a task structure information.
    You need to understand the changes and update the task information accordingly.
    `,
    prompt: `
    The following is the task information that currently exists in the task:
    ${JSON.stringify(originalTaskInfo)}
    The follwing is the task structure information that currently exists in the task:
    ${JSON.stringify(originalTaskStructure)}
    The following is the modified task structure information output:
    ${JSON.stringify(updatedTaskStructure)}
    `,
    schema: taskInfo,
  });

  console.log("taskInfo Usage", generatedTaskInfoOutput.usage);
  TokenUsageAnalyticsTracker.trackUsage({
    userId: clientRequest.userId,
    originClientRequestId: clientRequest.id,
    clientRequestId: clientRequest.id,
    model: models.claude4Sonnet.modelId,
    usage: generatedTaskInfoOutput.usage,
  });

  return generatedTaskInfoOutput.object;
};

export const modifyTaskInstanceMeta = async (
  taskInstanceMeta: TaskInstanceMeta,
  clientRequest: ClientRequest,
  {
    filesChanged,
    enableGitFetch,
    commitSha,
  }: {
    filesChanged: string[];
    enableGitFetch: boolean;
    commitSha: string;
  }
) => {
  let updatedTaskInstanceMeta = { ...taskInstanceMeta };
  console.log("filesChanged", filesChanged);

  if (!taskInstanceMeta.taskStructure) {
    throw new Error("Task structure is not set");
  }

  if (!taskInstanceMeta.taskInfo) {
    throw new Error("Task info is not set");
  }

  const commitFiles = await getCommitChanges({
    enableGitFetch,
    commitSha,
    repoName: clientRequest.repoName!,
    filesChanged,
  });

  // Update build step files based on commit changes
  const updatedBuildFiles = updateBuildStepFiles(
    taskInstanceMeta.buildingStep,
    commitFiles,
    clientRequest.repoName!
  );
  (updatedTaskInstanceMeta.buildingStep as any).files = updatedBuildFiles;

  // Modify task structure based on commit files
  const updatedTaskStructure = await modifyTaskStructureBasedOnCommitFiles(
    taskInstanceMeta.taskStructure as TaskInstanceMetaType["taskStructure"],
    commitFiles,
    clientRequest
  );

  // Modify task info based on changes
  const updatedTaskInfo = await modifyTaskInfoBasedOnChanges(
    taskInstanceMeta.taskInfo as TaskInstanceMetaType["taskInfo"],
    taskInstanceMeta.taskStructure as TaskInstanceMetaType["taskStructure"],
    updatedTaskStructure,
    clientRequest
  );

  return {
    ...updatedTaskInstanceMeta,
    taskInfo: updatedTaskInfo as any,
    taskStructure: updatedTaskStructure as any,
  } as TaskInstanceMeta;
};
