import { APIGatewayProxyHandler } from 'aws-lambda';
import prisma from '../db/prisma';
import { SES } from '@microfox/aws-ses';
import { google } from '@microfox/google-sdk';
import dotenv from 'dotenv';

dotenv.config();

// Initialize SES client
const ses = new SES({
  region: process.env.AWS_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

// Initialize Google Sheets client
const sheets = google.sheets({ version: 'v4', auth: process.env.GOOGLE_API_KEY });

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

    // Fetch applicant details
    const applicant = await prisma.applicant.findUnique({
      where: { id: applicantId },
    });

    if (!applicant) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Applicant not found' }),
      };
    }

    // Update Excel sheet
    await updateExcelSheet(applicant);

    // Send email notification
    if (emailTemplate) {
      await sendEmailNotification(applicant, emailTemplate);
    }

    return {
      statusCode: 200,
      body: JSON.stringify(updatedApplicant),
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
 * Update Excel sheet with applicant data
 */
async function updateExcelSheet(applicant: any) {
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  const range = 'Sheet1!A:Z'; // Adjust the range as needed

  const values = [
    [
      applicant.name,
      applicant.profileUrl,
      applicant.email,
      applicant.jobTitle,
      applicant.status,
      // Add more columns as needed
    ],
  ];

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values,
    },
  });
}

/**
 * Send email notification to the applicant
 */
async function sendEmailNotification(applicant: any, emailTemplate: string) {
  const params = {
    Destination: {
      ToAddresses: [applicant.email],
    },
    Message: {
      Body: {
        Text: {
          Data: emailTemplate
            .replace('{{name}}', applicant.name)
            .replace('{{status}}', applicant.status),
        },
      },
      Subject: {
        Data: 'Application Status Update',
      },
    },
    Source: process.env.SENDER_EMAIL,
  };

  await ses.sendEmail(params);
}

/**
 * Documentation for updateApplicantStatus endpoint
 */
export const updateApplicantStatusDocs = {
  title: 'Update Applicant Status',
  description: 'Updates the status of an applicant and performs related actions',
  method: 'PUT',
  path: '/api/applicants/{id}/status',
  parameters: {
    path: {
      id: {
        type: 'string',
        description: 'The ID of the applicant',
        required: true,
      },
    },
    body: {
      status: {
        type: 'string',
        description: 'The new status of the applicant',
        required: true,
      },
      emailTemplate: {
        type: 'string',
        description: 'Email template to send to the applicant',
        required: false,
      },
    },
  },
  responses: {
    200: {
      description: 'Applicant status updated successfully',
      schema: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          email: { type: 'string' },
          status: { type: 'string' },
          // Add more properties as needed
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
    404: {
      description: 'Applicant not found',
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