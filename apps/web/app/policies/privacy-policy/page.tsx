'use client';

import React from 'react';

const PrivacyPolicy = () => {
  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-8">Privacy Policy</h1>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Data Collection Disclosure</h2>
        <p className="mb-4">We collect and process the following categories of personal data:</p>
        <ul className="list-disc pl-6 mb-4">
          <li>User identifiers (name, email, messaging platform IDs, profile information)</li>
          <li>Conversation content and message history across integrated messaging platforms</li>
          <li>Integration credentials and API keys (stored in encrypted format)</li>
          <li>Usage patterns, command history, and interaction analytics</li>
          <li>Bot configuration preferences and customization settings</li>
          <li>Device information and IP addresses for security purposes</li>
          <li>Location data when explicitly permitted by users</li>
          <li>Third-party service connection data and usage statistics</li>
        </ul>
        <p className="mb-4">This information is necessary to provide our integration and automation services, connect with third-party platforms, and ensure secure bot operations across multiple messaging channels.</p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Purpose Specification</h2>
        <p className="mb-4">Your data is collected and processed for the following purposes:</p>
        <ul className="list-disc pl-6 mb-4">
          <li>Enabling bot functionality across messaging platforms (WhatsApp, Telegram, Slack, etc.)</li>
          <li>Processing and executing automation workflows based on your configuration</li>
          <li>Authenticating with third-party services through secure API connections</li>
          <li>Personalizing bot responses and recommendations</li>
          <li>Improving AI model accuracy and response quality</li>
          <li>Ensuring platform security and preventing unauthorized access</li>
          <li>Analyzing usage patterns to enhance feature offerings</li>
          <li>Diagnosing technical issues and optimizing performance</li>
        </ul>
        <p className="mb-4">We employ both deterministic processing (rule-based automation) and machine learning models to deliver personalized experiences through our platform.</p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Data Processing Information</h2>
        <p className="mb-4">Your data is protected using industry-standard security measures and processing protocols:</p>
        <ul className="list-disc pl-6 mb-4">
          <li>AES-256 encryption for all stored data, especially API keys and credentials</li>
          <li>SSL/TLS encryption for all data in transit between services</li>
          <li>Regular security audits and vulnerability assessments</li>
          <li>Data minimization practices to limit collection to essential information</li>
          <li>Isolated storage systems for sensitive authentication credentials</li>
          <li>Automated monitoring for unauthorized access attempts</li>
          <li>Regular data backup procedures with encrypted storage</li>
        </ul>
        <p className="mb-4">Message content processed by our bots may be temporarily stored to facilitate conversation context and maintain service quality, but is purged according to our retention policies unless explicitly saved by user configuration.</p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Legal Compliance Framework</h2>
        <p className="mb-4">We comply with major privacy regulations including GDPR, CCPA, and platform-specific requirements. Our compliance measures include:</p>
        <ul className="list-disc pl-6 mb-4">
          <li>Transparent consent mechanisms for data collection and processing</li>
          <li>Comprehensive data subject rights implementation (access, correction, deletion)</li>
          <li>Data processing records maintained as required by Article 30 of GDPR</li>
          <li>Strict data retention periods with automated purging systems</li>
          <li>Data Protection Impact Assessments for high-risk processing activities</li>
          <li>Clear opt-out mechanisms for AI model training and analytics</li>
          <li>Privacy by design principles implemented throughout development</li>
        </ul>
        <p className="mb-4">We serve as both a data controller for account information and a data processor for content flowing through our integration platform.</p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Third-Party Data Sharing</h2>
        <p className="mb-4">To provide our integration services, we necessarily share data with:</p>
        <ul className="list-disc pl-6 mb-4">
          <li>Messaging platforms (WhatsApp, Telegram, Slack, etc.) according to their requirements</li>
          <li>Third-party service providers that you explicitly connect through our platform</li>
          <li>Cloud infrastructure providers who host our services (with appropriate safeguards)</li>
          <li>Analytics services to improve platform performance (in anonymized format)</li>
          <li>Customer support tools when you request assistance</li>
        </ul>
        <p className="mb-4">All third-party sharing is conducted with appropriate data processing agreements in place. We never sell your data or share it for advertising purposes without explicit consent. You maintain control over which third-party integrations can access your data through granular permission settings in your account dashboard.</p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">AI-Specific Data Practices</h2>
        <p className="mb-4">As an AI-powered platform, we employ several AI-specific data handling practices:</p>
        <ul className="list-disc pl-6 mb-4">
          <li>Conversation content may be processed by AI models to generate appropriate responses</li>
          <li>Anonymized interaction patterns may contribute to model improvement</li>
          <li>Human review of certain interactions may occur for quality assurance (with safeguards)</li>
          <li>Opt-out options are available for AI model training in your privacy settings</li>
          <li>Custom AI model training is isolated to each customer's data when configured</li>
          <li>Explainability tools are available to understand how automated decisions are made</li>
        </ul>
        <p className="mb-4">We implement technical measures to prevent AI model data leakage between customers and maintain strict access controls to training data.</p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">International Data Transfers</h2>
        <p className="mb-4">As a global service, data may be processed in different regions:</p>
        <ul className="list-disc pl-6 mb-4">
          <li>Primary data processing occurs in AWS regions compliant with your locality</li>
          <li>Standard Contractual Clauses are in place for international transfers</li>
          <li>Data residency options available for enterprise customers with specific requirements</li>
          <li>Privacy Shield principles are followed for applicable transfers</li>
        </ul>
        <p className="mb-4">You can specify preferred data processing regions in your account settings for enterprise plans.</p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Children's Privacy</h2>
        <p className="mb-4">Our service is not directed to children under 16. We do not knowingly collect personal information from children. If you believe we have inadvertently collected data from a child, please contact our privacy team immediately for deletion.</p>
      </section>

      <section>
        <p className="text-sm text-gray-600">Last updated: {new Date().toLocaleDateString()}</p>
        <p className="text-sm text-gray-600 mt-2">For privacy inquiries, contact: contact@themoondevs.com</p>
      </section>
    </div>
  );
};

export default PrivacyPolicy; 