'use client';

import React from 'react';
import Link from 'next/link';
import PageHero from '../../../components/screens/policies/PageHero';
import PromoImageSection from '../../../components/screens/policies/PromoImageSection';
import { LandingLayout } from '@/components/screens/landing/LandingLayout';
import FooterCtaSection from '@/components/screens/landing/FooterCTASection/FooterCtaSection';

const TermsAndConditions = () => {
  return (
    <LandingLayout>
      <div className="min-h-screen mt-20 bg-[#FAFAFA]">
        <PageHero
          title="Terms and Conditions"
          date="March 19, 2025"
        />

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-xl shadow-sm p-8 mb-12">
            <div className="prose prose-lg max-w-none">
              <section className="mb-12">
                <h2 className="text-3xl font-semibold mb-4">1. Agreement to Terms</h2>
                <p className="text-gray-600 mb-4">
                  Welcome to Microfox. By accessing or using our AI-powered automation platform, you agree to be
                  bound by these Terms and Conditions ("Terms"). These Terms constitute a legally binding agreement
                  between you and Microfox regarding your use of our services.
                </p>
                <p className="text-gray-600">
                  Please read these Terms carefully before using our platform. If you do not agree to these Terms,
                  you may not access or use our services. We reserve the right to modify these Terms at any time,
                  and such modifications shall be effective immediately upon posting on our website.
                </p>
              </section>

              <section className="mb-12">
                <h2 className="text-3xl font-semibold mb-4">2. Definitions</h2>
                <ul className="list-disc pl-6 text-gray-600 mb-6">
                  <li>
                    <strong>"Platform"</strong> refers to the Microfox automation service, including all features,
                    functionality, and content.
                  </li>
                  <li>
                    <strong>"User"</strong> means any individual or entity that accesses or uses the Platform.
                  </li>
                  <li>
                    <strong>"Content"</strong> includes all data, information, and materials uploaded, stored, or
                    processed through the Platform.
                  </li>
                  <li>
                    <strong>"Automation"</strong> refers to the AI-powered workflows and processes created using
                    our Platform.
                  </li>
                  <li>
                    <strong>"Subscription"</strong> means the paid access to our Platform's features and services.
                  </li>
                </ul>
              </section>

              <section className="mb-12">
                <h2 className="text-3xl font-semibold mb-4">3. Account Registration and Security</h2>
                <h3 className="text-xl font-semibold mb-3">3.1 Registration Requirements</h3>
                <p className="text-gray-600 mb-4">To use our Platform, you must:</p>
                <ul className="list-disc pl-6 text-gray-600 mb-6">
                  <li>Be at least 18 years old</li>
                  <li>Provide accurate and complete registration information</li>
                  <li>Maintain the security of your account credentials</li>
                  <li>Notify us immediately of any unauthorized access</li>
                  <li>Comply with all applicable laws and regulations</li>
                </ul>

                <h3 className="text-xl font-semibold mb-3">3.2 Account Security</h3>
                <p className="text-gray-600 mb-4">You are responsible for:</p>
                <ul className="list-disc pl-6 text-gray-600">
                  <li>Maintaining the confidentiality of your account credentials</li>
                  <li>All activities that occur under your account</li>
                  <li>Ensuring your account information remains accurate and up-to-date</li>
                  <li>Using strong passwords and enabling two-factor authentication when available</li>
                </ul>
              </section>

              <section className="mb-12">
                <h2 className="text-3xl font-semibold mb-4">4. Service Usage and Restrictions</h2>
                <h3 className="text-xl font-semibold mb-3">4.1 Acceptable Use</h3>
                <p className="text-gray-600 mb-4">You agree to use our Platform only for lawful purposes and in accordance with these Terms. You may not:</p>
                <ul className="list-disc pl-6 text-gray-600 mb-6">
                  <li>Violate any applicable laws or regulations</li>
                  <li>Infringe upon the rights of others</li>
                  <li>Use the Platform for any illegal or unauthorized purpose</li>
                  <li>Attempt to gain unauthorized access to any part of the Platform</li>
                  <li>Interfere with or disrupt the Platform's operation</li>
                  <li>Use the Platform to transmit any harmful code or malware</li>
                  <li>Engage in any activity that could damage or impair the Platform</li>
                </ul>

                <h3 className="text-xl font-semibold mb-3">4.2 Automation Guidelines</h3>
                <p className="text-gray-600 mb-4">When creating automations, you must ensure they:</p>
                <ul className="list-disc pl-6 text-gray-600">
                  <li>Comply with all applicable laws and regulations</li>
                  <li>Respect the terms of service of integrated platforms</li>
                  <li>Do not engage in spam or abusive behavior</li>
                  <li>Do not violate the privacy rights of others</li>
                  <li>Do not attempt to circumvent rate limits or usage restrictions</li>
                </ul>
              </section>

              <section className="mb-12">
                <h2 className="text-3xl font-semibold mb-4">5. Intellectual Property Rights</h2>
                <h3 className="text-xl font-semibold mb-3">5.1 Platform Ownership</h3>
                <p className="text-gray-600 mb-4">
                  The Platform and its original content, features, and functionality are owned by Microfox and are
                  protected by international copyright, trademark, patent, trade secret, and other intellectual
                  property laws.
                </p>

                <h3 className="text-xl font-semibold mb-3">5.2 User Content</h3>
                <p className="text-gray-600 mb-4">
                  You retain ownership of any content you create or upload to the Platform. By using our services,
                  you grant us a worldwide, non-exclusive, royalty-free license to use, store, and process your
                  content solely for the purpose of providing and improving our services.
                </p>

                <h3 className="text-xl font-semibold mb-3">5.3 Feedback</h3>
                <p className="text-gray-600">
                  Any feedback, suggestions, or ideas you provide regarding our Platform may be used by us without
                  any obligation to compensate you.
                </p>
              </section>

              <section className="mb-12">
                <h2 className="text-3xl font-semibold mb-4">6. Subscription and Payments</h2>
                <h3 className="text-xl font-semibold mb-3">6.1 Subscription Terms</h3>
                <p className="text-gray-600 mb-4">
                  Our Platform offers various subscription plans. By subscribing, you agree to:
                </p>
                <ul className="list-disc pl-6 text-gray-600 mb-6">
                  <li>Pay all fees associated with your chosen plan</li>
                  <li>Provide accurate billing information</li>
                  <li>Authorize us to charge your payment method</li>
                  <li>Comply with the specific terms of your subscription plan</li>
                </ul>

                <h3 className="text-xl font-semibold mb-3">6.2 Billing and Cancellation</h3>
                <p className="text-gray-600 mb-4">
                  Subscription fees are billed in advance and are non-refundable. You may cancel your subscription
                  at any time, but you will not receive a refund for the current billing period. We reserve the
                  right to modify our pricing with notice.
                </p>
              </section>

              <section className="mb-12">
                <h2 className="text-3xl font-semibold mb-4">7. Service Level Agreement</h2>
                <p className="text-gray-600 mb-4">
                  We strive to provide reliable and high-quality services. Our Platform typically maintains:
                </p>
                <ul className="list-disc pl-6 text-gray-600 mb-6">
                  <li>99.9% uptime for core services</li>
                  <li>24/7 monitoring and support</li>
                  <li>Regular security updates and maintenance</li>
                  <li>Data backup and recovery procedures</li>
                </ul>
                <p className="text-gray-600">
                  However, we do not guarantee uninterrupted or error-free service. We reserve the right to
                  temporarily suspend services for maintenance or updates.
                </p>
              </section>

              <section className="mb-12">
                <h2 className="text-3xl font-semibold mb-4">8. Limitation of Liability</h2>
                <p className="text-gray-600 mb-4">
                  To the maximum extent permitted by law, Microfox shall not be liable for any indirect,
                  incidental, special, consequential, or punitive damages, including but not limited to:
                </p>
                <ul className="list-disc pl-6 text-gray-600 mb-6">
                  <li>Loss of profits or revenue</li>
                  <li>Loss of data or business interruption</li>
                  <li>Cost of substitute services</li>
                  <li>Any damages arising from your use or inability to use the Platform</li>
                </ul>
                <p className="text-gray-600">
                  Our total liability for any claims related to the Platform shall not exceed the amount paid
                  by you for the service in the twelve months preceding the claim.
                </p>
              </section>

              <section className="mb-12">
                <h2 className="text-3xl font-semibold mb-4">9. Indemnification</h2>
                <p className="text-gray-600">
                  You agree to indemnify and hold harmless Microfox and its affiliates, officers, directors,
                  employees, and agents from any claims, damages, losses, liabilities, costs, and expenses
                  (including legal fees) arising from your use of the Platform, violation of these Terms, or
                  infringement of any third-party rights.
                </p>
              </section>

              <section className="mb-12">
                <h2 className="text-3xl font-semibold mb-4">10. Termination</h2>
                <p className="text-gray-600 mb-4">
                  We may terminate or suspend your access to the Platform immediately, without prior notice, for
                  any reason, including but not limited to:
                </p>
                <ul className="list-disc pl-6 text-gray-600 mb-6">
                  <li>Violation of these Terms</li>
                  <li>Fraudulent or illegal activity</li>
                  <li>Non-payment of fees</li>
                  <li>Extended period of account inactivity</li>
                </ul>
                <p className="text-gray-600">
                  Upon termination, your right to use the Platform will immediately cease, and you must cease all
                  use of the Platform and delete any copies of Platform materials in your possession.
                </p>
              </section>

              <section className="mb-12">
                <h2 className="text-3xl font-semibold mb-4">11. Governing Law</h2>
                <p className="text-gray-600">
                  These Terms shall be governed by and construed in accordance with the laws of [Your Jurisdiction],
                  without regard to its conflict of law provisions. Any disputes arising from these Terms shall be
                  resolved in the courts of [Your Jurisdiction].
                </p>
              </section>

              <section className="mb-12">
                <h2 className="text-3xl font-semibold mb-4">12. Changes to Terms</h2>
                <p className="text-gray-600 mb-4">
                  We reserve the right to modify these Terms at any time. We will notify you of any material
                  changes by:
                </p>
                <ul className="list-disc pl-6 text-gray-600 mb-6">
                  <li>Posting the new Terms on our website</li>
                  <li>Updating the "Last Updated" date</li>
                  <li>Sending an email notification for significant changes</li>
                </ul>
                <p className="text-gray-600">
                  Your continued use of the Platform after such modifications constitutes your acceptance of the
                  updated Terms.
                </p>
              </section>

              <section>
                <h2 className="text-3xl font-semibold mb-4">13. Contact Information</h2>
                <p className="text-gray-600 mb-4">
                  If you have any questions about these Terms, please contact us at:
                </p>
                <ul className="list-none pl-6 text-gray-600">
                  <li className="mb-2">
                    <strong>Email:</strong>{' '}
                    <a href="mailto:legal@microfox.ai" className="text-blue-600 hover:text-blue-800">
                      microfox@themoondevs.com
                    </a>
                  </li>
                </ul>
              </section>
            </div>
          </div>
        </div>

        <FooterCtaSection />
      </div>
    </LandingLayout>
  );
};

export default TermsAndConditions; 