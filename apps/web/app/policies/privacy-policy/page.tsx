'use client';

import React from 'react';
import Link from 'next/link';
import Layout from '../../components/Layout';
import PageHero from '../../components/PageHero';
import PromoImageSection from '../../components/PromoImageSection';

const PrivacyPolicy = () => {
  return (
    <Layout>
      <div className="min-h-screen bg-[#FAFAFA]">
        <PageHero 
          title="Privacy Policy" 
          date="March 19, 2025"
        />
        
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-xl shadow-sm p-8 mb-12">
            <div className="prose prose-lg max-w-none">
              <section className="mb-12">
                <h2 className="text-3xl font-semibold mb-4">1. Introduction</h2>
                <p className="text-gray-600 mb-4">
                  At Microfox, we take your privacy seriously. This Privacy Policy explains how we collect, 
                  use, and protect your personal information when you use our AI-powered automation platform.
                  We are committed to transparency and ensuring you understand how your data is handled.
                </p>
                <p className="text-gray-600">
                  This policy complies with the General Data Protection Regulation (GDPR), California Consumer 
                  Privacy Act (CCPA), and other applicable privacy laws. By using our services, you agree to 
                  the collection and use of information in accordance with this policy.
                </p>
              </section>

              <section className="mb-12">
                <h2 className="text-3xl font-semibold mb-4">2. Information We Collect</h2>
                <h3 className="text-xl font-semibold mb-3">2.1 Information You Provide</h3>
                <p className="text-gray-600 mb-4">We collect information that you provide directly to us, including:</p>
                <ul className="list-disc pl-6 text-gray-600 mb-6">
                  <li>Account information (name, email, password)</li>
                  <li>Profile information (company name, role, preferences)</li>
                  <li>Usage data and automation configurations</li>
                  <li>Communication preferences and support interactions</li>
                  <li>Payment and billing information</li>
                </ul>

                <h3 className="text-xl font-semibold mb-3">2.2 Automatically Collected Information</h3>
                <p className="text-gray-600 mb-4">When you use our platform, we automatically collect:</p>
                <ul className="list-disc pl-6 text-gray-600 mb-6">
                  <li>Usage patterns and interaction data</li>
                  <li>Device and browser information</li>
                  <li>IP address and location data</li>
                  <li>Performance metrics and error logs</li>
                </ul>

                <h3 className="text-xl font-semibold mb-3">2.3 AI and Automation Data</h3>
                <p className="text-gray-600 mb-4">
                  Important: We do not use your data to train our AI models. Your automation data is used solely to:
                </p>
                <ul className="list-disc pl-6 text-gray-600">
                  <li>Improve your user experience</li>
                  <li>Optimize automation performance</li>
                  <li>Provide personalized service recommendations</li>
                  <li>Maintain and enhance platform functionality</li>
                </ul>
              </section>

              <section className="mb-12">
                <h2 className="text-3xl font-semibold mb-4">3. How We Use Your Information</h2>
                <p className="text-gray-600 mb-4">We use your information for the following purposes:</p>
                <ul className="list-disc pl-6 text-gray-600 mb-6">
                  <li>Providing and improving our automation services</li>
                  <li>Processing transactions and managing your account</li>
                  <li>Personalizing your experience and recommendations</li>
                  <li>Sending important updates and notifications</li>
                  <li>Analyzing and optimizing platform performance</li>
                  <li>Ensuring platform security and preventing fraud</li>
                  <li>Complying with legal obligations</li>
                </ul>

                <h3 className="text-xl font-semibold mb-3">3.1 Legal Basis for Processing (GDPR)</h3>
                <p className="text-gray-600 mb-4">Under GDPR, we process your data based on:</p>
                <ul className="list-disc pl-6 text-gray-600">
                  <li>Contractual necessity for service provision</li>
                  <li>Legitimate interests in improving our services</li>
                  <li>Legal compliance requirements</li>
                  <li>Your consent for specific processing activities</li>
                </ul>
              </section>

              <section className="mb-12">
                <h2 className="text-3xl font-semibold mb-4">4. Data Security</h2>
                <p className="text-gray-600 mb-4">
                  We implement industry-standard security measures to protect your data, including:
                </p>
                <ul className="list-disc pl-6 text-gray-600 mb-6">
                  <li>End-to-end encryption for data transmission</li>
                  <li>Secure server infrastructure with regular security audits</li>
                  <li>Access controls and authentication mechanisms</li>
                  <li>Regular security assessments and updates</li>
                  <li>Data backup and disaster recovery procedures</li>
                </ul>

                <p className="text-gray-600">
                  Our serverless architecture ensures minimal data exposure and enhanced security. 
                  We regularly review and update our security practices to maintain the highest 
                  standards of data protection.
                </p>
              </section>

              <section className="mb-12">
                <h2 className="text-3xl font-semibold mb-4">5. Your Rights and Choices</h2>
                <h3 className="text-xl font-semibold mb-3">5.1 GDPR Rights</h3>
                <p className="text-gray-600 mb-4">Under GDPR, you have the right to:</p>
                <ul className="list-disc pl-6 text-gray-600 mb-6">
                  <li>Access your personal data</li>
                  <li>Correct inaccurate data</li>
                  <li>Request data deletion</li>
                  <li>Object to data processing</li>
                  <li>Data portability</li>
                  <li>Withdraw consent</li>
                </ul>

                <h3 className="text-xl font-semibold mb-3">5.2 CCPA Rights</h3>
                <p className="text-gray-600 mb-4">Under CCPA, you have the right to:</p>
                <ul className="list-disc pl-6 text-gray-600 mb-6">
                  <li>Know what personal information is collected</li>
                  <li>Know if personal information is sold or disclosed</li>
                  <li>Say no to the sale of personal information</li>
                  <li>Access your personal information</li>
                  <li>Request deletion of your personal information</li>
                  <li>Equal service and price (non-discrimination)</li>
                </ul>
              </section>

              <section className="mb-12">
                <h2 className="text-3xl font-semibold mb-4">6. Data Retention</h2>
                <p className="text-gray-600 mb-4">
                  We retain your data only for as long as necessary to:
                </p>
                <ul className="list-disc pl-6 text-gray-600 mb-6">
                  <li>Provide our services</li>
                  <li>Comply with legal obligations</li>
                  <li>Resolve disputes</li>
                  <li>Enforce agreements</li>
                </ul>
                <p className="text-gray-600">
                  When data is no longer needed, it is securely deleted or anonymized.
                </p>
              </section>

              <section className="mb-12">
                <h2 className="text-3xl font-semibold mb-4">7. International Data Transfers</h2>
                <p className="text-gray-600 mb-4">
                  We operate globally and may transfer data internationally. When we do, we ensure:
                </p>
                <ul className="list-disc pl-6 text-gray-600 mb-6">
                  <li>Compliance with applicable data protection laws</li>
                  <li>Appropriate safeguards for data transfers</li>
                  <li>Standard contractual clauses where required</li>
                  <li>Transparency about data transfer locations</li>
                </ul>
              </section>

              <section className="mb-12">
                <h2 className="text-3xl font-semibold mb-4">8. Children's Privacy</h2>
                <p className="text-gray-600">
                  Our services are not intended for individuals under 16 years of age. We do not knowingly 
                  collect personal information from children. If you believe we have collected information 
                  from a child, please contact us immediately.
                </p>
              </section>

              <section className="mb-12">
                <h2 className="text-3xl font-semibold mb-4">9. Changes to This Policy</h2>
                <p className="text-gray-600 mb-4">
                  We may update this Privacy Policy periodically. We will notify you of any material changes by:
                </p>
                <ul className="list-disc pl-6 text-gray-600 mb-6">
                  <li>Posting the new policy on our website</li>
                  <li>Updating the "Last Updated" date</li>
                  <li>Sending an email notification for significant changes</li>
                </ul>
                <p className="text-gray-600">
                  We encourage you to review this policy regularly to stay informed about how we protect your information.
                </p>
              </section>

              <section>
                <h2 className="text-3xl font-semibold mb-4">10. Contact Us</h2>
                <p className="text-gray-600 mb-4">
                  If you have any questions about this Privacy Policy or our data practices, please contact us at:
                </p>
                <ul className="list-none pl-6 text-gray-600">
                  <li className="mb-2">
                    <strong>Email:</strong>{' '}
                    <a href="mailto:privacy@microfox.ai" className="text-blue-600 hover:text-blue-800">
                    microfox@themoondevs.com
                    </a>
                  </li>
                </ul>
              </section>
            </div>
          </div>
        </div>

        <PromoImageSection />
      </div>
    </Layout>
  );
};

export default PrivacyPolicy;