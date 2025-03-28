import { config } from 'dotenv';
import fetch from 'node-fetch';

// Load environment variables
config();

const GITHUB_API_URL = 'https://api.github.com';
const GITHUB_REPO_OWNER = process.env.GITHUB_REPO_OWNER;
const GITHUB_REPO_NAME = process.env.GITHUB_REPO_NAME;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

interface WebAppError {
  timestamp: string;
  message: string;
  stack?: string;
  context?: Record<string, unknown>;
}

/**
 * POST endpoint to receive web application error and create a GitHub issue
 */
export const receiveWebAppError = async (event: any) => {
  try {
    if (!event.body) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Request body is missing' }),
      };
    }

    const error: WebAppError = JSON.parse(event.body);

    if (!error.timestamp || !error.message) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid error format' }),
      };
    }

    const issueTitle = `Web App Error: ${error.message.substring(0, 100)}`;
    const issueBody = `
**Timestamp:** ${error.timestamp}

**Error Message:** ${error.message}

${error.stack ? `**Stack Trace:**\n\`\`\`\n${error.stack}\n\`\`\`` : ''}

${error.context ? `**Context:**\n\`\`\`json\n${JSON.stringify(error.context, null, 2)}\n\`\`\`` : ''}
    `;

    const response = await fetch(`${GITHUB_API_URL}/repos/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/issues`, {
      method: 'POST',
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: issueTitle,
        body: issueBody,
        labels: ['bug', 'automated'],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Error creating GitHub issue:', errorData);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Failed to create GitHub issue' }),
      };
    }

    const issue = await response.json();

    return {
      statusCode: 201,
      body: JSON.stringify({
        message: 'GitHub issue created successfully',
        issueUrl: issue.html_url,
      }),
    };
  } catch (error) {
    console.error('Error processing web app error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
    };
  }
};

/**
 * Documentation for receiveWebAppError endpoint
 */
export const receiveWebAppErrorDocs = {
  title: 'Receive Web App Error',
  description: 'Receives error data from the web application via a webhook and creates a GitHub issue',
  method: 'POST',
  path: '/webhook/error',
  requestBody: {
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            timestamp: { type: 'string', format: 'date-time' },
            message: { type: 'string' },
            stack: { type: 'string', optional: true },
            context: { type: 'object', optional: true },
          },
          required: ['timestamp', 'message'],
        },
      },
    },
  },
  responses: {
    201: {
      description: 'GitHub issue created successfully',
      schema: {
        type: 'object',
        properties: {
          message: { type: 'string' },
          issueUrl: { type: 'string', format: 'uri' },
        },
      },
    },
    400: {
      description: 'Bad request',
      schema: {
        type: 'object',
        properties: {
          error: { type: 'string' },
        },
      },
    },
    500: {
      description: 'Server error',
      schema: {
        type: 'object',
        properties: {
          error: { type: 'string' },
        },
      },
    },
  },
};