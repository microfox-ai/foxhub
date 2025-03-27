import { createSESSdk } from '@microfox/aws-ses';
import { createGoogleOAuthManager } from '@microfox/google-sdk';
import prisma from '../db/prisma';
import { google } from 'googleapis';
import * as dotenv from 'dotenv';

dotenv.config();

// Initialize AWS SES SDK
const ses = createSESSdk({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  region: process.env.AWS_REGION!,
});

// Initialize Google OAuth Manager
const googleAuth = createGoogleOAuthManager({
  accessToken: process.env.GOOGLE_ACCESS_TOKEN!,
  refreshToken: process.env.GOOGLE_REFRESH_TOKEN!,
  clientId: process.env.GOOGLE_CLIENT_ID!,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
});

// Initialize Google Sheets API
const sheets = google.sheets({ version: 'v4', auth: googleAuth });

interface LinkedInApplicant {
  name: string;
  profileUrl: string;
  email: string;
  jobTitle: string;
}

/**
 * Fetch applicants from LinkedIn API and store them in the database
 */
export const fetchLinkedInApplicants = async (event: any) => {
  try {
    // Fetch applicants from LinkedIn API (mock implementation)
    const applicants: LinkedInApplicant[] = await fetchApplicantsFromLinkedIn();

    // Store applicants in the database
    const storedApplicants = await storeApplicantsInDatabase(applicants);

    // Update Google Sheets with applicant data
    await updateGoogleSheet(applicants);

    // Send email notifications
    await sendEmailNotifications(applicants);

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Applicants fetched and processed successfully', count: storedApplicants.length }),
    };
  } catch (error) {
    console.error('Error fetching LinkedIn applicants:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
    };
  } finally {
    await prisma.$disconnect();
  }
};

/**
 * Mock function to fetch applicants from LinkedIn API
 */
async function fetchApplicantsFromLinkedIn(): Promise<LinkedInApplicant[]> {
  // TODO: Implement actual LinkedIn API integration
  return [
    { name: 'John Doe', profileUrl: 'https://linkedin.com/in/johndoe', email: 'john@example.com', jobTitle: 'Software Engineer' },
    { name: 'Jane Smith', profileUrl: 'https://linkedin.com/in/janesmith', email: 'jane@example.com', jobTitle: 'Product Manager' },
  ];
}

/**
 * Store applicants in the database using Prisma
 */
async function storeApplicantsInDatabase(applicants: LinkedInApplicant[]): Promise<any[]> {
  const storedApplicants = await Promise.all(
    applicants.map(async (applicant) => {
      return prisma.applicant.create({
        data: {
          name: applicant.name,
          profileUrl: applicant.profileUrl,
          email: applicant.email,
          jobTitle: applicant.jobTitle,
        },
      });
    })
  );
  return storedApplicants;
}

/**
 * Update Google Sheet with applicant data
 */
async function updateGoogleSheet(applicants: LinkedInApplicant[]): Promise<void> {
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  const range = 'Sheet1!A2:D'; // Assuming headers are in row 1

  const values = applicants.map((applicant) => [
    applicant.name,
    applicant.profileUrl,
    applicant.email,
    applicant.jobTitle,
  ]);

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
 * Send email notifications to applicants
 */
async function sendEmailNotifications(applicants: LinkedInApplicant[]): Promise<void> {
  const emailTemplate = `
    Dear {name},

    Thank you for applying for the {jobTitle} position. We have received your application and will review it shortly.

    Best regards,
    Your Company
  `;

  for (const applicant of applicants) {
    const personalizedEmail = emailTemplate
      .replace('{name}', applicant.name)
      .replace('{jobTitle}', applicant.jobTitle);

    await ses.sendEmail({
      sender: process.env.SENDER_EMAIL!,
      recipient: applicant.email,
      subject: 'Application Received',
      bodyText: personalizedEmail,
    });
  }
}

/**
 * Documentation for fetchLinkedInApplicants endpoint
 */
export const fetchLinkedInApplicantsDocs = {
  title: 'Fetch LinkedIn Applicants',
  description: 'Fetches new applicants from LinkedIn API and stores them in the database',
  method: 'GET',
  path: '/api/fetch-applicants',
  responses: {
    200: {
      description: 'Applicants fetched and processed successfully',
      schema: {
        type: 'object',
        properties: {
          message: { type: 'string' },
          count: { type: 'number' },
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