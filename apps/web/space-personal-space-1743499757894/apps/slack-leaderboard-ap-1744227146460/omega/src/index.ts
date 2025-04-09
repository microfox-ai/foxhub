// Re-export external API functions
import { calculateAndSendLeaderboardDocs } from './functions/calculateAndSendLeaderboard.js';
import { getLeaderboardDocs } from './functions/getLeaderboard.js';
import { scheduledLeaderboardUpdateDocs } from './functions/scheduledLeaderboardUpdate.js';

export { calculateAndSendLeaderboard } from './functions/calculateAndSendLeaderboard.js';
export { getLeaderboard } from './functions/getLeaderboard.js';
export { scheduledLeaderboardUpdate } from './functions/scheduledLeaderboardUpdate.js';

/**
 * Complete API documentation
 * Write down this apiDocs on the basis of open api 3.0.1 in JSON format
 * The required subdocuments for endpoints can be imported from above imports
 */
const apiDocs = {
  openapi: "3.0.1",
  info: {
    title: "Leaderboard API",
    version: "1.0.0",
    description: "API for managing and retrieving leaderboard data",
    contact: {
      name: "API Support",
      email: "support@microfox.com",
    },
  },
  servers: [
    {
      url: "https://api.microfox.com/c/6c88eb43-88f2-4b4a-9b3b-24a22642d778",
      description: "Production server",
    },
  ],
  paths: {
    "/leaderboard/calculate": {
      post: calculateAndSendLeaderboardDocs,
    },
    "/leaderboard": {
      get: getLeaderboardDocs,
    },
    "/cron/leaderboard-update": {
      post: scheduledLeaderboardUpdateDocs,
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