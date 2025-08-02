'use client';

import PageHero from '@/components/screens/policies/PageHero';

import FooterCtaSection from '@/components/screens/landing/FooterCTASection/FooterCtaSection';
const PrivacyPolicy = () => {
  return (
    <>
      <div className="min-h-screen mt-20 bg-[#FAFAFA]">
        <PageHero
          title="Privacy Policy"
          date="August 2, 2025"
        />

        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-xl shadow-sm p-8 mb-12">
            <div className="prose prose-lg max-w-none">
              <section className="mb-12">
                <h2 className="text-3xl font-semibold mb-4">1. Introduction</h2>
                <p className="text-gray-600">
                  At Microfox, we take your privacy seriously. This Privacy Policy explains how we collect,
                  use, and protect your personal information when you use our workflow optimization platform.
                </p>
              </section>

              <section className="mb-12">
                <h2 className="text-3xl font-semibold mb-4">2. Information We Collect</h2>
                <p className="text-gray-600 mb-4">We collect information that you provide directly to us, including:</p>
                <ul className="list-disc pl-6 text-gray-600">
                  <li>Account information (name, email, password)</li>
                  <li>Usage data and workflow configurations</li>
                  <li>Communication preferences</li>
                  <li>Payment information</li>
                </ul>
              </section>

              <section className="mb-12">
                <h2 className="text-3xl font-semibold mb-4">3. How We Use Your Information</h2>
                <p className="text-gray-600 mb-4">We use your information to:</p>
                <ul className="list-disc pl-6 text-gray-600">
                  <li>Provide and improve our workflow optimization services</li>
                  <li>Process your transactions</li>
                  <li>Send you important updates and notifications</li>
                  <li>Analyze and optimize our platform performance</li>
                </ul>
              </section>

              <section className="mb-12">
                <h2 className="text-3xl font-semibold mb-4">4. Data Security</h2>
                <p className="text-gray-600">
                  We implement industry-standard security measures to protect your data.
                  Our serverless architecture ensures minimal data exposure and enhanced security.
                </p>
              </section>

              <section className="mb-12">
                <h2 className="text-3xl font-semibold mb-4">5. Google API Limited Use Compliance</h2>
                <p className="text-gray-600 mb-4">
                  <strong>IMPORTANT:</strong> Microfox's use and transfer of information received from Google APIs to any other app will adhere to the
                  <a href="https://developers.google.com/terms/api-services-user-data-policy#additional_requirements_for_specific_api_scopes"
                    className="text-blue-600 hover:text-blue-800" target="_blank" rel="noopener noreferrer">
                    Google API Services User Data Policy
                  </a>, including the Limited Use requirements.
                </p>
                <p className="text-gray-600 mb-4">
                  <strong>Limited Use Compliance Statement:</strong> We hereby confirm and attest that:
                </p>
                <ul className="list-disc pl-6 text-gray-600 mb-4">
                  <li>We do not use Google API data for any machine learning or artificial intelligence model training purposes</li>
                  <li>We do not use Google API data to develop, improve, or enhance any AI/ML models</li>
                  <li>We do not use Google API data for any algorithmic analysis that could be construed as model training</li>
                  <li>Any data accessed through Google APIs is used solely for providing our core workflow optimization services</li>
                  <li>We do not transfer Google API data to any third-party services for AI/ML training purposes</li>
                </ul>
                <p className="text-gray-600">
                  This compliance statement is binding and applies to all current and future use of Google APIs within our platform.
                </p>
              </section>

              <section>
                <h2 className="text-3xl font-semibold mb-4">6. Contact Us</h2>
                <p className="text-gray-600">
                  If you have any questions about our Privacy Policy, please contact us at{' '}
                  <a href="mailto:privacy@microfox.ai" className="text-blue-600 hover:text-blue-800">
                    privacy@microfox.ai
                  </a>
                </p>
              </section>
            </div>
          </div>
        </div>

        <FooterCtaSection />
      </div>
    </>
  );
};

export default PrivacyPolicy;