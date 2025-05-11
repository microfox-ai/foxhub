import {
  codeTemplateType,
  TaskInstanceMetaType,
} from "@/server/convertfox/types";

export const packagesPrompt = (taskInstanceMeta: TaskInstanceMetaType) => {
  return `
    The following packages are installed in the project:
            - ${taskInstanceMeta?.taskIntegrations?.platforms
              ?.filter((platform) => platform?.package != "@microfox/null")
              .map((platform) => platform?.package)
              .join("\n - ")}
            ${taskInstanceMeta?.taskStructure?.templateType === codeTemplateType.enum.upstash_sls ? "- @upstash/redis" : ""}
            - dotenv
            - @types/aws-lambda
    `;
};
