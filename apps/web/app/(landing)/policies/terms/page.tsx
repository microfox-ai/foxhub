'use client';

import React from 'react';
import PageHero from '@/components/screens/policies/PageHero';
import FooterCtaSection from '@/components/screens/landing/FooterCTASection/FooterCtaSection';

const TermsAndConditions = () => {
  return (
    <>
      <div className="min-h-screen mt-20 bg-[#FAFAFA]">
        <PageHero
          title="Terms and Conditions"
          date="August 2, 2025"
        />

        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h1 className="text-4xl font-bold mb-8">Terms and Conditions</h1>
          <div className="prose prose-lg">
            <p className="text-sm text-gray-500 mb-8">Last updated: March 14, 2024</p>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">1. Acceptance of Terms</h2>
              <p className="text-gray-600">
                By accessing and using Microfox's services, you agree to be bound by these Terms and Conditions.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">2. Service Description</h2>
              <p className="text-gray-600">
                Microfox provides an intelligent workflow optimization platform that allows users to create and manage
                automated processes through natural language prompts. Our serverless infrastructure ensures
                cost-effective and efficient processing.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">3. User Obligations</h2>
              <ul className="list-disc pl-6 text-gray-600">
                <li>Maintain accurate account information</li>
                <li>Protect account credentials</li>
                <li>Use the service in compliance with applicable laws</li>
                <li>Not misuse or attempt to exploit the service</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">4. Intellectual Property</h2>
              <p className="text-gray-600">
                All content and technology associated with Microfox's services remain our exclusive property.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">5. Limitation of Liability</h2>
              <p className="text-gray-600">
                Microfox is not liable for any indirect, incidental, or consequential damages arising
                from the use of our services.
              </p>
            </section>
          </div>
        </div>

        <FooterCtaSection />
      </div>
    </>
  );
};

export default TermsAndConditions; 