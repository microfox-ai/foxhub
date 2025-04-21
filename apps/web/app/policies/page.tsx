'use client';

import React from 'react';
import Link from 'next/link';

const PoliciesIndex = () => {
  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-8">Legal Policies and Documentation</h1>
      
      <p className="mb-6">
        Welcome to our comprehensive legal documentation center. These policies govern your use of our AI bot integration platform
        and outline our commitments regarding your data, privacy, and service expectations.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-100">
          <h2 className="text-xl font-semibold mb-3">Privacy Policy</h2>
          <p className="text-gray-600 mb-4">
            Details how we collect, process, store, and protect your personal data and the information processed through our AI bot integration services.
          </p>
          <Link href="/policies/privacy-policy" className="text-blue-600 hover:text-blue-800 font-medium">
            View Privacy Policy →
          </Link>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-100">
          <h2 className="text-xl font-semibold mb-3">Terms of Service</h2>
          <p className="text-gray-600 mb-4">
            Defines the rules, guidelines, and agreements that govern your use of our platform, API integrations, and messaging bot services.
          </p>
          <Link href="/policies/terms-of-service" className="text-blue-600 hover:text-blue-800 font-medium">
            View Terms of Service →
          </Link>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-100">
          <h2 className="text-xl font-semibold mb-3">Cancellation and Refund Policy</h2>
          <p className="text-gray-600 mb-4">
            Explains our subscription management process, cancellation procedures, and refund eligibility for our service plans.
          </p>
          <Link href="/policies/cancellation-refund" className="text-blue-600 hover:text-blue-800 font-medium">
            View Cancellation and Refund Policy →
          </Link>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-100">
          <h2 className="text-xl font-semibold mb-3">Service Delivery Policy</h2>
          <p className="text-gray-600 mb-4">
            Outlines our service level agreements, performance standards, and commitments regarding the delivery of our AI bot services.
          </p>
          <Link href="/policies/service-delivery" className="text-blue-600 hover:text-blue-800 font-medium">
            View Service Delivery Policy →
          </Link>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-100">
          <h2 className="text-xl font-semibold mb-3">Data Deletion Instructions</h2>
          <p className="text-gray-600 mb-4">
            Provides comprehensive guidance on how to request deletion of your account data, API credentials, and bot configurations.
          </p>
          <Link href="/policies/data-deletion" className="text-blue-600 hover:text-blue-800 font-medium">
            View Data Deletion Instructions →
          </Link>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-100">
          <h2 className="text-xl font-semibold mb-3">Contact Information</h2>
          <p className="text-gray-600 mb-4">
            Lists our contact details for support, privacy inquiries, technical assistance, and business development.
          </p>
          <Link href="/policies/contact" className="text-blue-600 hover:text-blue-800 font-medium">
            View Contact Information →
          </Link>
        </div>
      </div>

      <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 mb-8">
        <h2 className="text-xl font-semibold mb-3">Need Help?</h2>
        <p className="text-gray-600 mb-2">
          If you have questions about our policies or need assistance with compliance matters, please contact our legal team at legal@yourapp.com or our privacy team at privacy@yourapp.com.
        </p>
        <p className="text-gray-600">
          For urgent matters, enterprise customers should contact their dedicated account manager directly.
        </p>
      </div>

      <p className="text-sm text-gray-500">
        Last updated: {new Date().toLocaleDateString()}
      </p>
    </div>
  );
};

export default PoliciesIndex; 