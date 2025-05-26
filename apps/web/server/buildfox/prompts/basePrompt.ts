import { TaskInstanceMetaType } from "@/server/convertfox/types";

export const baseFilePrompt = (
  fileType: "lambda" | "cron",
  _function: any,
  includeBrief: boolean = true
) => {
  return `${
    fileType === "lambda"
      ? `Function:
            - Name: ${_function?.name}
            - Description: ${_function?.description}
            ${includeBrief ? `- Brief: ${_function?.brief}` : ""}
            Endpoint Details:
            - Path: ${_function?.path}
            - Method: ${_function?.method}
            - ${_function?.method === "GET" ? `- End point should not have a request body as it is a GET request` : ""}
            `
      : `Cron Job:
            - Name: ${_function?.name}
            - Description & Schedule: ${_function?.description}
            - Result of the cron job: ${_function?.endResult}
            - Cron Expression: ${_function?.cronExpression}
            ${includeBrief ? `- Brief: ${_function?.brief}` : ""}
            - DO NOT IMPORT ANY LAMBDA FUNCTIONS IN THE CRON JOB.
            - ALL FUNCTIONALITY MUST BE IMPLEMENTED IN THE CRON JOB ITSELF FROM END TO END, NOT IN THE HELPER FILES (HELPER FILES ARE ONLY FOR STATE/DB MANAGEMENT).
            `
  }`;
};
