import prisma from '../db/prisma';
import { createSESSdk } from '@microfox/aws-ses';
import { google } from '@microfox/google-sdk';
import dotenv from 'dotenv';

dotenv.config();

// Initialize AWS SES SDK
const ses = createSESSdk({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  region: process.env.AWS_REGION!,
});

// Initialize Google Sheets API
const sheets = google.sheets({ version: 'v4', auth: process.env.GOOGLE_API_KEY });

interface LinkedInApplicant {
  name: string;
  profileUrl: string;
  email: string;
  jobTitle: string;
}

/**
 * Fetches new applicants from LinkedIn API
 * @returns Array of LinkedInApplicant
 */
async function fetchApplicantsFromLinkedIn(): Promise<LinkedInApplicant[]> {
  // TODO: Implement LinkedIn API integration
  // This is a placeholder function. In a real-world scenario, you would
  // implement the LinkedIn API integration here.
  return [
    {
      name: 'John Doe',
      profileUrl: 'https://www.linkedin.com/in/johndoe',
      email: 'john.doe@example.com',
      jobTitle: 'Software Engineer',
    },
    // ... more applicants
  ];
}

/**
 * Saves applicants to the database
 * @param applicants Array of LinkedInApplicant
 */
async function saveApplicantsToDatabase(applicants: LinkedInApplicant[]): Promise<void> {
  for (const applicant of applicants) {
    await prisma.linkedInApplicant.create({
      data: applicant,
    });
  }
}

/**
 * Adds applicants to Google Sheets
 * @param applicants Array of LinkedInApplicant
 */
async function addApplicantsToSheet(applicants: LinkedInApplicant[]): Promise<void> {
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  const range = 'Sheet1!A1:D1';

  const values = applicants.map(applicant => [
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
 * Sends email to applicants
 * @param applicants Array of LinkedInApplicant
 */
async function sendEmailsToApplicants(applicants: LinkedInApplicant[]): Promise<void> {
  const emailTemplate = process.env.EMAIL_TEMPLATE || 'Thank you for applying!';

  for (const applicant of applicants) {
    await ses.sendEmail({
      sender: process.env.SENDER_EMAIL!,
      recipient: applicant.email,
      subject: 'Application Received',
      bodyHtml: `<p>Dear ${applicant.name},</p><p>${emailTemplate}</p>`,
      bodyText: `Dear ${applicant.name},\n\n${emailTemplate}`,
    });
  }
}

/**
 * Cron job that runs every 6 hours to fetch new applicants from LinkedIn API
 */
export const fetchApplicantsJob = async (event: any) => {
  try {
    // Fetch new applicants from LinkedIn
    const newApplicants = await fetchApplicantsFromLinkedIn();

    // Save applicants to database
    await saveApplicantsToDatabase(newApplicants);

    // Add applicants to Google Sheet
    await addApplicantsToSheet(newApplicants);

    // Send emails to applicants
    await sendEmailsToApplicants(newApplicants);

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Fetch applicants job completed successfully',
        applicantsFetched: newApplicants.length,
      }),
    };
  } catch (error) {
    console.error('Error running fetch applicants job:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
    };
  } finally {
    await prisma.$disconnect();
  }
};

/**
 * Documentation for cron job endpoints
 */
export const fetchApplicantsJobDocs = {
  title: 'Fetch Applicants Job',
  description: 'Cron job that runs every 6 hours to fetch new applicants from LinkedIn API',
  method: 'GET',
  path: '/cron/fetch-applicants',
  schedule: 'rate(6 hours)',
  responses: {
    200: {
      description: 'Job completed successfully',
      schema: {
        type: 'object',
        properties: {
          message: { type: 'string' },
          applicantsFetched: { type: 'number' },
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