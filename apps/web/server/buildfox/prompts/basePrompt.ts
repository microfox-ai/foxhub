import { TaskInstanceMetaType } from "@/server/convertfox/types";

export const baseFilePrompt = (fileType: "lambda" | "cron", _function: any) => {
  return `${
    fileType === "lambda"
      ? `Function:
            - Name: ${_function?.name}
            - Description: ${_function?.description}
            - Brief: ${_function?.brief}
            Endpoint Details:
            - Path: ${_function?.path}
            - Method: ${_function?.method}`
      : `Cron Job:
            - Name: ${_function?.name}
            - Description & Schedule: ${_function?.description}
            - Result of the cron job: ${_function?.endResult}
            - Cron Expression: ${_function?.cronExpression}
            - Brief: ${_function?.brief}
            `
  }`;
};
