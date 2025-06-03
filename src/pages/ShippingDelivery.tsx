import React from 'react';
import Layout from '../components/Layout';
import { Zap } from 'lucide-react';
import PromoImageSection from '../components/PromoImageSection';

const ShippingDelivery = () => {
  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <Zap className="h-12 w-12 mx-auto mb-4 text-yellow-400" />
          <h1 className="text-4xl font-bold mb-4">Instant Digital Delivery</h1>
          <p className="text-xl text-gray-600">
            As a cloud-based service, Microfox is delivered instantly upon subscription
          </p>
        </div>

        <div className="prose prose-lg">
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Access & Availability</h2>
            <p className="text-gray-600 mb-4">
              Our serverless infrastructure ensures:
            </p>
            <ul className="list-disc pl-6 text-gray-600">
              <li>Immediate access upon account creation</li>
              <li>99.9% platform uptime</li>
              <li>Global availability across all regions</li>
              <li>Real-time updates and improvements</li>
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
            <h2 className="text-2xl font-semibold mb-4">Support & Assistance</h2>
            <p className="text-gray-600">
              Need help getting started? Our support team is available 24/7 at{' '}
              <a href="mailto:support@microfox.ai" className="text-blue-600 hover:text-blue-800">
                support@microfox.ai
              </a>
            </p>
          </section>
        </div>
      </div>
      <PromoImageSection />
    </Layout>
  );
}

export default ShippingDelivery;