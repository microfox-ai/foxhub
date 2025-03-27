import { APIGatewayProxyHandler } from 'aws-lambda';
import prisma from '../db/prisma';
import { GoogleSpreadsheet } from '@microfox/google-sdk';
import { SESClient, SendEmailCommand } from '@microfox/aws-ses';
import dotenv from 'dotenv';

dotenv.config();

// LinkedIn API mock (replace with actual LinkedIn API integration)
const linkedInApi = {
  getApplicants: async () => {
    // Mock data - replace with actual LinkedIn API call
    return [
      { name: 'John Doe', profileUrl: 'https://linkedin.com/in/johndoe', email: 'john@example.com', jobTitle: 'Software Engineer' },
      { name: 'Jane Smith', profileUrl: 'https://linkedin.com/in/janesmith', email: 'jane@example.com', jobTitle: 'Product Manager' },
    ];
  }
};

const sesClient = new SESClient({ region: process.env.AWS_REGION });

/**
 * Exports applicant data to an Excel sheet and sends email notifications
 */
export const exportToExcel: APIGatewayProxyHandler = async (event) => {
  try {
    // Fetch applicants from LinkedIn API
    const applicants = await linkedInApi.getApplicants();

    // Create and populate Google Sheet
    const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID);
    await doc.useServiceAccountAuth({
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY,
    });
    await doc.loadInfo();
    const sheet = doc.sheetsByIndex[0];
    await sheet.setHeaderRow(['Name', 'Profile URL', 'Email', 'Job Title']);
    await sheet.addRows(applicants);

    // Send email notifications
    for (const applicant of applicants) {
      const emailParams = {
        Destination: { ToAddresses: [applicant.email] },
        Message: {
          Body: {
            Text: { Data: `Dear ${applicant.name},\n\nThank you for applying. We've received your application for the ${applicant.jobTitle} position.\n\nBest regards,\nHR Team` },
          },
          Subject: { Data: 'Application Received' },
        },
        Source: process.env.SENDER_EMAIL,
      };

      const command = new SendEmailCommand(emailParams);
      await sesClient.send(command);
    }

    // Save applicants to database
    await prisma.applicant.createMany({
      data: applicants.map(a => ({
        name: a.name,
        email: a.email,
        profileUrl: a.profileUrl,
        jobTitle: a.jobTitle,
      })),
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ message: `Exported ${applicants.length} applicants to Excel and sent notifications.` }),
    };
  } catch (error) {
    console.error('Error in exportToExcel:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error instanceof Error ? error.message : 'An unknown error occurred' }),
    };
  } finally {
    await prisma.$disconnect();
  }
};

/**
 * Documentation for exportToExcel endpoint
 */
export const exportToExcelDocs = {
  title: 'Export Applicants to Excel',
  description: 'Exports LinkedIn applicant data to an Excel sheet and sends email notifications',
  method: 'GET',
  path: '/api/export-excel',
  responses: {
    200: {
      description: 'Applicants exported successfully',
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