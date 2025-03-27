import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { google } from '@microfox/google-sdk';
import prisma from '../db/prisma';
import dotenv from 'dotenv';

dotenv.config();

// Initialize SES client
const sesClient = new SESClient({ region: process.env.AWS_REGION });

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
  // This is a placeholder function. In a real implementation, you would use the LinkedIn API to fetch applicants.
  return [
    {
      name: 'John Doe',
      profileUrl: 'https://www.linkedin.com/in/johndoe',
      email: 'john.doe@example.com',
      jobTitle: 'Software Engineer',
    },
    // Add more mock applicants as needed
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
 * Saves applicants to Google Sheets
 * @param applicants Array of LinkedInApplicant
 */
async function saveApplicantsToGoogleSheets(applicants: LinkedInApplicant[]): Promise<void> {
  const spreadsheetId = process.env.GOOGLE_SHEETS_ID;
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
 * Sends email to applicant
 * @param applicant LinkedInApplicant
 */
async function sendEmailToApplicant(applicant: LinkedInApplicant): Promise<void> {
  const params = {
    Destination: {
      ToAddresses: [applicant.email],
    },
    Message: {
      Body: {
        Text: {
          Charset: 'UTF-8',
          Data: `Dear ${applicant.name},\n\nThank you for applying to our position. We have received your application and will review it shortly.\n\nBest regards,\nHR Team`,
        },
      },
      Subject: {
        Charset: 'UTF-8',
        Data: 'Application Received',
      },
    },
    Source: process.env.SENDER_EMAIL,
  };

  const command = new SendEmailCommand(params);
  await sesClient.send(command);
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

    // Save applicants to Google Sheets
    await saveApplicantsToGoogleSheets(newApplicants);

    // Send emails to applicants
    for (const applicant of newApplicants) {
      await sendEmailToApplicant(applicant);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Fetch applicants job completed successfully',
        newApplicantsCount: newApplicants.length,
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
          newApplicantsCount: { type: 'number' },
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