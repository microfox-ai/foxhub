import { z } from "zod";

// step1. generate a clear cut pure task info
export const taskInfo = z.object({
  name: z.string().describe("a simple name for the task"),
  goal: z.string().describe("the final outcome of the task"),
  summary: z
    .string()
    .describe(
      "A complete detailed summary of the task - include every detail - all the platforms, capabilities, and features of the task."
    ),
});
export type TaskInfo = z.infer<typeof taskInfo>;

// step2. get information about the integrations required for the task
export const taskIntegrations = z.object({
  platforms: z.array(
    z.object({
      name: z.string().describe("The name of the platform"),
      reason: z.string().describe("why this platform is needed for the task"),
      optional: z
        .boolean()
        .default(false)
        .describe("Whether this platform is optional"),
      package: z
        .string()
        .describe("The package name of the platform")
        .optional(),
    })
  ),
  alternativePlatforms: z.array(
    z.object({
      alternativeFor: z
        .string()
        .describe("The name of the platform to be replaced"),
      name: z.string().describe("The name of the platform"),
      reason: z.string().describe("why this platform is needed for the task"),
      package: z
        .string()
        .describe("The package name of the platform")
        .optional(),
    })
  ),
});
export type TaskIntegrations = z.infer<typeof taskIntegrations>;

// step3. get to know what information to collect from user
export const taskRequiredInfo = z.object({
  packages: z
    .array(z.string())
    .describe("The packages that are needed for the task"),
  clientSecrets: z
    .array(z.any())
    .describe("The client secrets that are needed for the task"),
  extraInfo: z
    .array(z.any())
    .describe(
      "Any other information that is needed for the task in dictionary format"
    ),
  interactionType: z.enum(["ui", "api", "none"]),
});
export type TaskRequiredInfo = z.infer<typeof taskRequiredInfo>;

export const taskStructure = z.object({
  dbSchemas: z
    .array(
      z.object({
        modelName: z.string().describe("The name of the model"),
        jsonSchema: z.any().describe("The schema of the model"),
      })
    )
    .optional()
    .describe(
      "The schemas of the models that are needed for the task (Optional)"
    ),
  lambdaFunctions: z.array(
    z.object({
      name: z.string().describe("The name of this lambda function"),
      interactionType: z
        .array(z.enum(["ui", "api"]))
        .describe(
          "When is this called - ui if from a user interaction, api for an api call, cron - if a scheduled cron job can take care of it"
        ),
      description: z.string().describe("What does this lambda function do"),
      endResult: z
        .string()
        .describe("What is the end result of this lambda function"),
      method: z
        .enum(["GET", "POST", "PUT", "DELETE"])
        .describe("The method of the end point"),
      path: z.string().describe("The path of the end point"),
      packagesUsed: z
        .array(z.string())
        .describe("The packages used in this lambda function"),
    })
  ),
  cronJobs: z.array(
    z.object({
      name: z.string().describe("The name of this cron job"),
      description: z.string().describe("What does this cron job do"),
      endResult: z.string().describe("What is the end result of this cron job"),
      endPoint: z.object({
        url: z.string().describe("The url of the end point"),
        method: z
          .enum(["GET", "POST", "PUT", "DELETE"])
          .describe("The method of the end point"),
        body: z.any().describe("The body of the end point"),
        headers: z.any().describe("The headers of the end point"),
      }),
      cronExpression: z
        .string()
        .describe("The cron expression of the cron job"),
      packagesUsed: z
        .array(z.string())
        .describe("The packages used in this cron job"),
    })
  ),
  // userInteractions: z.array(
  //   z
  //     .object({
  //       name: z.string().describe("The name of this ui screen"),
  //       description: z.string().describe("What does this screen do"),
  //       endResult: z
  //         .string()
  //         .describe("What does the screen enable the user to do"),
  //       endpointCall: z
  //         .array(z.string())
  //         .describe("The endpoints to call while in this screen"),
  //     })
  //     .describe("The user screens/components that are needed for the task")
  // ),
});
export type TaskStructure = z.infer<typeof taskStructure>;

export const fileReference = z.object({
  id: z.string().optional(),
  filePath: z.string(),
  fileName: z.string(),
  fileType: z.string(),
  fileDescription: z.string().optional(),
  meta: z.any().optional(),
  contentSize: z.number().optional(),
  timestamp: z.string().optional(),
});
export type FileReference = z.infer<typeof fileReference>;

export const buildingStep = z.object({
  files: z.array(fileReference),
  startTime: z.string(),
  endTime: z.string(),
});
export type BuildingStep = z.infer<typeof buildingStep>;

// step3
export const taskInstance = z.object({
  initialSummary: z
    .string()
    .describe("The initial summary of the task")
    .optional(),
  originClientRequestId: z
    .string()
    .describe("The client request id of the task"),
  minionType: z.string().optional(),
  taskInfo: taskInfo.optional(),
  taskIntegrations: taskIntegrations.optional(),
  taskRequiredInfo: taskRequiredInfo.optional(),
  taskStructure: taskStructure.optional(),
  buildingStep: buildingStep.optional(),
});

export type TaskInstanceMetaType = z.infer<typeof taskInstance>;
// the collected information must be stored NOT in the taskInstance record.

export const extraEnvVariables = z.object({
  env: z.string().describe("The env variable name"),
  name: z.string().describe("A readable name for the env variable"),
  what: z.string().describe("What is this env variable used for"),
  why: z.string().describe("Why is this env variable needed").optional(),
  how: z.string().describe("How to get this env from the platform"),
  isSameAs: z
    .array(z.string())
    .describe("similar exisiting env variables that were duped in the code")
    .optional(),
});
export type ExtraEnvVariable = z.infer<typeof extraEnvVariables>;
