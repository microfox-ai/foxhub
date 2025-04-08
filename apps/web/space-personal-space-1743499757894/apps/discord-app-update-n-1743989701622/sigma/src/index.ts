// Re-export external API functions
import { fetchAndSendUpdatesDocs } from "./functions/fetchAndSendUpdates.js";
import { getLastSentUpdateDocs } from "./functions/getLastSentUpdate.js";
import { scheduledUpdateCheckDocs } from "./functions/scheduledUpdateCheck.js";
export { fetchAndSendUpdates } from "./functions/fetchAndSendUpdates.js";
export { getLastSentUpdate } from "./functions/getLastSentUpdate.js";
export { scheduledUpdateCheck } from "./functions/scheduledUpdateCheck.js";

/**
 * Complete API documentation
 * Write down this apiDocs on the basis of open api 3.0.1 in JSON format
 * The required subdocuments for endpoints can be imported from above imports
 */
const apiDocs = {
  openapi: "3.0.1",
  info: {
    title: "Update Fetcher and Sender API",
    version: "1.0.0",
    description:
      "API for fetching and sending updates, checking last sent update, and scheduling update checks",
    contact: {
      name: "API Support",
      email: "support@microfox.com",
    },
  },
  servers: [
    {
      url: "https://api.microfox.com/c/70cd3686-642e-45b1-b071-ac79cc6ca81a",
      description: "Production server",
    },
  ],
  paths: {
    "/updates": {
      post: fetchAndSendUpdatesDocs,
    },
    "/last-update": {
      get: getLastSentUpdateDocs,
    },
    "/cron/update-check": {
      post: scheduledUpdateCheckDocs,
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