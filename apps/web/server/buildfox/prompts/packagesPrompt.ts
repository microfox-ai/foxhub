import {
  codeTemplateType,
  TaskInstanceMetaType,
} from "@/server/convertfox/types";

const EXCLUDED_PACKAGES_LIST = ["puppeteer"];
export const packagesPrompt = (taskInstanceMeta: TaskInstanceMetaType) => {
  console.log(
    "packages in there",
    taskInstanceMeta?.taskIntegrations?.platforms
      ?.filter((platform) => platform?.package != "@microfox/null")
      .filter((platform) => !platform?.package?.startsWith("@types/"))
      .filter(
        (platform) => !EXCLUDED_PACKAGES_LIST.includes(platform?.package ?? "")
      )
      .map((platform) => platform?.package)
      .join("\n - ")
  );
  return `
    The following packages are installed in the project:
    SUPPORTED PACKAGES:
            - ${taskInstanceMeta?.taskIntegrations?.platforms
              ?.filter((platform) => platform?.package != "@microfox/null")
              .filter((platform) => !platform?.package?.startsWith("@types/"))
              .filter(
                (platform) =>
                  !EXCLUDED_PACKAGES_LIST.includes(platform?.package ?? "")
              )
              .map((platform) => platform?.package + " - " + platform?.reason)
              .join("\n - ")}
            ${taskInstanceMeta?.taskStructure?.templateType === codeTemplateType.enum.upstash_sls ? "- @upstash/redis" : ""}
            - dotenv
            - @types/aws-lambda

      Only pick other packages if they above are not sufficient for the task.
    `;
};
