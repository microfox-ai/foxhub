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
  name: string;
  profileUrl: string;
  email: string;
  jobTitle: string;
}

/**
 * GET endpoint to export applicant data to Excel and send email responses
 */
export const exportToExcel: APIGatewayProxyHandler = async (event) => {
  try {
    // Fetch applicants from the database
    const applicants = await prisma.applicant.findMany();

    // Prepare data for Excel sheet
    const sheetData = applicants.map((applicant) => [
      applicant.name,
      applicant.profileUrl,
      applicant.email,
      applicant.jobTitle,
    ]);

    // Export data to Google Sheets (as an Excel alternative)
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'A1',
      valueInputOption: 'RAW',
      requestBody: {
        values: [['Name', 'Profile URL', 'Email', 'Job Title'], ...sheetData],
      },
    });

    // Send email responses to applicants
    for (const applicant of applicants) {
      await sendEmailResponse(applicant);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Data exported and emails sent successfully' }),
    };
  } catch (error) {
    console.error('Error exporting data:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
    };
  } finally {
    await prisma.$disconnect();
  }
};

async function sendEmailResponse(applicant: Applicant) {
  const emailTemplate = `Dear ${applicant.name},

Thank you for applying for the position of ${applicant.jobTitle}. We have received your application and will review it shortly.

Best regards,
Your Company Name`;

  const params = {
    Destination: {
      ToAddresses: [applicant.email],
    },
    Message: {
      Body: {
        Text: { Data: emailTemplate },
      },
      Subject: { Data: 'Application Received' },
    },
    Source: process.env.SENDER_EMAIL,
  };

  const command = new SendEmailCommand(params);
  await sesClient.send(command);
}

/**
 * Documentation for exportToExcel endpoint
 */
export const exportToExcelDocs = {
  title: 'Export Applicant Data to Excel',
  description: 'Exports applicant data to an Excel sheet and sends email responses',
  method: 'GET',
  path: '/api/export-excel',
  responses: {
    200: {
      description: 'Data exported and emails sent successfully',
      schema: {
        type: 'object',
        properties: {
          message: { type: 'string' },
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