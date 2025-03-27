import { SESClient } from '@microfox/aws-ses';
import prisma from '../db/prisma';

/**
 * Sends daily emails to rejected applicants who have been in the system for 3 months
 */
export const sendDailyEmails = async (event: any) => {
  try {
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    // Fetch rejected applicants who have been in the system for 3 months
    const rejectedApplicants = await prisma.applicant.findMany({
      where: {
        status: 'REJECTED',
        createdAt: {
          lte: threeMonthsAgo,
        },
        followUpEmailSent: false,
      },
    });

    const sesClient = new SESClient({
      region: process.env.AWS_REGION,
    });

    let emailsSent = 0;

    for (const applicant of rejectedApplicants) {
      try {
        await sesClient.sendEmail({
          Destination: {
            ToAddresses: [applicant.email],
          },
          Message: {
            Body: {
              Text: {
                Data: `Dear ${applicant.name},\n\nWe appreciate your interest in our company. Unfortunately, we are unable to offer you a position at this time. We encourage you to apply for future openings that match your skills and experience.\n\nBest regards,\nHR Team`,
              },
            },
            Subject: {
              Data: 'Update on Your Application',
            },
          },
          Source: process.env.SENDER_EMAIL,
        });

        // Update the applicant record to mark the follow-up email as sent
        await prisma.applicant.update({
          where: { id: applicant.id },
          data: { followUpEmailSent: true },
        });

        emailsSent++;
      } catch (emailError) {
        console.error(`Failed to send email to ${applicant.email}:`, emailError);
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Daily email job completed successfully',
        emailsSent,
      }),
    };
  } catch (error) {
    console.error('Error running daily email job:', error);
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
  description: 'Cron job that runs daily to send follow-up emails to rejected applicants after 3 months',
  method: 'GET',
  path: '/cron/send-daily-emails',
  schedule: 'cron(0 9 * * ? *)', // Runs daily at 9:00 AM UTC
  responses: {
    200: {
      description: 'Job completed successfully',
      schema: {
        type: 'object',
        properties: {
          message: { type: 'string' },
          emailsSent: { type: 'number' },
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