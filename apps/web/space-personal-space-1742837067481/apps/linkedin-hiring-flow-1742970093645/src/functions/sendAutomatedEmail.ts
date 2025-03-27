import { APIGatewayProxyHandler } from 'aws-lambda';
import prisma from '../db/prisma';
import { SESClient, SendEmailCommand } from '@microfox/aws-ses';
import { google } from '@microfox/google-sdk';
import dotenv from 'dotenv';

dotenv.config();

// Initialize SES client
const sesClient = new SESClient({ region: process.env.AWS_REGION });

// Initialize Google Sheets API
const sheets = google.sheets({ version: 'v4', auth: process.env.GOOGLE_API_KEY });

interface Applicant {
  id: string;
  name: string;
  email: string;
  profileUrl: string;
  jobTitle: string;
  status: string;
  lastEmailSentDate: Date | null;
}

/**
 * Sends automated emails to applicants based on their status and last email sent date
 */
export const sendAutomatedEmail: APIGatewayProxyHandler = async (event) => {
  try {
    if (!event.body) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Request body is missing' }),
      };
    }

    const { applicantId } = JSON.parse(event.body);

    if (!applicantId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Applicant ID is required' }),
      };
    }

    // Fetch applicant data from the database
    const applicant = await prisma.applicant.findUnique({
      where: { id: applicantId },
    });

    if (!applicant) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Applicant not found' }),
      };
    }

    // Determine if an email should be sent based on status and last email sent date
    const shouldSendEmail = determineIfEmailShouldBeSent(applicant);

    if (!shouldSendEmail) {
      return {
        statusCode: 200,
        body: JSON.stringify({ message: 'No email needs to be sent at this time' }),
      };
    }

    // Get email template based on applicant status
    const emailTemplate = await getEmailTemplate(applicant.status);

    // Prepare email content
    const emailContent = prepareEmailContent(emailTemplate, applicant);

    // Send email using AWS SES
    await sendEmail(applicant.email, emailContent);

    // Update applicant's last email sent date in the database
    await prisma.applicant.update({
      where: { id: applicant.id },
      data: { lastEmailSentDate: new Date() },
    });

    // Update Excel sheet (Google Sheets in this case)
    await updateGoogleSheet(applicant);

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Automated email sent successfully' }),
    };
  } catch (error) {
    console.error('Error sending automated email:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
    };
  } finally {
    await prisma.$disconnect();
  }
};

function determineIfEmailShouldBeSent(applicant: Applicant): boolean {
  const currentDate = new Date();
  const lastEmailSentDate = applicant.lastEmailSentDate ? new Date(applicant.lastEmailSentDate) : null;

  // Example logic: Send email if it's been more than 7 days since the last email or if no email has been sent yet
  return !lastEmailSentDate || (currentDate.getTime() - lastEmailSentDate.getTime()) > 7 * 24 * 60 * 60 * 1000;
}

async function getEmailTemplate(status: string): Promise<string> {
  // In a real-world scenario, you might fetch this from a database or file system
  const templates: { [key: string]: string } = {
    new: 'Thank you for applying! We will review your application soon.',
    inReview: 'Your application is currently under review. We\'ll get back to you shortly.',
    interview: 'Congratulations! We\'d like to schedule an interview with you.',
    rejected: 'Thank you for your interest. Unfortunately, we have decided to pursue other candidates.',
    hired: 'Congratulations! We\'re excited to offer you the position.',
  };

  return templates[status] || 'Thank you for your application.';
}

function prepareEmailContent(template: string, applicant: Applicant): string {
  return template
    .replace('{name}', applicant.name)
    .replace('{jobTitle}', applicant.jobTitle);
}

async function sendEmail(to: string, content: string): Promise<void> {
  const params = {
    Destination: { ToAddresses: [to] },
    Message: {
      Body: { Text: { Data: content } },
      Subject: { Data: 'Update on Your Job Application' },
    },
    Source: process.env.SENDER_EMAIL,
  };

  const command = new SendEmailCommand(params);
  await sesClient.send(command);
}

async function updateGoogleSheet(applicant: Applicant): Promise<void> {
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  const range = 'Sheet1!A:F'; // Adjust based on your sheet structure

  const values = [
    [applicant.name, applicant.email, applicant.profileUrl, applicant.jobTitle, applicant.status, new Date().toISOString()],
  ];

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values },
  });
}

/**
 * Documentation for sendAutomatedEmail endpoint
 */
export const sendAutomatedEmailDocs = {
  title: 'Send Automated Email',
  description: 'Sends automated emails to applicants based on their status and last email sent date',
  method: 'POST',
  path: '/api/send-email',
  requestBody: {
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            applicantId: { type: 'string' },
          },
          required: ['applicantId'],
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Email sent successfully or no email needed',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              message: { type: 'string' },
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
    404: {
      description: 'Applicant not found',
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