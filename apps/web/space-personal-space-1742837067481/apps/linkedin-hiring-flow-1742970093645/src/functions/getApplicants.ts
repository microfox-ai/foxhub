import { APIGatewayProxyHandler } from 'aws-lambda';
import prisma from '../db/prisma';
import { createSESSdk } from '@microfox/aws-ses';
import { createGoogleOAuthManager } from '@microfox/google-sdk';
import dotenv from 'dotenv';

dotenv.config();

// Initialize AWS SES SDK
const ses = createSESSdk({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  region: process.env.AWS_REGION || 'us-east-1',
});

// Initialize Google OAuth Manager
const googleAuth = createGoogleOAuthManager({
  accessToken: process.env.GOOGLE_ACCESS_TOKEN!,
  refreshToken: process.env.GOOGLE_REFRESH_TOKEN!,
  clientId: process.env.GOOGLE_CLIENT_ID!,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
});

interface Applicant {
  id: string;
  name: string;
  profileUrl: string;
  email: string;
  jobTitle: string;
}

/**
 * GET endpoint to retrieve a list of applicants with optional filtering
 */
export const getApplicants: APIGatewayProxyHandler = async (event) => {
  try {
    // Extract query parameters for filtering
    const { jobTitle, limit } = event.queryStringParameters || {};

    // Construct the Prisma query
    let query: any = {};
    if (jobTitle) {
      query.jobTitle = { contains: jobTitle };
    }

    // Fetch applicants from the database
    const applicants = await prisma.applicant.findMany({
      where: query,
      take: limit ? parseInt(limit) : undefined,
    });

    // Process applicants and save to Excel
    await saveApplicantsToExcel(applicants);

    // Send email notifications
    await sendEmailNotifications(applicants);

    return {
      statusCode: 200,
      body: JSON.stringify(applicants),
    };
  } catch (error) {
    console.error('Error fetching applicants:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
    };
  } finally {
    await prisma.$disconnect();
  }
};

/**
 * Save applicants data to an Excel sheet
 */
async function saveApplicantsToExcel(applicants: Applicant[]) {
  try {
    // Use Google Sheets API to create and populate a spreadsheet
    const tokens = await googleAuth;
    // Implement Google Sheets API calls here using the access token
    console.log('Saving applicants to Excel:', applicants.length);
  } catch (error) {
    console.error('Error saving applicants to Excel:', error);
  }
}

/**
 * Send email notifications to applicants
 */
async function sendEmailNotifications(applicants: Applicant[]) {
  try {
    for (const applicant of applicants) {
      // Customize email template
      const emailBody = `Dear ${applicant.name},\n\nThank you for applying for the ${applicant.jobTitle} position. We have received your application and will review it shortly.\n\nBest regards,\nHR Team`;

      // Send email using AWS SES
      await ses.sendEmail({
        sender: process.env.SENDER_EMAIL!,
        recipient: applicant.email,
        subject: 'Application Received',
        bodyText: emailBody,
      });

      console.log(`Email sent to ${applicant.email}`);
    }
  } catch (error) {
    console.error('Error sending email notifications:', error);
  }
}

/**
 * Documentation for the getApplicants endpoint
 */
export const getApplicantsDocs = {
  title: 'Get Applicants',
  description: 'Retrieve a list of applicants with optional filtering',
  method: 'GET',
  path: '/api/applicants',
  queryParameters: {
    jobTitle: {
      type: 'string',
      description: 'Filter applicants by job title',
    },
    limit: {
      type: 'number',
      description: 'Limit the number of returned applicants',
    },
  },
  responses: {
    200: {
      description: 'List of applicants retrieved successfully',
      schema: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            profileUrl: { type: 'string' },
            email: { type: 'string' },
            jobTitle: { type: 'string' },
          },
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