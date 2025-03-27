import { PrismaClient } from '@prisma/client';
import { SESClient, SendEmailCommand } from '@microfox/aws-ses';
import { google } from '@microfox/google-sdk';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();
const ses = new SESClient({ region: process.env.AWS_REGION });

interface Applicant {
  id: string;
  name: string;
  profileUrl: string;
  email: string;
  jobTitle: string;
}

/**
 * GET endpoint to fetch applicants from LinkedIn and save to Excel
 */
export const getApplicants = async (event: any) => {
  try {
    // Extract query parameters
    const { limit = 10, offset = 0 } = event.queryStringParameters || {};

    // Fetch applicants from LinkedIn API (mock implementation)
    const applicants = await fetchApplicantsFromLinkedIn(parseInt(limit), parseInt(offset));

    // Save applicants to database
    await saveApplicantsToDatabase(applicants);

    // Save applicants to Excel sheet
    await saveApplicantsToExcel(applicants);

    // Send email responses
    await sendEmailResponses(applicants);

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Applicants processed successfully', count: applicants.length }),
    };
  } catch (error) {
    console.error('Error processing applicants:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
    };
  } finally {
    await prisma.$disconnect();
  }
};

async function fetchApplicantsFromLinkedIn(limit: number, offset: number): Promise<Applicant[]> {
  // TODO: Implement actual LinkedIn API integration
  // This is a mock implementation
  return Array.from({ length: limit }, (_, i) => ({
    id: `id_${i + offset}`,
    name: `Applicant ${i + offset}`,
    profileUrl: `https://linkedin.com/in/applicant-${i + offset}`,
    email: `applicant${i + offset}@example.com`,
    jobTitle: `Job Title ${i + offset}`,
  }));
}

async function saveApplicantsToDatabase(applicants: Applicant[]): Promise<void> {
  await prisma.applicant.createMany({
    data: applicants.map(applicant => ({
      linkedinId: applicant.id,
      name: applicant.name,
      profileUrl: applicant.profileUrl,
      email: applicant.email,
      jobTitle: applicant.jobTitle,
    })),
    skipDuplicates: true,
  });
}

async function saveApplicantsToExcel(applicants: Applicant[]): Promise<void> {
  const sheets = google.sheets({ version: 'v4', auth: process.env.GOOGLE_API_KEY });
  const spreadsheetId = process.env.EXCEL_SHEET_ID;

  const values = applicants.map(applicant => [
    applicant.name,
    applicant.profileUrl,
    applicant.email,
    applicant.jobTitle,
  ]);

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: 'A1',
    valueInputOption: 'RAW',
    requestBody: {
      values,
    },
  });
}

async function sendEmailResponses(applicants: Applicant[]): Promise<void> {
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

    await ses.send(new SendEmailCommand(params));
  }
}

/**
 * Documentation for getApplicants endpoint
 */
export const getApplicantsDocs = {
  title: 'Get Applicants',
  description: 'Retrieve a list of applicants from LinkedIn, save to Excel, and send email responses',
  method: 'GET',
  path: '/api/applicants',
  queryParameters: {
    limit: {
      type: 'number',
      description: 'Number of applicants to retrieve (default: 10)',
    },
    offset: {
      type: 'number',
      description: 'Offset for pagination (default: 0)',
    },
  },
  responses: {
    200: {
      description: 'Applicants processed successfully',
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