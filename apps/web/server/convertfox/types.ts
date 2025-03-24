import { z } from "zod";

// step1. generate a clear cut pure task info
export const taskInfo = z.object({
  name: z.string(),
  description: z.string(),
  goal: z.string(),
  summary: z.string(),
});
export type TaskInfo = z.infer<typeof taskInfo>;

// step2. get information about the integrations required for the task
export const taskIntegrations = z.object({
  platforms: z.array(
    z.object({
      name: z.string().describe("The name of the platform"),
      intent: z
        .string()
        .describe("The intent on why this platform is needed for the task"),
      specificNeeds: z
        .array(z.string())
        .describe(
          "The specific utilities of this platform that is needed to achieve the task"
        ),
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
  steps: z.array(
    z.object({
      name: z.string().describe("The name of this step"),
      interactionType: z
        .enum(["ui", "api"])
        .describe(
          "The type of interaction this step includes - ui if a user interaction is needed, api if an api call can take care of it but needs to be triggered, cron - if a scheduled cron job can take care of it"
        ),
      description: z.string().describe("The description of the step"),
      requiredInfo: z
        .array(z.string())
        .describe(
          "The information that is needed for the step - whether user inputs or secrets or API keys"
        ),
    })
  ),
});
export type TaskStructure = z.infer<typeof taskStructure>;
// step3.
export const taskInstance = z.object({
  taskInfo: taskInfo,
  taskIntegrations: taskIntegrations,
  taskRequiredInfo: taskRequiredInfo,
  taskStructure: taskStructure,
});

// the collected information must be stored NOT in the taskInstance record.
