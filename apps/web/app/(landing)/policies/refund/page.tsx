"use client";
import React from 'react';
import PageHero from '@/components/screens/policies/PageHero';
import PromoImageSection from '@/components/screens/policies/PromoImageSection';

const CancellationRefund = () => {
  return (
    <>
      <div className="mt-20 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-4xl font-bold mb-8">Cancellation and Refund Policy</h1>
        <div className="prose prose-lg">
          <p className="text-sm text-gray-500 mb-8">Last updated: August 13, 2025</p>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">1. Cancellation</h2>
            <p className="text-gray-600 mb-4">You can cancel any time via in‑app billing settings or by contacting <a href="mailto:support@microfox.ai">support@microfox.ai</a>. Upon cancellation:</p>
            <ul className="list-disc pl-6 text-gray-600">
              <li>Your subscription remains active until the end of the current billing period.</li>
              <li>No further renewal charges will be incurred.</li>
              <li>Downgrades take effect at the next renewal date.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">2. Refunds</h2>
            <p className="text-gray-600 mb-4">We offer a 14‑day money‑back guarantee for first‑time subscriptions. Eligibility:</p>
            <ul className="list-disc pl-6 text-gray-600">
              <li>Request within 14 days of first purchase.</li>
              <li>Account in good standing and no material policy violations.</li>
              <li>Refunds issued to the original payment method within 10 business days after approval.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">3. Pro‑ration and Non‑Refundable Items</h2>
            <p className="text-gray-600 mb-4">We do not provide pro‑rated refunds for partial billing periods after the 14‑day guarantee. Taxes, fees, and currency conversion charges are non‑refundable unless required by law.</p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">4. How to Request a Refund</h2>
            <p className="text-gray-600 mb-4">To request a refund, contact <a href="mailto:support@microfox.ai">support@microfox.ai</a> from your account email with:</p>
            <ul className="list-disc pl-6 text-gray-600">
              <li>Account email and order reference.</li>
              <li>Reason for the request and relevant details (optional but helps us improve).</li>
            </ul>
            <p className="text-gray-600">We will acknowledge within 3 business days and typically resolve within 10 business days.</p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">5. Chargebacks and Disputes</h2>
            <p className="text-gray-600">If you initiate a chargeback, access may be suspended pending resolution. Contact us first at <a href="mailto:support@microfox.ai">support@microfox.ai</a> to expedite resolution.</p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">6. Regional Rights and Exceptions</h2>
            <p className="text-gray-600 mb-4">Where required by law, you may have additional rights (e.g., EU consumer rights). Digital services may be excluded from statutory cooling‑off if performance begins with your consent. This policy does not affect rights that cannot be limited by contract.</p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">7. Contact</h2>
            <p className="text-gray-600">Questions about cancellations or refunds: <a href="mailto:support@microfox.ai" className="text-blue-600 hover:text-blue-800">support@microfox.ai</a></p>
          </section>
        </div>
      </div>
      <PromoImageSection />
    </>
  );
}

export default CancellationRefund;