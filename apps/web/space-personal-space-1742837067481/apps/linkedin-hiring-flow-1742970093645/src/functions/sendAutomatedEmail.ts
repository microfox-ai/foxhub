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
    const { applicantId } = JSON.parse(event.body);

    if (!applicantId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Applicant ID is required' }),
      };
    }

    // Fetch applicant data from the database
    const applicant = await prisma.applicant.findUnique({
      where: { id: applicantId },
      select: {
        id: true,
        name: true,
        email: true,
        status: true,
        lastEmailSentDate: true,
      },
    });

    if (!applicant) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Applicant not found' }),
      };
    }

    // Check if it's time to send an email (e.g., not sent in the last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    if (applicant.lastEmailSentDate && applicant.lastEmailSentDate > sevenDaysAgo) {
      return {
        statusCode: 200,
        body: JSON.stringify({ message: 'Email not sent. Too soon since last email.' }),
      };
    }

    // Get email template based on applicant status
    const emailTemplate = await getEmailTemplate(applicant.status);

    // Send email
    await ses.sendEmail({
      sender: process.env.SENDER_EMAIL!,
      recipient: applicant.email,
      subject: emailTemplate.subject,
      bodyHtml: emailTemplate.bodyHtml.replace('{{applicantName}}', applicant.name),
      bodyText: emailTemplate.bodyText.replace('{{applicantName}}', applicant.name),
    });

    // Update last email sent date in the database
    await prisma.applicant.update({
      where: { id: applicant.id },
      data: { lastEmailSentDate: new Date() },
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Email sent successfully' }),
    };
  } catch (error) {
    console.error('Error sending automated email:', error);
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
async function getEmailTemplate(status: string) {
  // In a real-world scenario, you might fetch these templates from a database or CMS
  const templates: Record<string, { subject: string; bodyHtml: string; bodyText: string }> = {
    applied: {
      subject: 'Thank you for your application',
      bodyHtml: '<p>Dear {{applicantName}},</p><p>Thank you for applying to our position. We will review your application and get back to you soon.</p>',
      bodyText: 'Dear {{applicantName}},\n\nThank you for applying to our position. We will review your application and get back to you soon.',
    },
    interviewing: {
      subject: 'Interview Scheduled',
      bodyHtml: '<p>Dear {{applicantName}},</p><p>We are pleased to inform you that your interview has been scheduled. Please check your calendar for details.</p>',
      bodyText: 'Dear {{applicantName}},\n\nWe are pleased to inform you that your interview has been scheduled. Please check your calendar for details.',
    },
    offered: {
      subject: 'Job Offer',
      bodyHtml: '<p>Dear {{applicantName}},</p><p>Congratulations! We are excited to offer you the position. Please review the attached offer letter.</p>',
      bodyText: 'Dear {{applicantName}},\n\nCongratulations! We are excited to offer you the position. Please review the attached offer letter.',
    },
    rejected: {
      subject: 'Application Status Update',
      bodyHtml: '<p>Dear {{applicantName}},</p><p>Thank you for your interest in our company. Unfortunately, we have decided to move forward with other candidates at this time.</p>',
      bodyText: 'Dear {{applicantName}},\n\nThank you for your interest in our company. Unfortunately, we have decided to move forward with other candidates at this time.',
    },
  };

  return templates[status] || templates.applied;
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
            applicantId: { type: 'string' },
          },
          required: ['applicantId'],
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Email sent successfully or not sent due to recent communication',
      schema: {
        type: 'object',
        properties: {
          message: { type: 'string' },
        },
      },
    },
    400: {
      description: 'Bad request',
      schema: {
        type: 'object',
        properties: {
          error: { type: 'string' },
        },
      },
    },
    404: {
      description: 'Applicant not found',
      schema: {
        type: 'object',
        properties: {
          error: { type: 'string' },
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