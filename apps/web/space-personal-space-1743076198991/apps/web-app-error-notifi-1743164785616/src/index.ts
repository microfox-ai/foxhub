// Re-export external API functions
export { receiveWebAppError } from "./functions/receiveWebAppError";
export { createGitHubIssue } from "./functions/createGitHubIssue";

// Import docs from each function
import { receiveWebAppErrorDocs } from "./functions/receiveWebAppError";
import { createGitHubIssueDocs } from "./functions/createGitHubIssue";

/**
 * Complete API documentation
 */
const apiDocs = {
  title: "Web App Error Handling API",
  description: "Complete documentation for the web app error handling lambda functions",
  version: "1.0.0",
  sections: {
    errorHandling: {
      title: "Error Handling",
      description: "Endpoints for handling web app errors and creating GitHub issues",
      endpoints: {
        receiveWebAppError: receiveWebAppErrorDocs,
        createGitHubIssue: createGitHubIssueDocs,
      },
    },
  },
};

/**
 * GET endpoint to serve API documentation
 * This Lambda function returns the complete API documentation in JSON format
 */
export const getDocs = async (event: any) => {
  try {
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Credentials": true,
      },
      body: JSON.stringify(apiDocs, null, 2),
    };
  } catch (error) {
    console.error("Error serving docs:", error);
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Credentials": true,
      },
      body: JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
    };
  }
};