import { APIGatewayProxyHandler } from 'aws-lambda';
import prisma from '../db/prisma';
import { SES } from '@aws-sdk/client-ses';
import { google } from '@microfox/google-sdk';
import dotenv from 'dotenv';

dotenv.config();

const ses = new SES({ region: process.env.AWS_REGION });

// LinkedIn API credentials
const LINKEDIN_API_KEY = process.env.LINKEDIN_API_KEY;
const LINKEDIN_API_SECRET = process.env.LINKEDIN_API_SECRET;

// Google Sheets API credentials
const GOOGLE_SHEETS_API_KEY = process.env.GOOGLE_SHEETS_API_KEY;

/**
 * PUT endpoint to update the status of an applicant
 */
export const updateApplicantStatus: APIGatewayProxyHandler = async (event) => {
  try {
    const applicantId = event.pathParameters?.id;
    const { status, emailTemplate } = JSON.parse(event.body || '{}');

    if (!applicantId || !status) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing applicant ID or status' }),
      };
    }

    // Update applicant status in the database
    const updatedApplicant = await prisma.applicant.update({
      where: { id: applicantId },
      data: { status },
    });

    // Fetch applicant data from LinkedIn API
    const linkedInData = await fetchLinkedInData(updatedApplicant.linkedInProfileUrl);

    // Update Excel sheet with applicant data
    await updateExcelSheet(updatedApplicant, linkedInData);

    // Send email to applicant
    if (emailTemplate) {
      await sendEmail(updatedApplicant.email, emailTemplate, updatedApplicant);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Applicant status updated successfully',
        applicant: updatedApplicant,
      }),
    };
  } catch (error) {
    console.error('Error updating applicant status:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
    };
  } finally {
    await prisma.$disconnect();
  }
};

/**
 * Fetch applicant data from LinkedIn API
 */
async function fetchLinkedInData(profileUrl: string) {
  // This is a placeholder implementation. In a real-world scenario, you would use the LinkedIn API SDK.
  // For demonstration purposes, we're returning mock data.
  return {
    name: 'John Doe',
    email: 'john.doe@example.com',
    jobTitle: 'Software Engineer',
    company: 'Tech Corp',
  };
}

/**
 * Update Excel sheet with applicant data
 */
async function updateExcelSheet(applicant: any, linkedInData: any) {
  const sheets = google.sheets({ version: 'v4', auth: GOOGLE_SHEETS_API_KEY });
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  const values = [
    [
      applicant.id,
      linkedInData.name,
      linkedInData.email,
      linkedInData.jobTitle,
      linkedInData.company,
      applicant.status,
      new Date().toISOString(),
    ],
  ];

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: 'A1', // Assumes the first sheet in the spreadsheet
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values,
    },
  });
}

/**
 * Send email to applicant using AWS SES
 */
async function sendEmail(email: string, template: string, applicant: any) {
  const params = {
    Destination: {
      ToAddresses: [email],
    },
    Message: {
      Body: {
        Text: {
          Data: replaceTemplateVariables(template, applicant),
        },
      },
      Subject: {
        Data: 'Update on Your Application',
      },
    },
    Source: process.env.SENDER_EMAIL,
  };

  await ses.sendEmail(params);
}

/**
 * Replace template variables with actual applicant data
 */
function replaceTemplateVariables(template: string, applicant: any) {
  return template
    .replace('{{name}}', applicant.name)
    .replace('{{status}}', applicant.status)
    .replace('{{position}}', applicant.position);
}

/**
 * Documentation for updateApplicantStatus endpoint
 */
export const updateApplicantStatusDocs = {
  title: 'Update Applicant Status',
  description: 'Updates the status of an applicant and performs related actions',
  method: 'PUT',
  path: '/api/applicants/{id}/status',
  pathParameters: {
    id: {
      type: 'string',
      description: 'The ID of the applicant',
    },
  },
  requestBody: {
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              description: 'The new status of the applicant',
            },
            emailTemplate: {
              type: 'string',
              description: 'Optional email template to send to the applicant',
            },
          },
          required: ['status'],
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Applicant status updated successfully',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              message: { type: 'string' },
              applicant: { type: 'object' },
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