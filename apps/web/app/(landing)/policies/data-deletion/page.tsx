'use client';

import { LandingLayout } from '@/components/screens/landing/LandingLayout';
import React from 'react';

const DataDeletion = () => {
  return (
    <>
      <div className="max-w-4xl mt-20 mx-auto py-8 px-4">
        <h1 className="text-3xl font-bold mb-8">Data Deletion Instructions</h1>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Data Categories Subject to Deletion</h2>
          <p className="mb-4">Our platform collects and processes several categories of data that can be deleted upon request:</p>
          <ul className="list-disc pl-6 mb-4">
            <li>Account and profile information (name, email, company details)</li>
            <li>Bot configurations and customization settings</li>
            <li>Conversation history and message logs across messaging platforms</li>
            <li>Integration configurations and API connection data</li>
            <li>Stored credentials and API keys (always encrypted)</li>
            <li>Usage analytics and interaction patterns</li>
            <li>User preferences and personalization data</li>
            <li>End-user data collected through bot interactions</li>
          </ul>
          <p className="mb-4">Understanding these data categories helps ensure complete data removal when making deletion requests.</p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Account Deletion Process</h2>
          <p className="mb-4">To delete your account and associated data:</p>
          <ol className="list-decimal pl-6 mb-4">
            <li>Log into your account at app.microfox.com</li>
            <li>Navigate to Account Settings → Privacy & Data</li>
            <li>Select "Delete Account & Data"</li>
            <li>Review the deletion scope and implications</li>
            <li>Confirm your decision by entering your password</li>
            <li>Complete the optional feedback survey</li>
            <li>Verify via the confirmation email sent to your registered address</li>
          </ol>
          <p className="mb-4">The account deletion process initiates a comprehensive data removal workflow across all our systems. The process cannot be reversed once the email verification step is completed.</p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Partial Data Deletion Options</h2>
          <p className="mb-4">You can request selective deletion of specific data categories:</p>
          <ul className="list-disc pl-6 mb-4">
            <li><strong>Conversation History:</strong> Account Settings → Data Management → Message History → Delete</li>
            <li><strong>Bot Configurations:</strong> Bot Dashboard → [Select Bot] → Settings → Delete Bot</li>
            <li><strong>Integration Data:</strong> Integrations → [Select Integration] → Disconnect & Remove Data</li>
            <li><strong>API Keys & Credentials:</strong> Developer Settings → API Keys → Revoke & Delete</li>
            <li><strong>Usage Analytics:</strong> Account Settings → Privacy → Usage Data → Delete History</li>
            <li><strong>End-user Information:</strong> Contacts → [Select User] → Delete Contact & Data</li>
          </ul>
          <p className="mb-4">Partial deletion allows you to maintain your account while removing specific data elements. Each partial deletion is logged in your account's Data Processing Record for transparency.</p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Data Removal Scope</h2>
          <p className="mb-4">The following data will be permanently deleted from our active systems:</p>
          <ul className="list-disc pl-6 mb-4">
            <li>Personal information and profile data (within 24 hours)</li>
            <li>Conversation history and messages (within 48 hours)</li>
            <li>API keys and integration settings (immediate deletion)</li>
            <li>Usage analytics and preferences (within 72 hours)</li>
            <li>Bot configurations and workflows (within 24 hours)</li>
            <li>Stored files and media content (within 48 hours)</li>
            <li>Payment information except as required for financial records</li>
          </ul>
          <p className="mb-4">Our deletion process includes removal from production databases, analytics systems, and backup storage according to our retention schedules.</p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Alternative Deletion Methods</h2>
          <p className="mb-4">You can also request data deletion through these alternative channels:</p>
          <ul className="list-disc pl-6 mb-4">
            <li><strong>Email Request:</strong> Send a detailed deletion request to admin@themoondevs.com from your registered email address</li>
            <li><strong>API-Based Deletion:</strong> Use our Data Management API endpoints (Enterprise plans only)</li>
            <li><strong>Support Ticket:</strong> Submit a deletion request through our support portal</li>
            <li><strong>Written Request:</strong> Mail a signed deletion request to our headquarters address</li>
            <li><strong>Data Protection Officer:</strong> Contact our DPO directly at admin@themoondevs.com</li>
          </ul>
          <p className="mb-4">For all alternative methods, we require identity verification to protect account security. Our team will guide you through the verification process when you submit your request.</p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Processing Timeline</h2>
          <p className="mb-4">Our data deletion timeline follows this schedule:</p>
          <ul className="list-disc pl-6 mb-4">
            <li><strong>Request Verification:</strong> 24-48 hours</li>
            <li><strong>Initial Processing:</strong> Begins within 24 hours of verification</li>
            <li><strong>Active Systems Deletion:</strong> Completed within 7 days</li>
            <li><strong>Primary Backup Removal:</strong> Up to 30 days</li>
            <li><strong>Secondary Backup Removal:</strong> Up to 90 days</li>
            <li><strong>Analytics Systems Purge:</strong> Up to 30 days</li>
            <li><strong>Confirmation of Completion:</strong> Sent via email once active system deletion is complete</li>
          </ul>
          <p className="mb-4">Enterprise customers with custom retention requirements should contact their account manager for specific timeline information.</p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Third-Party Data Considerations</h2>
          <p className="mb-4">When you delete your account, please note the following regarding third-party data:</p>
          <ul className="list-disc pl-6 mb-4">
            <li>Messages sent to external messaging platforms (WhatsApp, Telegram, etc.) may persist on those platforms according to their retention policies</li>
            <li>Data shared with integrated third-party services must be deleted separately through those services</li>
            <li>We will attempt to relay deletion requests to connected services where possible</li>
            <li>Usage data shared with analytics providers is anonymized and cannot be tied back to your identity</li>
            <li>API calls made to external services may be logged in their systems outside our control</li>
          </ul>
          <p className="mb-4">We provide a list of all connected third-party services in your account dashboard to help you manage deletion requests across your technology ecosystem.</p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Legal Requirements and Exceptions</h2>
          <p className="mb-4">Some data may be retained if required by law or for legitimate business purposes. This may include:</p>
          <ul className="list-disc pl-6 mb-4">
            <li>Financial transaction records (retained for 7 years per tax regulations)</li>
            <li>Security audit logs (retained for 1 year for security investigations)</li>
            <li>Legal compliance documentation (retained as required by applicable law)</li>
            <li>Aggregate analytics data that cannot identify individuals</li>
            <li>Information related to unresolved disputes or legal claims</li>
            <li>Data required to prevent fraud or abuse of our services</li>
          </ul>
          <p className="mb-4">Any retained data is kept with strict access controls and minimum necessary retention periods as required by law or legitimate business needs.</p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Data Deletion for Teams and Organizations</h2>
          <p className="mb-4">For team and enterprise accounts:</p>
          <ul className="list-disc pl-6 mb-4">
            <li>Organization administrators can delete team member accounts and associated data</li>
            <li>Team-wide data deletion requires administrator privileges</li>
            <li>Enterprise customers can request complete organization data purges</li>
            <li>Custom data retention and deletion policies are available for enterprise plans</li>
            <li>Bulk deletion tools are provided for organization-wide data management</li>
          </ul>
          <p className="mb-4">Organization administrators should contact their account manager to discuss enterprise-specific deletion requirements and compliance needs.</p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Data Deletion Verification</h2>
          <p className="mb-4">We provide verification of data deletion in the following ways:</p>
          <ul className="list-disc pl-6 mb-4">
            <li>Email confirmation when deletion is initiated</li>
            <li>Status updates during the deletion process</li>
            <li>Final confirmation when deletion is complete in active systems</li>
            <li>Deletion certificates available upon request (Enterprise plans)</li>
            <li>Independent audit verification for regulated industries (Healthcare, Financial)</li>
          </ul>
          <p className="mb-4">If you require formal documentation of deletion for compliance purposes, please specify this in your deletion request.</p>
        </section>

        <section>
          <p className="text-sm text-gray-600">For assistance with data deletion or to report issues with this process, contact our privacy team at privacy@microfox.app .</p>
          <p className="text-sm text-gray-600 mt-2">Last updated: {new Date().toLocaleDateString()}</p>
        </section>
      </div>
    </>
  );
};

export default DataDeletion; 