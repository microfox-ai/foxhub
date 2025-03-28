import { config } from 'dotenv';
import { Octokit } from '@octokit/rest';

// Load environment variables
config();

// Initialize Octokit with GitHub token
const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

interface ErrorData {
  timestamp: string;
  message: string;
  context: Record<string, unknown>;
}

/**
 * POST endpoint to create a GitHub issue for web application errors
 */
export const createGitHubIssue = async (event: any) => {
  try {
    // Parse the incoming error data
    const errorData: ErrorData = JSON.parse(event.body);

    // Validate the error data
    if (!errorData.timestamp || !errorData.message) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid error data. Timestamp and message are required.' }),
      };
    }

    // Format the issue title and body
    const issueTitle = `Error: ${errorData.message.substring(0, 100)}`;
    const issueBody = `
## Error Details
- **Timestamp:** ${errorData.timestamp}
- **Message:** ${errorData.message}

## Context
\`\`\`json
${JSON.stringify(errorData.context, null, 2)}
\`\`\`
    `;

    // Create the GitHub issue
    const { data: issue } = await octokit.issues.create({
      owner: process.env.GITHUB_OWNER!,
      repo: process.env.GITHUB_REPO!,
      title: issueTitle,
      body: issueBody,
      labels: ['bug', 'automated'],
    });

    return {
      statusCode: 201,
      body: JSON.stringify({
        message: 'GitHub issue created successfully',
        issueUrl: issue.html_url,
        issueNumber: issue.number,
      }),
    };
  } catch (error) {
    console.error('Error creating GitHub issue:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
    };
  }
};

/**
 * Documentation for createGitHubIssue endpoint
 */
export const createGitHubIssueDocs = {
  title: 'Create GitHub Issue',
  description: 'Creates a new issue in the designated GitHub repository with error details',
  method: 'POST',
  path: '/github/create-issue',
  requestBody: {
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            timestamp: { type: 'string', format: 'date-time' },
            message: { type: 'string' },
            context: { type: 'object' },
          },
          required: ['timestamp', 'message'],
        },
      },
    },
  },
  responses: {
    201: {
      description: 'GitHub issue created successfully',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              message: { type: 'string' },
              issueUrl: { type: 'string', format: 'uri' },
              issueNumber: { type: 'number' },
            },
          },
        },
      },
    },
    400: {
      description: 'Bad request',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              error: { type: 'string' },
            },
          },
        },
      },
    },
    500: {
      description: 'Server error',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              error: { type: 'string' },
            },
          },
        },
      },
    },
  },
};