"use client";
import React from 'react';
import { Zap } from 'lucide-react';
import PromoImageSection from '@/components/screens/policies/PromoImageSection';

const ShippingDelivery = () => {
  return (
    <>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <Zap className="h-12 w-12 mx-auto mb-4 text-yellow-400" />
          <h1 className="text-4xl font-bold mb-4">Digital Delivery and Service Availability</h1>
          <p className="text-xl text-gray-600">
            As a cloud-based service, Microfox is delivered instantly upon subscription
          </p>
        </div>

        <div className="prose prose-lg">
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Access & Availability</h2>
            <p className="text-gray-600 mb-4">
              Our cloud infrastructure aims to provide:
            </p>
            <ul className="list-disc pl-6 text-gray-600">
              <li>Immediate access upon account creation.</li>
              <li>High availability and resilience.</li>
              <li>Global access subject to export and sanctions restrictions.</li>
              <li>Continuous updates and improvements.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Service Activation</h2>
            <p className="text-gray-600 mb-4">
              After subscribing:
            </p>
            <ul className="list-disc pl-6 text-gray-600">
              <li>Instant account activation</li>
              <li>Immediate access to all features</li>
              <li>Welcome email with getting started guide</li>
              <li>Access to support resources</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Maintenance and Incidents</h2>
            <p className="text-gray-600 mb-4">We perform routine maintenance and rolling updates designed to minimize disruption. In case of incidents, we provide updates via in‑product notices or email where appropriate.</p>
            <ul className="list-disc pl-6 text-gray-600">
              <li>Planned maintenance may be scheduled during low‑usage windows.</li>
              <li>Emergency maintenance may be performed without prior notice to protect security and stability.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Geographic Restrictions and Export Controls</h2>
            <p className="text-gray-600">Access to the service is subject to applicable export control and sanctions laws. You are responsible for compliance with all local laws in the jurisdiction where you access the service.</p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Fair Use and Rate Limits</h2>
            <p className="text-gray-600">To protect overall service quality, we may apply fair‑use thresholds and rate limits to certain features (e.g., API calls, background jobs). If limits are reached, jobs may queue or throttle until capacity is available.</p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Support & Assistance</h2>
            <p className="text-gray-600">
              Need help getting started? Contact our support team at{' '}
              <a href="mailto:support@microfox.ai" className="text-blue-600 hover:text-blue-800">
                support@microfox.ai
              </a>
            </p>
          </section>
        </div>
      </div>
      <PromoImageSection />
    </>
  );
}

export default ShippingDelivery;