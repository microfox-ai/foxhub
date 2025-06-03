import React from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import PageHero from '../components/PageHero';
import PromoImageSection from '../components/PromoImageSection';

const PrivacyPolicy = () => {
  return (
    <Layout>
      <div className="min-h-screen bg-[#FAFAFA]">
        <PageHero 
          title="Privacy Policy" 
          date="March 14, 2024"
        />
        
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-xl shadow-sm p-8 mb-12">
            <div className="prose prose-lg max-w-none">
              <section className="mb-12">
                <h2 className="text-3xl font-semibold mb-4">1. Introduction</h2>
                <p className="text-gray-600">
                  At Microfox, we take your privacy seriously. This Privacy Policy explains how we collect, 
                  use, and protect your personal information when you use our automation platform.
                </p>
              </section>

              <section className="mb-12">
                <h2 className="text-3xl font-semibold mb-4">2. Information We Collect</h2>
                <p className="text-gray-600 mb-4">We collect information that you provide directly to us, including:</p>
                <ul className="list-disc pl-6 text-gray-600">
                  <li>Account information (name, email, password)</li>
                  <li>Usage data and automation configurations</li>
                  <li>Communication preferences</li>
                  <li>Payment information</li>
                </ul>
              </section>

              <section className="mb-12">
                <h2 className="text-3xl font-semibold mb-4">3. How We Use Your Information</h2>
                <p className="text-gray-600 mb-4">We use your information to:</p>
                <ul className="list-disc pl-6 text-gray-600">
                  <li>Provide and improve our automation services</li>
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

              <section>
                <h2 className="text-3xl font-semibold mb-4">5. Contact Us</h2>
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

        <PromoImageSection />
      </div>
    </Layout>
  );
};

export default PrivacyPolicy;