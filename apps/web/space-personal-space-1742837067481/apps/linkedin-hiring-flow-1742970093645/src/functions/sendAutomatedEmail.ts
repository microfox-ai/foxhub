import { createSESSdk } from '@microfox/aws-ses';
import prisma from '../db/prisma';
import dotenv from 'dotenv';

dotenv.config();

// Initialize AWS SES SDK
const ses = createSESSdk({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  region: process.env.AWS_REGION || 'us-east-1',
});

interface Applicant {
  id: string;
  name: string;
  email: string;
  status: string;
  lastEmailSentDate: Date | null;
}

/**
 * POST endpoint to send automated emails to applicants
 */
export const sendAutomatedEmail = async (event: any) => {
  try {
    // Parse the incoming request body
    const { applicantIds } = JSON.parse(event.body);

    if (!applicantIds || !Array.isArray(applicantIds)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid input. Expected an array of applicant IDs.' }),
      };
    }

    // Fetch applicants from the database
    const applicants: Applicant[] = await prisma.applicant.findMany({
      where: {
        id: { in: applicantIds },
      },
      select: {
        id: true,
        name: true,
        email: true,
        status: true,
        lastEmailSentDate: true,
      },
    });

    const results = await Promise.all(
      applicants.map(async (applicant) => {
        const emailTemplate = await getEmailTemplate(applicant.status);
        const emailContent = personalizeEmail(emailTemplate, applicant);

        try {
          await ses.sendEmail({
            sender: process.env.SENDER_EMAIL!,
            recipient: applicant.email,
            subject: `Update on your application`,
            bodyHtml: emailContent,
            bodyText: stripHtml(emailContent),
          });

          // Update the lastEmailSentDate in the database
          await prisma.applicant.update({
            where: { id: applicant.id },
            data: { lastEmailSentDate: new Date() },
          });

          return { id: applicant.id, status: 'success' };
        } catch (error) {
          console.error(`Error sending email to ${applicant.email}:`, error);
          return { id: applicant.id, status: 'failed', error: (error as Error).message };
        }
      })
    );

    return {
      statusCode: 200,
      body: JSON.stringify({ results }),
    };
  } catch (error) {
    console.error('Error in sendAutomatedEmail:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
    };
  } finally {
    await prisma.$disconnect();
  }
};

/**
 * Get email template based on applicant status
 */
async function getEmailTemplate(status: string): Promise<string> {
  // In a real-world scenario, you would fetch this from a database or CMS
  const templates: { [key: string]: string } = {
    new: 'Thank you for applying! We have received your application and will review it shortly.',
    inReview: 'Your application is currently under review. We will get back to you soon.',
    interview: 'Congratulations! We would like to invite you for an interview.',
    rejected: 'Thank you for your interest. Unfortunately, we have decided to move forward with other candidates.',
    hired: 'Congratulations! We are pleased to offer you the position.',
  };

  return templates[status] || 'Thank you for your application.';
}

/**
 * Personalize email content with applicant details
 */
function personalizeEmail(template: string, applicant: Applicant): string {
  return `
    <html>
      <body>
        <h2>Dear ${applicant.name},</h2>
        <p>${template}</p>
        <p>Best regards,<br>The Hiring Team</p>
      </body>
    </html>
  `;
}

/**
 * Strip HTML tags from content
 */
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '');
}

/**
 * Documentation for sendAutomatedEmail endpoint
 */
export const sendAutomatedEmailDocs = {
  title: 'Send Automated Email',
  description: 'Sends automated emails to applicants based on their status and last email sent date',
  method: 'POST',
  path: '/api/send-email',
  requestBody: {
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            applicantIds: {
              type: 'array',
              items: {
                type: 'string',
              },
              description: 'Array of applicant IDs to send emails to',
            },
          },
          required: ['applicantIds'],
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Emails sent successfully',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              results: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    status: { type: 'string', enum: ['success', 'failed'] },
                    error: { type: 'string', optional: true },
                  },
                },
              },
            },
          },
        },
      },
    },
    400: {
      description: 'Bad request',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              error: { type: 'string' },
            },
          },
        },
      },
    },
    500: {
      description: 'Server error',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              error: { type: 'string' },
            },
          },
        },
      },
    },
  },
};