import React from 'react';
import Layout from '../components/Layout';
import PromoImageSection from '../components/PromoImageSection';

const CancellationRefund = () => {
  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-4xl font-bold mb-8">Cancellation and Refund Policy</h1>
        <div className="prose prose-lg">
          <p className="text-sm text-gray-500 mb-8">Last updated: March 14, 2024</p>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">1. Cancellation Policy</h2>
            <p className="text-gray-600 mb-4">
              You can cancel your subscription at any time through your account settings. 
              Upon cancellation:
            </p>
            <ul className="list-disc pl-6 text-gray-600">
              <li>Your service will continue until the end of the current billing period</li>
              <li>No further charges will be made</li>
              <li>You'll retain access to all features until the period ends</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">2. Refund Policy</h2>
            <p className="text-gray-600 mb-4">
              We offer a 14-day money-back guarantee for new subscriptions. To be eligible:
            </p>
            <ul className="list-disc pl-6 text-gray-600">
              <li>Request must be made within 14 days of initial purchase</li>
              <li>Account must be in good standing</li>
              <li>Refund will be processed to original payment method</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">3. Pro-rated Refunds</h2>
            <p className="text-gray-600">
              We do not provide pro-rated refunds for partial months or unused service time 
              beyond the 14-day guarantee period.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">4. Contact Us</h2>
            <p className="text-gray-600">
              For refund requests or questions, please contact our support team at{' '}
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

export default CancellationRefund;