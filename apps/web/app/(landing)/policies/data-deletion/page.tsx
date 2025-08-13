"use client";
import React from 'react';
import PageHero from '@/components/screens/policies/PageHero';
import PromoImageSection from '@/components/screens/policies/PromoImageSection';

const DataDeletion = () => {
  return (
    <>
      <div className="mt-20 min-h-screen bg-[#FAFAFA]">
        <PageHero 
          title="Data Deletion and Access Revocation" 
          date="August 13, 2025"
        />

        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-xl shadow-sm p-8 mb-12">
            <div className="prose prose-lg max-w-none">
              <section className="mb-12">
                <h2 className="text-3xl font-semibold mb-4">1. Revoke Google Access</h2>
                <p className="text-gray-600 mb-4">
                  You can revoke Microfox’s access to your Google Account at any time by visiting
                  <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800"> myaccount.google.com/permissions</a> and removing Microfox.
                </p>
              </section>

              <section className="mb-12">
                <h2 className="text-3xl font-semibold mb-4">2. Delete Your Microfox Account</h2>
                <p className="text-gray-600 mb-4">
                  To request deletion of your Microfox account and associated data, please email
                  <a href="mailto:privacy@microfox.ai" className="text-blue-600 hover:text-blue-800"> privacy@microfox.ai</a> from the email address associated with your account. We verify your identity before processing the request.
                </p>
                <ul className="list-disc pl-6 text-gray-600">
                  <li>We aim to complete deletion within 30 days of verification, subject to lawful retention obligations.</li>
                  <li>Access tokens and refresh tokens are revoked and deleted promptly after account deletion.</li>
                  <li>Operational logs that may contain minimal metadata (not message bodies) are retained for up to 90 days for security and audit purposes, then deleted or anonymized.</li>
                </ul>
              </section>

              <section>
                <h2 className="text-3xl font-semibold mb-4">3. Export and Portability</h2>
                <p className="text-gray-600">
                  You may request a copy of your Microfox-stored data (where applicable) in a portable format by contacting
                  <a href="mailto:privacy@microfox.ai" className="text-blue-600 hover:text-blue-800"> privacy@microfox.ai</a>.
                </p>
              </section>
            </div>
          </div>
        </div>

        {/* <PromoImageSection /> */}
      </div>
    </>
  );
};

export default DataDeletion;

