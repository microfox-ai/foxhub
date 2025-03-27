import { APIGatewayProxyHandler } from 'aws-lambda';
import prisma from '../db/prisma';
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import { google } from 'googleapis';
import dotenv from 'dotenv';

dotenv.config();

const ses = new SESClient({ region: process.env.AWS_REGION });
const sheets = google.sheets({ version: 'v4' });

interface LinkedInApplicant {
  name: string;
  profileUrl: string;
  email: string;
  jobTitle: string;
}

/**
 * Fetches new applicants from LinkedIn API and stores them in the database
 */
export const fetchLinkedInApplicants: APIGatewayProxyHandler = async (event) => {
  try {
    // Fetch applicants from LinkedIn API
    const applicants = await getApplicantsFromLinkedIn();

    // Save applicants to database
    const savedApplicants = await saveApplicantsToDatabase(applicants);

    // Update Excel sheet
    await updateExcelSheet(savedApplicants);

    // Send email responses
    await sendEmailResponses(savedApplicants);

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Applicants fetched and processed successfully', count: savedApplicants.length }),
    };
  } catch (error) {
    console.error('Error in fetchLinkedInApplicants:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
    };
  } finally {
    await prisma.$disconnect();
  }
};

async function getApplicantsFromLinkedIn(): Promise<LinkedInApplicant[]> {
  // TODO: Implement LinkedIn API integration
  // This is a placeholder implementation
  return [
    { name: 'John Doe', profileUrl: 'https://linkedin.com/in/johndoe', email: 'john@example.com', jobTitle: 'Software Engineer' },
    { name: 'Jane Smith', profileUrl: 'https://linkedin.com/in/janesmith', email: 'jane@example.com', jobTitle: 'Product Manager' },
  ];
}

async function saveApplicantsToDatabase(applicants: LinkedInApplicant[]) {
  return await prisma.applicant.createMany({
    data: applicants.map(applicant => ({
      name: applicant.name,
      profileUrl: applicant.profileUrl,
      email: applicant.email,
      jobTitle: applicant.jobTitle,
    })),
    skipDuplicates: true,
  });
}

async function updateExcelSheet(applicants: LinkedInApplicant[]) {
  const auth = new google.auth.GoogleAuth({
    keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const spreadsheetId = process.env.EXCEL_SHEET_ID;
  const range = 'Sheet1!A:D'; // Adjust based on your sheet structure

  const values = applicants.map(applicant => [
    applicant.name,
    applicant.profileUrl,
    applicant.email,
    applicant.jobTitle,
  ]);

  await sheets.spreadsheets.values.append({
    auth,
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

    // TODO: Implement confirmation prompt before sending each email
    // For now, we'll send emails without confirmation

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
 * Documentation for fetchLinkedInApplicants endpoint
 */
export const fetchLinkedInApplicantsDocs = {
  title: 'Fetch LinkedIn Applicants',
  description: 'Fetches new applicants from LinkedIn API, stores them in the database, updates Excel sheet, and sends email responses',
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