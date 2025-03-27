import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import prisma from '../db/prisma';
import { google } from '@microfox/google-sdk';

// Configure AWS SES client
const sesClient = new SESClient({ region: process.env.AWS_REGION });

// Configure Google Sheets API
const sheets = google.sheets({ version: 'v4' });

/**
 * Sends an email using AWS SES
 * @param to Recipient email address
 * @param subject Email subject
 * @param body Email body
 */
async function sendEmail(to: string, subject: string, body: string): Promise<void> {
  const params = {
    Destination: { ToAddresses: [to] },
    Message: {
      Body: { Text: { Data: body } },
      Subject: { Data: subject },
    },
    Source: process.env.SENDER_EMAIL,
  };

  try {
    await sesClient.send(new SendEmailCommand(params));
    console.log(`Email sent successfully to ${to}`);
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
}

/**
 * Updates the Excel sheet with applicant data
 * @param applicantData Applicant data to be added to the sheet
 */
async function updateExcelSheet(applicantData: any): Promise<void> {
  try {
    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.SPREADSHEET_ID,
      range: 'Sheet1!A:Z',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [Object.values(applicantData)],
      },
    });
    console.log('Excel sheet updated successfully');
  } catch (error) {
    console.error('Error updating Excel sheet:', error);
    throw error;
  }
}

/**
 * Cron job that sends daily emails to applicants who have been in the system for 3 months and were not selected
 */
export const sendDailyEmails = async (event: any) => {
  try {
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const rejectedApplicants = await prisma.applicant.findMany({
      where: {
        createdAt: {
          lte: threeMonthsAgo,
        },
        status: 'REJECTED',
        followUpEmailSent: false,
      },
    });

    const emailsSent = [];

    for (const applicant of rejectedApplicants) {
      const emailTemplate = `Dear ${applicant.name},

We hope this email finds you well. We wanted to follow up regarding your application for the position at our company.

While we were impressed with your qualifications, we have decided to move forward with other candidates who more closely match our current needs.

We appreciate your interest in our company and wish you the best in your future endeavors.

Best regards,
[Your Company Name]`;

      await sendEmail(applicant.email, 'Follow-up on Your Application', emailTemplate);

      await prisma.applicant.update({
        where: { id: applicant.id },
        data: { followUpEmailSent: true },
      });

      await updateExcelSheet({
        Name: applicant.name,
        Email: applicant.email,
        ProfileURL: applicant.profileUrl,
        JobTitle: applicant.jobTitle,
        Status: 'Rejected - Follow-up Sent',
        Date: new Date().toISOString(),
      });

      emailsSent.push(applicant.email);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Daily emails sent successfully',
        emailsSent: emailsSent,
      }),
    };
  } catch (error) {
    console.error('Error running sendDailyEmails job:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
    };
  } finally {
    await prisma.$disconnect();
  }
};

/**
 * Documentation for sendDailyEmails cron job
 */
export const sendDailyEmailsDocs = {
  title: 'Send Daily Emails to Rejected Applicants',
  description: 'Cron job that sends daily emails to applicants who have been in the system for 3 months and were not selected',
  method: 'GET',
  path: '/cron/send-daily-emails',
  schedule: 'cron(0 9 * * ? *)', // Runs daily at 9:00 AM UTC
  responses: {
    200: {
      description: 'Emails sent successfully',
      schema: {
        type: 'object',
        properties: {
          message: { type: 'string' },
          emailsSent: { 
            type: 'array',
            items: { type: 'string' }
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