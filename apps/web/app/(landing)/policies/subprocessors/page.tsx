"use client";
import React from 'react';
import PageHero from '@/components/screens/policies/PageHero';
import PromoImageSection from '@/components/screens/policies/PromoImageSection';

const Subprocessors = () => {
  return (
    <>
      <div className="min-h-screen bg-[#FAFAFA]">
        <PageHero 
          title="Subprocessors and Service Providers" 
          date="August 13, 2025"
        />

        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-xl shadow-sm p-8 mb-12">
            <div className="prose prose-lg max-w-none">
              <p className="text-gray-600 mb-6">
                We engage certain third parties as sub-processors to help us deliver the Microfox service. These providers process personal data, including Google user data, on our behalf under written agreements that require equivalent protections and prohibit any use beyond providing the contracted services.
              </p>
              <h2 className="text-3xl font-semibold mb-4">Current Categories of Subprocessors</h2>
              <ul className="list-disc pl-6 text-gray-600 mb-8">
                <li>Cloud infrastructure hosting (application and databases)</li>
                <li>Monitoring and error tracking</li>
                <li>Email delivery and notifications</li>
                <li>Payment processing (if applicable)</li>
                <li>Customer support and ticketing (if applicable)</li>
                <li>Analytics for product usage (if applicable and subject to consent where required)</li>
              </ul>
              <p className="text-gray-600 mb-4">
                We will update this page as our list of subprocessors changes. For questions or to subscribe to updates, contact
                <a href="mailto:privacy@microfox.ai" className="text-blue-600 hover:text-blue-800"> privacy@microfox.ai</a>.
              </p>
            </div>
          </div>
        </div>

        <PromoImageSection />
      </div>
    </>
  );
};

export default Subprocessors;

