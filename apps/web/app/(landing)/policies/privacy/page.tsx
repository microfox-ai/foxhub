"use client";
import React from 'react';
import PageHero from '@/components/screens/policies/PageHero';
import PromoImageSection from '@/components/screens/policies/PromoImageSection';

const PrivacyPolicy = () => {
  return (
    <>
      <div className="mt-20 min-h-screen bg-[#FAFAFA]">
        <PageHero 
          title="Privacy Policy" 
          date="August 13, 2025"
        />
        
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-xl shadow-sm p-8 mb-12">
            <div className="prose prose-lg max-w-none">
              <section className="mb-12">
                <h2 className="text-3xl font-semibold mb-4">1. Introduction</h2>
                <p className="text-gray-600 mb-4">
                  Microfox provides a workflow automation platform that executes user-directed tasks across multiple services, including Google services you choose to connect. This Privacy Policy explains how we collect, use, disclose, retain, and protect your information, including information obtained via Google OAuth and Google APIs.
                </p>
                <p className="text-gray-600">
                  By using Microfox, you agree to this Privacy Policy. For questions, contact <a href="mailto:privacy@microfox.ai" className="text-blue-600 hover:text-blue-800">privacy@microfox.ai</a>.
                </p>
              </section>

              <section className="mb-12">
                <h2 className="text-3xl font-semibold mb-4">2. Information We Collect</h2>
                <p className="text-gray-600 mb-4">We collect:</p>
                <ul className="list-disc pl-6 text-gray-600 mb-4">
                  <li>Account information (name, email, authentication identifiers).</li>
                  <li>Content you provide to configure automations (prompts, templates, settings).</li>
                  <li>Usage data (feature usage, device/browser info, diagnostics).</li>
                  <li>Payment and billing information (if applicable).</li>
                  <li>Google user data when you connect Google services, limited to the scopes you authorize. See Section 5 (Limited Use) and Section 6 (Scopes and purposes).</li>
                </ul>
                <p className="text-gray-600">We use cookies and similar technologies necessary to operate the service, and functional and performance cookies to improve reliability. You can manage cookies through your browser settings; blocking certain cookies may impact functionality.</p>
              </section>

              <section className="mb-12">
                <h2 className="text-3xl font-semibold mb-4">3. How We Use Your Information</h2>
                <p className="text-gray-600 mb-4">We use information to:</p>
                <ul className="list-disc pl-6 text-gray-600 mb-4">
                  <li>Provide, operate, and secure the service.</li>
                  <li>Execute user-directed automations you configure.</li>
                  <li>Personalize and improve features and user experience.</li>
                  <li>Provide support and communicate about service updates.</li>
                  <li>Comply with legal obligations and enforce our terms.</li>
                </ul>
                <p className="text-gray-600">We will not use Google user data to train or improve AI/ML models, nor for advertising purposes.</p>
              </section>

              <section className="mb-12">
                <h2 className="text-3xl font-semibold mb-4">3a. Legal Bases for Processing</h2>
                <p className="text-gray-600 mb-4">Where required (e.g., EEA/UK), we rely on the following legal bases:</p>
                <ul className="list-disc pl-6 text-gray-600">
                  <li><strong>Performance of a contract</strong>: To create your account, provide core features, and fulfill your requests (including executing automations you configure).</li>
                  <li><strong>Consent</strong>: For connecting optional integrations (e.g., Google OAuth) and for any processing that requires consent. You can withdraw consent at any time (revoking access or disabling features).</li>
                  <li><strong>Legitimate interests</strong>: To secure our services, prevent abuse, and understand product usage to improve performance and reliability. We balance these interests against your rights.</li>
                  <li><strong>Legal obligations</strong>: To comply with applicable laws, regulations, and lawful requests.</li>
                </ul>
              </section>

              <section className="mb-12">
                <h2 className="text-3xl font-semibold mb-4">4. Data Security</h2>
                <ul className="list-disc pl-6 text-gray-600">
                  <li>Encryption in transit and at rest for stored secrets and tokens.</li>
                  <li>Least privilege access controls; audit logging for sensitive operations.</li>
                  <li>Abuse detection and incident response procedures.</li>
                </ul>
              </section>

              <section className="mb-12">
                <h2 className="text-3xl font-semibold mb-4">5. Google API Limited Use Compliance (Attestation)</h2>
                <p className="text-gray-600 mb-4">Microfox’s use and transfer of information received from Google APIs will adhere to the <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800">Google API Services User Data Policy</a>, including the Limited Use requirements. Specifically, we affirm and attest that:</p>
                <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-4">
                  <li>We do not use Google user data to train, retrain, or improve any machine learning or artificial intelligence models.</li>
                  <li>We do not sell, rent, or share Google user data for advertising or marketing purposes, and we do not serve ads based on Google user data.</li>
                  <li>No human at Microfox will read Google user data except: (a) with the user’s explicit consent; (b) when necessary for security (e.g., investigating abuse); (c) when required by law; or (d) to provide user-requested support and debugging.</li>
                  <li>We request only the minimum scopes necessary and use the data solely to provide user-directed features.</li>
                  <li>We store tokens and secrets securely using encryption and least-privilege access.</li>
                  <li>We retain Google user data only as long as necessary to deliver requested functionality or as required by law, after which we delete or anonymize it.</li>
                  <li>Users can revoke our access at any time via their Google Account settings and can request deletion of associated Microfox data.</li>
                </ul>
                <p className="text-gray-600">This attestation applies to all current and future use of Google APIs within Microfox unless and until this policy is updated.</p>
              </section>

              <section className="mb-12">
                <h2 className="text-3xl font-semibold mb-4">6. Google User Data: With Whom We Share, Transfer, or Disclose</h2>
                <p className="text-gray-600 mb-4">We do not sell personal information and we do not sell or share Google user data for advertising. We disclose Google user data only as follows:</p>
                <ul className="list-disc pl-6 text-gray-600 mb-4">
                  <li><strong>Service providers (sub‑processors):</strong> Cloud hosting, monitoring, email delivery, and similar vendors that process data on our behalf under written contracts requiring confidentiality, security, and prohibiting further use. Access is limited to what is necessary.</li>
                  <li><strong>Legal compliance and safety:</strong> To comply with law, legal process, or governmental requests; to enforce our terms; or to protect rights, safety, and property of users, the public, or Microfox.</li>
                  <li><strong>At your direction or with consent:</strong> When you integrate or instruct Microfox to share data with a third‑party destination as part of a workflow you configure.</li>
                </ul>
                <p className="text-gray-600">We do not disclose Google user data to third parties except as described above.</p>
              </section>

              <section className="mb-12">
                <h2 className="text-3xl font-semibold mb-4">6a. Scope‑by‑Scope Data Handling Details</h2>
                <p className="text-gray-600 mb-4">For transparency, below we provide detailed information for each Google OAuth scope we may request, including purpose, data processed, storage, retention, and deletion.</p>
                <h3 className="text-2xl font-semibold mb-2"><code>.../auth/userinfo.email</code></h3>
                <ul className="list-disc pl-6 text-gray-600 mb-6">
                  <li><strong>Purpose:</strong> Associate your Google Account with your Microfox account; send essential account emails.</li>
                  <li><strong>Data processed:</strong> Primary email address and verification info as provided by Google.</li>
                  <li><strong>Storage:</strong> Email stored in our user database.</li>
                  <li><strong>Retention:</strong> Stored while your account is active; deleted upon account deletion subject to lawful retention obligations.</li>
                  <li><strong>Human access:</strong> No human access except for support with your consent or for security/legal reasons.</li>
                </ul>
                <h3 className="text-2xl font-semibold mb-2"><code>.../auth/userinfo.profile</code> and <code>openid</code></h3>
                <ul className="list-disc pl-6 text-gray-600 mb-6">
                  <li><strong>Purpose:</strong> Basic profile and identity for personalization and secure sessions.</li>
                  <li><strong>Data processed:</strong> Name, avatar URL (if provided), Google user ID.</li>
                  <li><strong>Storage:</strong> Minimal profile attributes stored for account display and session management.</li>
                  <li><strong>Retention:</strong> While account is active; removed on deletion.</li>
                </ul>
                <h3 className="text-2xl font-semibold mb-2"><code>.../auth/calendar.freebusy</code></h3>
                <ul className="list-disc pl-6 text-gray-600 mb-6">
                  <li><strong>Purpose:</strong> Check availability to suggest meeting times you request.</li>
                  <li><strong>Data processed:</strong> Free/busy time blocks, not event contents.</li>
                  <li><strong>Storage:</strong> Computed availability cached short‑term; no long‑term storage of event details.</li>
                  <li><strong>Retention:</strong> Cache purged automatically within short intervals; no persistent retention.</li>
                </ul>
                <h3 className="text-2xl font-semibold mb-2"><code>.../auth/calendar.events.public.readonly</code> and <code>.../auth/calendar.settings.readonly</code></h3>
                <ul className="list-disc pl-6 text-gray-600 mb-6">
                  <li><strong>Purpose:</strong> Respect your calendar settings (time zone, working hours) and read public calendars.</li>
                  <li><strong>Data processed:</strong> Settings metadata and public event details.</li>
                  <li><strong>Storage:</strong> Settings may be cached to honor preferences.</li>
                  <li><strong>Retention:</strong> Kept as long as needed to provide scheduling features; refreshed periodically.</li>
                </ul>
                <h3 className="text-2xl font-semibold mb-2"><code>.../auth/calendar.events.owned</code> (Sensitive)</h3>
                <ul className="list-disc pl-6 text-gray-600 mb-6">
                  <li><strong>Purpose:</strong> Create, update, and delete events on calendars you own when you direct Microfox to do so.</li>
                  <li><strong>Data processed:</strong> Event titles, times, attendee emails, and details you provide.</li>
                  <li><strong>Storage:</strong> Event IDs and minimal metadata to keep automations in sync; full descriptions only if you enter them in Microfox.</li>
                  <li><strong>Retention:</strong> Minimal metadata retained while the automation is enabled; removed when disabled or upon account deletion.</li>
                  <li><strong>Deletion:</strong> You can delete events in Google Calendar at any time; disabling the feature stops further access.</li>
                </ul>
                <h3 className="text-2xl font-semibold mb-2"><code>.../auth/gmail.send</code> (Sensitive)</h3>
                <ul className="list-disc pl-6 text-gray-600 mb-6">
                  <li><strong>Purpose:</strong> Send emails you instruct Microfox to send (invites, reminders, follow‑ups).</li>
                  <li><strong>Data processed:</strong> Recipient addresses, subject lines, message bodies you provide or approve.</li>
                  <li><strong>Storage:</strong> Messages are constructed and sent; we do not store message bodies after send except transiently to handle delivery confirmation.</li>
                  <li><strong>Retention:</strong> Minimal metadata (e.g., message ID, status) may be stored to show history; message content not retained.</li>
                </ul>
                <h3 className="text-2xl font-semibold mb-2"><code>.../auth/gmail.modify</code> (Sensitive)</h3>
                <ul className="list-disc pl-6 text-gray-600 mb-6">
                  <li><strong>Purpose:</strong> Read and modify messages strictly to execute rules you configure (e.g., label, archive, draft).</li>
                  <li><strong>Data processed:</strong> Subject lines, sender/recipient metadata, and message bodies as required to apply your rules.</li>
                  <li><strong>Storage:</strong> Processing occurs transiently; we do not store message bodies or attachments in long‑term storage. We may store rule configs and minimal IDs to support history and undo.</li>
                  <li><strong>Retention:</strong> Minimal IDs and rule configs retained while the automation is enabled; deleted when disabled or upon account deletion.</li>
                </ul>
                <h3 className="text-2xl font-semibold mb-2"><code>.../auth/gmail.labels</code></h3>
                <ul className="list-disc pl-6 text-gray-600 mb-6">
                  <li><strong>Purpose:</strong> Read and update labels to organize mail as you request.</li>
                  <li><strong>Data processed:</strong> Label names and IDs.</li>
                  <li><strong>Storage:</strong> Label mappings may be cached to execute your rules.</li>
                  <li><strong>Retention:</strong> Cached mappings maintained while rules are active; purged thereafter.</li>
                </ul>
                <h3 className="text-2xl font-semibold mb-2"><code>.../auth/drive.file</code> and <code>.../auth/drive.install</code></h3>
                <ul className="list-disc pl-6 text-gray-600 mb-6">
                  <li><strong>Purpose:</strong> Create and update app‑created or user‑selected files (e.g., docs generated from prompts).</li>
                  <li><strong>Data processed:</strong> File contents you request us to generate or modify.</li>
                  <li><strong>Storage:</strong> We do not mirror your Drive. File contents are processed to complete your request; persistent storage occurs in your Google Drive unless you explicitly save outputs in Microfox.</li>
                  <li><strong>Retention:</strong> We retain only minimal references (file IDs) necessary to fulfill ongoing automations; removed when automations are disabled or account deleted.</li>
                </ul>
                <h3 className="text-2xl font-semibold mb-2"><code>.../auth/youtube.download</code></h3>
                <ul className="list-disc pl-6 text-gray-600">
                  <li><strong>Purpose:</strong> Download your public YouTube videos upon your explicit request to process within a workflow.</li>
                  <li><strong>Data processed:</strong> Video files and associated public metadata.</li>
                  <li><strong>Storage:</strong> Processed transiently; outputs stored only if you choose to save them.</li>
                  <li><strong>Retention:</strong> Transient artifacts deleted after workflow completion unless you choose to persist outputs.</li>
                </ul>
              </section>

              <section className="mb-12">
                <h2 className="text-3xl font-semibold mb-4">7. General Retention Policy</h2>
                <ul className="list-disc pl-6 text-gray-600 mb-4">
                  <li>We retain personal data only as long as needed to provide the service, to comply with legal obligations, or to resolve disputes.</li>
                  <li>Backups are retained for limited durations to support disaster recovery and are deleted on a rolling basis.</li>
                </ul>
              </section>

              <section className="mb-12">
                <h2 className="text-3xl font-semibold mb-4">8. International Transfers</h2>
                <p className="text-gray-600">Where applicable, we rely on approved transfer mechanisms and implement appropriate safeguards for cross-border data transfers.</p>
              </section>

              <section className="mb-12">
                <h2 className="text-3xl font-semibold mb-4">9. Your Rights</h2>
                <p className="text-gray-600">Depending on your location, you may have rights to access, correct, delete, or port your data, and to object or restrict certain processing. Contact <a href="mailto:privacy@microfox.ai" className="text-blue-600 hover:text-blue-800">privacy@microfox.ai</a>.</p>
                <p className="text-gray-600">EEA/UK users: You may lodge a complaint with your local supervisory authority. California users: You may have rights under the CCPA/CPRA including access, deletion, and opt‑out of sale/share (we do not sell or share for advertising).</p>
              </section>

              <section>
                <h2 className="text-3xl font-semibold mb-4">10. Contact Us</h2>
                <p className="text-gray-600">Questions about this Privacy Policy: <a href="mailto:privacy@microfox.ai" className="text-blue-600 hover:text-blue-800">privacy@microfox.ai</a></p>
              </section>
            </div>
          </div>
        </div>

        <PromoImageSection />
      </div>
    </>
  );
};

export default PrivacyPolicy;