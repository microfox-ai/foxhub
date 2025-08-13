"use client";
import React from 'react';
import PageHero from '@/components/screens/policies/PageHero';
import PromoImageSection from '@/components/screens/policies/PromoImageSection';

const GoogleOAuthDisclosure = () => {
  return (
    <>
      <div className="min-h-screen bg-[#FAFAFA]">
        <PageHero 
          title="Google OAuth and API Limited Use Disclosure" 
          date="August 13, 2025"
        />

        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-xl shadow-sm p-8 mb-12">
            <div className="prose prose-lg max-w-none">
              <section className="mb-12">
                <h2 className="text-3xl font-semibold mb-4">1. Limited Use Compliance Attestation</h2>
                <p className="text-gray-600 mb-4">
                  Microfox uses Google OAuth and certain Google APIs to power user-requested features of our
                  workflow automation platform. We hereby attest that our use and transfer of information received
                  from Google APIs will adhere to the <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800">Google API Services User Data Policy</a>,
                  including the Limited Use requirements. Specifically:
                </p>
                <ul className="list-disc pl-6 text-gray-600 mb-4">
                  <li>We do not use Google user data to train, retrain, or improve any machine learning or artificial intelligence models.</li>
                  <li>We do not sell or share Google user data for advertising or marketing purposes.</li>
                  <li>We do not serve ads based on Google user data and do not allow third parties to do so.</li>
                  <li>No human will read Google user data except: (a) with the user’s explicit consent, (b) for security purposes such as investigating abuse, (c) to comply with applicable law, or (d) to deliver user-requested support.</li>
                  <li>We access only the minimum Google user data necessary to provide the user-facing features they have requested, and only for as long as needed to provide those features.</li>
                </ul>
              </section>

              <section className="mb-12">
                <h2 className="text-3xl font-semibold mb-4">2. Scopes We Request and Why</h2>
                <p className="text-gray-600 mb-4">We request the following OAuth scopes strictly to perform user-directed automation tasks. Each scope is used only as described below:</p>
                <ul className="list-disc pl-6 text-gray-600 space-y-2">
                  <li><code>.../auth/userinfo.email</code>: Identify the user’s primary email to create and associate their Microfox account and to send account-related communications.</li>
                  <li><code>.../auth/userinfo.profile</code> and <code>openid</code>: Retrieve basic profile info to personalize the experience and maintain secure sessions.</li>
                  <li><code>.../auth/calendar.freebusy</code>: Check availability to schedule or suggest meeting times when the user asks Microfox to manage calendar availability.</li>
                  <li><code>.../auth/calendar.events.public.readonly</code> and <code>.../auth/calendar.settings.readonly</code>: Read public calendar data and user calendar settings to respect user preferences (time zones, working hours) when automating events.</li>
                  <li><code>.../auth/calendar.events.owned</code> (Sensitive): Create, update, and delete events on calendars the user owns, only when the user explicitly requests scheduling/rescheduling/canceling.</li>
                  <li><code>.../auth/gmail.send</code> (Sensitive): Send emails on the user’s behalf when they explicitly direct Microfox to send messages (e.g., meeting invites, follow-ups).</li>
                  <li><code>.../auth/gmail.modify</code> (Sensitive): Read and modify messages strictly to execute user-configured automations (e.g., label, archive, or draft responses the user confirms). We do not retain message content beyond what is strictly necessary to fulfill the request.</li>
                  <li><code>.../auth/gmail.labels</code>: Read and update labels when users create labeling rules and organizational automations.</li>
                  <li><code>.../auth/drive.file</code> and <code>.../auth/drive.install</code>: Read/write only app-created or user-selected files to generate, store, or update documents explicitly requested by the user. We do not browse the user’s entire Drive.</li>
                  <li><code>.../auth/youtube.download</code>: Download the user’s public YouTube videos only upon explicit request to process them within user-initiated workflows.</li>
                </ul>
              </section>

              <section className="mb-12">
                <h2 className="text-3xl font-semibold mb-4">3. Retention and Deletion of Google User Data</h2>
                <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-4">
                  <li><strong>Access tokens/refresh tokens</strong>: Stored securely and encrypted. Retained until the user revokes access or deletes their Microfox account, at which time tokens are promptly revoked and deleted.</li>
                  <li><strong>Gmail content</strong> (when using <code>gmail.modify</code> or <code>gmail.send</code>): Processed transiently in memory or short-term cache to fulfill user-initiated actions. We do not persist message bodies or attachments in long-term storage. Minimal metadata (e.g., message ID, automation status) may be stored to show history and allow undo; content is not stored.</li>
                  <li><strong>Calendar data</strong> (freebusy, events): We may store event IDs and minimal metadata required to maintain synchronization of user-requested automations. We do not store full event descriptions unless the user explicitly provides them within Microfox.</li>
                  <li><strong>Drive files</strong>: We access only app-created or user-selected files. We do not mirror or back up user Drive contents. File contents are not stored on our servers except if the user explicitly uploads or requests generation; in those cases, we store only what is necessary to deliver the feature.</li>
                  <li><strong>YouTube downloads</strong>: Handled only on user request. Artifacts are processed for the requested workflow and not retained beyond completion unless the user saves outputs in Microfox.</li>
                </ul>
                <p className="text-gray-600">
                  Users can revoke Google access at any time at <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800">myaccount.google.com/permissions</a> and can request deletion of their Microfox account and associated data via our <a href="/data-deletion" className="text-blue-600 hover:text-blue-800">Data Deletion</a> page or by emailing <a href="mailto:privacy@microfox.ai" className="text-blue-600 hover:text-blue-800">privacy@microfox.ai</a>.
                </p>
              </section>

              <section className="mb-12">
                <h2 className="text-3xl font-semibold mb-4">4. Sharing and Disclosure of Google User Data</h2>
                <p className="text-gray-600 mb-4">
                  We do not sell or share Google user data with third parties for advertising. We disclose Google user data only to our service providers (sub-processors) acting on our behalf to deliver the Microfox service (e.g., cloud hosting, error monitoring, email delivery), under written contracts that require equivalent protections and prohibit further use. See our <a href="/subprocessors" className="text-blue-600 hover:text-blue-800">Subprocessors</a> page for more details. We may also disclose data to comply with law, protect our rights, or with your explicit consent.
                </p>
              </section>

              <section className="mb-12">
                <h2 className="text-3xl font-semibold mb-4">5. Security</h2>
                <ul className="list-disc pl-6 text-gray-600 space-y-2">
                  <li>Encryption in transit (TLS 1.2+) and at rest for stored secrets and tokens.</li>
                  <li>Principle of least privilege and role-based access control.</li>
                  <li>Audit logging for access to Google user data and automated actions.</li>
                  <li>Secret management and periodic token rotation.</li>
                  <li>Abuse monitoring and automated anomaly detection.</li>
                </ul>
              </section>

              <section>
                <h2 className="text-3xl font-semibold mb-4">6. Contact</h2>
                <p className="text-gray-600">
                  Questions about this disclosure or our compliance may be sent to <a href="mailto:privacy@microfox.ai" className="text-blue-600 hover:text-blue-800">privacy@microfox.ai</a>.
                </p>
              </section>
            </div>
          </div>
        </div>

        <PromoImageSection />
      </div>
    </>
  );
};

export default GoogleOAuthDisclosure;

