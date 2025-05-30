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

  let actualFilesChanged = filesChanged;
  let commitFiles: Array<{
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
  }> = [];

  // If enableGitFetch is true, use Octokit to get file diffs for the commitSha
  if (enableGitFetch && commitSha && clientRequest.repoName) {
    try {
      console.log(`Fetching file diffs for commit ${commitSha} using Octokit`);

      const octokit = new Octokit({
        auth: GITHUB_TOKEN,
      });

      // Get the commit details which includes file changes
      const { data: commitData } = await octokit.rest.repos.getCommit({
        owner: PROJECT_REPO_OWNER,
        repo: clientRequest.repoName,
        ref: commitSha,
      });

      // Extract files that were changed in this commit
      commitFiles = commitData.files || [];
      actualFilesChanged = commitFiles.map((file) => file.filename);

      console.log(
        `Found ${actualFilesChanged.length} changed files from commit:`,
        actualFilesChanged
      );

      // Optionally, you can also get detailed diff information
      // The commitData.files array contains:
      // - filename: string
      // - status: 'added' | 'removed' | 'modified' | 'renamed' | 'copied' | 'changed' | 'unchanged'
      // - additions: number
      // - deletions: number
      // - changes: number
      // - patch: string (the actual diff)
    } catch (error) {
      console.error("Error fetching commit data from GitHub:", error);
      // Fall back to using the originally provided filesChanged array
      console.log("Falling back to provided filesChanged array");
    }
  }

  // TODO: based on files changed, update the task instance meta
  const buildFiles = (taskInstanceMeta.buildingStep as any)?.files;
  const buildFilesMap = new Map<string, any>();
  buildFiles.forEach((file: any) => {
    buildFilesMap.set(
      file.filePath.replace(clientRequest.repoName + "/", ""),
      file
    );
  });

  commitFiles.forEach((file) => {
    const isInBuildFiles = buildFilesMap.get(file.filename);
    switch (file.status) {
      case "added":
        buildFilesMap.set(file.filename, {
          filePath: clientRequest.repoName + "/" + file.filename,
          fileName: file.filename.split("/").pop(),
          fileType: file.filename.split(".").pop(),
          meta: {},
        });
        break;
      case "removed":
        buildFilesMap.delete(file.filename);
        break;
      case "modified":
        buildFilesMap.set(file.filename, {
          filePath: clientRequest.repoName + "/" + file.filename,
          fileName: file.filename.split("/").pop(),
          fileType: file.filename.split(".").pop(),
          meta: {},
        });
        break;
      case "changed":
        buildFilesMap.set(file.filename, {
          filePath: clientRequest.repoName + "/" + file.filename,
          fileName: file.filename.split("/").pop(),
          fileType: file.filename.split(".").pop(),
          meta: {},
        });
        break;
      case "renamed":
        console.error("File renamed: ", file.filename);
        break;
    }
  });
  let updatedBuildFiles = Array.from(buildFilesMap.values());
  (updatedTaskInstanceMeta.buildingStep as any).files = updatedBuildFiles;

  let updatedTaskStructure = {
    ...(taskInstanceMeta.taskStructure as TaskInstanceMetaType["taskStructure"]),
  };
  const lambdaMap = new Map<string, TaskLambdaFunction>();
  const cronJobMap = new Map<string, TaskCronJob>();
  const dbSchemaMap = new Map<string, { dbSchemas: TaskDBSchema[] }>();

  let prompt = `
  The following are the meta information for the lambdaFunctions, cronJobs and dbSchemas that currently exist in the task:
  `;

  updatedTaskStructure?.lambdaFunctions?.forEach((lambdaFunction) => {
    lambdaMap.set(
      getFunctionNameFromKebabCase(lambdaFunction.name) + ".ts",
      lambdaFunction
    );
    prompt += dedent`
    lambdaFunction: ${JSON.stringify(lambdaMap)}
    `;
  });
  updatedTaskStructure?.cronJobs?.forEach((cronJob) => {
    cronJobMap.set(getFunctionNameFromKebabCase(cronJob.name) + ".ts", cronJob);
    prompt += dedent`
    cronJob: ${JSON.stringify(cronJobMap)}
    `;
  });
  if (updatedTaskStructure?.dbSchemas) {
    dbSchemaMap.set("redis.ts", { dbSchemas: updatedTaskStructure?.dbSchemas });
    prompt += dedent`
    dbSchema: ${JSON.stringify(dbSchemaMap)}
    `;
  }

  prompt += dedent`
  The following are the files that have been added/changed in the commit:
  `;

  commitFiles.forEach((file) => {
    const name = getKebabCaseFunctionNameFromCamelCase(
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

  console.log("prompt for generating modified task structure", prompt);

  // generate
  const generateOutput = await generateObject({
    model: models.claude4Sonnet,
    system: `
    You are a Sr. Fullstack developer with a great understanding of higher level architecture.
    You are given a prompt and a list of files that have been changed/updated.
    You need to understand the changes and update the meta information accordingly.
    only output the lambdaFunctions, cronJobs and dbSchemas that have been changed/updated.
    No need to output if a particular lambdaFunction, cronJob or dbSchema is not changed/updated.
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

  generatedLambdaFunctions.forEach(({ reason, ...lambdaFunction }) => {
    const existingLambdaFunction = updatedTaskStructure.lambdaFunctions?.find(
      (lambda) => lambda.name === lambdaFunction.name
    );
    if (existingLambdaFunction) {
      updatedTaskStructure.lambdaFunctions =
        updatedTaskStructure.lambdaFunctions?.map((lambda) => {
          if (lambda.name === lambdaFunction.name) {
            return lambdaFunction;
          }
          return lambda;
        });
    } else {
      updatedTaskStructure.lambdaFunctions?.push(lambdaFunction);
    }
  });

  generatedCronJobs.forEach(({ reason, ...cronJob }) => {
    const existingCronJob = updatedTaskStructure.cronJobs?.find(
      (cron) => cron.name === cronJob.name
    );
    if (existingCronJob) {
      updatedTaskStructure.cronJobs = updatedTaskStructure.cronJobs?.map(
        (cron) => {
          if (cron.name === cronJob.name) {
            return cronJob;
          }
          return cron;
        }
      );
    } else {
      updatedTaskStructure.cronJobs?.push(cronJob);
    }
  });

  generatedDbSchemas.forEach(({ reason, ...dbSchema }) => {
    const existingDbSchema = updatedTaskStructure.dbSchemas?.find(
      (db) => db.modelName === dbSchema.modelName
    );
    if (existingDbSchema) {
      updatedTaskStructure.dbSchemas = updatedTaskStructure.dbSchemas?.map(
        (db) => {
          if (db.modelName === dbSchema.modelName) {
            return dbSchema;
          }
          return db;
        }
      );
    } else {
      updatedTaskStructure.dbSchemas?.push(dbSchema);
    }
  });

  let updatedTaskInfo =
    taskInstanceMeta.taskInfo as TaskInstanceMetaType["taskInfo"];
  const generatedTaskInfoOutput = await generateObject({
    model: models.claude4Sonnet,
    system: `
    You are a Sr. Fullstack developer with a great understanding of higher level architecture.
    You are given a task information and a task structure information.
    You need to understand the changes and update the task information accordingly.
    `,
    prompt: `
    The following is the task information that currently exists in the task:
    ${JSON.stringify(updatedTaskInfo)}
    The follwing is the task structure information that currently exists in the task:
    ${JSON.stringify(taskInstanceMeta.taskStructure)}
    The following is the modified task structure information output:
    ${JSON.stringify(updatedTaskStructure)}
    `,
    schema: taskInfo,
  });
  updatedTaskInfo = generatedTaskInfoOutput.object;
  console.log("taskInfo Usage", generatedTaskInfoOutput.usage);
  TokenUsageAnalyticsTracker.trackUsage({
    userId: clientRequest.userId,
    originClientRequestId: clientRequest.id,
    clientRequestId: clientRequest.id,
    model: models.claude4Sonnet.modelId,
    usage: generatedTaskInfoOutput.usage,
  });
  // TODO: update name, goal, summary acordingly.

  return {
    ...updatedTaskInstanceMeta,
    taskInfo: updatedTaskInfo as any,
    taskStructure: updatedTaskStructure as any,
  } as TaskInstanceMeta;
};
