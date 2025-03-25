import { z } from "zod";

// step1. generate a clear cut pure task info
export const taskInfo = z.object({
  name: z.string().describe("The name of the task"),
  description: z.string().describe("The description of the task"),
  goal: z.string().describe("The end goal of this task"),
  summary: z.string().describe("A complete detailed summary of the task"),
});
export type TaskInfo = z.infer<typeof taskInfo>;

// step2. get information about the integrations required for the task
export const taskIntegrations = z.object({
  platforms: z.array(
    z.object({
      name: z.string().describe("The name of the platform"),
      reason: z.string().describe("why this platform is needed for the task"),
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
  functions: z.array(
    z.object({
      name: z.string().describe("The name of this lambda function"),
      interactionType: z
        .array(z.enum(["ui", "api", "cron"]))
        .describe(
          "When is this called - ui if from a user interaction, api for an api call, cron - if a scheduled cron job can take care of it"
        ),
      description: z.string().describe("What does this lambda function do"),
      endResult: z
        .string()
        .describe("What is the end result of this lambda function"),
    })
  ),
  cronJobs: z.array(
    z.object({
      name: z.string().describe("The name of this cron job"),
      description: z.string().describe("What does this cron job do"),
      endResult: z.string().describe("What is the end result of this cron job"),
      //   endPoint: z.object({
      //     url: z.string().describe("The url of the end point"),
      //     method: z.enum(["GET", "POST", "PUT", "DELETE"]).describe("The method of the end point"),
      //     body: z.any().describe("The body of the end point"),
      //     headers: z.any().describe("The headers of the end point"),
      //   }),
      //   cronExpression: z.string().describe("The cron expression of the cron job"),
    })
  ),
  userInteractions: z.array(
    z.object({
      name: z.string().describe("The name of this user interaction"),
      description: z.string().describe("What does this user interaction do"),
      endResult: z
        .string()
        .describe("What is the end result of this user interaction"),
      endpointCall: z
        .array(z.string())
        .describe("The endpoints to call of this user interaction"),
    })
  ),
});
export type TaskStructure = z.infer<typeof taskStructure>;
// step3
export const taskInstance = z.object({
  initialSummary: z.string().describe("The initial summary of the task"),
  taskInfo: taskInfo,
  taskIntegrations: taskIntegrations,
  taskRequiredInfo: taskRequiredInfo,
  taskStructure: taskStructure,
});

export type TaskInstanceMetaType = z.infer<typeof taskInstance>;
// the collected information must be stored NOT in the taskInstance record.
