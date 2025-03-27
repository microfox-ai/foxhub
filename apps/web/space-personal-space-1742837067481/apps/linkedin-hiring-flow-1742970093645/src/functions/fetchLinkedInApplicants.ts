import { APIGatewayProxyHandler } from 'aws-lambda';
import prisma from '../db/prisma';
import { config } from 'dotenv';
import { SESClient, SendEmailCommand } from '@microfox/aws-ses';
import { google } from '@microfox/google-sdk';

// Load environment variables
config();

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
 * GET endpoint to fetch new applicants from LinkedIn API and store them in the database
 */
export const fetchLinkedInApplicants: APIGatewayProxyHandler = async (event) => {
  try {
    // Fetch new applicants from LinkedIn API
    const newApplicants = await getNewApplicantsFromLinkedIn();

    // Store applicants in the database
    const storedApplicants = await storeApplicantsInDatabase(newApplicants);

    // Update Google Sheets
    await updateGoogleSheets(storedApplicants);

    // Send email responses
    await sendEmailResponses(storedApplicants);

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Successfully fetched and processed new applicants',
        count: storedApplicants.length,
      }),
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

async function getNewApplicantsFromLinkedIn(): Promise<LinkedInApplicant[]> {
  // TODO: Implement LinkedIn API integration
  // This is a placeholder implementation
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

async function storeApplicantsInDatabase(applicants: LinkedInApplicant[]) {
  const storedApplicants = await Promise.all(
    applicants.map(async (applicant) => {
      return await prisma.applicant.create({
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

async function updateGoogleSheets(applicants: LinkedInApplicant[]) {
  const spreadsheetId = process.env.GOOGLE_SHEETS_ID;
  const range = 'Sheet1!A1:D1';

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

async function sendEmailResponses(applicants: LinkedInApplicant[]) {
  const emailTemplate = process.env.EMAIL_TEMPLATE || '';

  for (const applicant of applicants) {
    const personalizedEmail = emailTemplate
      .replace('{{name}}', applicant.name)
      .replace('{{jobTitle}}', applicant.jobTitle);

    const params = {
      Destination: {
        ToAddresses: [applicant.email],
      },
      Message: {
        Body: {
          Text: { Data: personalizedEmail },
        },
        Subject: { Data: 'Thank you for your application' },
      },
      Source: process.env.SENDER_EMAIL,
    };

    await sesClient.send(new SendEmailCommand(params));
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
      description: 'Successfully fetched and processed new applicants',
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