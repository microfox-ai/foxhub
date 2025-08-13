"use client";
import React from 'react';
import PageHero from '@/components/screens/policies/PageHero';
import PromoImageSection from '@/components/screens/policies/PromoImageSection';

const CookiePolicy = () => {
  return (
    <>
      <div className="mt-20 min-h-screen bg-[#FAFAFA]">
        <PageHero 
          title="Cookie and Tracking Technologies Policy" 
          date="August 13, 2025"
        />

        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-xl shadow-sm p-8 mb-12">
            <div className="prose prose-lg max-w-none">
              <p className="text-gray-600 mb-6">
                We use cookies and similar technologies to operate and improve our website and service. You can manage preferences via your browser settings and, where applicable, in-product consent tools.
              </p>
              <h2 className="text-3xl font-semibold mb-4">Types of Cookies</h2>
              <ul className="list-disc pl-6 text-gray-600 mb-6">
                <li>Strictly necessary: required for core functionality (authentication, security).</li>
                <li>Performance: help us understand usage and improve reliability.</li>
                <li>Functional: remember your preferences.</li>
                <li>Analytics: measure engagement to improve features (subject to consent where required).</li>
              </ul>
              <h2 className="text-3xl font-semibold mb-4">Your Choices</h2>
              <p className="text-gray-600 mb-4">Most browsers allow you to block or delete cookies. Doing so may impact site functionality.</p>
              <p className="text-gray-600">For questions, contact <a href="mailto:privacy@microfox.ai" className="text-blue-600 hover:text-blue-800">privacy@microfox.ai</a>.</p>
            </div>
          </div>
        </div>

        <PromoImageSection />
      </div>
    </>
  );
};

export default CookiePolicy;

