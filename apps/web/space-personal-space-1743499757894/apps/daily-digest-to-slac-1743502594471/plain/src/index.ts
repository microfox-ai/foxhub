// Re-export external API functions
import { sendDailyDigestToSlackDocs } from './functions/sendDailyDigestToSlack';
export { sendDailyDigestToSlack } from './functions/sendDailyDigestToSlack';

/**
 * Complete API documentation
 */
const apiDocs = {
  title: 'Serverless Lambda API',
  description: 'Complete documentation for the serverless lambda functions',
  version: '1.0.0',
  sections: {
    slack: {
      title: 'Slack Integration',
      description: 'Endpoints for interacting with Slack',
      endpoints: {
        sendDailyDigestToSlack: sendDailyDigestToSlackDocs,
      },
    },
  }
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
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
      body: JSON.stringify(apiDocs, null, 2),
    }
  } catch (error) {
    console.error('Error serving docs:', error)
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
      body: JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
}