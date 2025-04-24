'use client';

import React from 'react';

const CancellationRefund = () => {
  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-8">Cancellation and Refund Policy</h1>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Subscription Models</h2>
        <p className="mb-4">Our service is available through several subscription options:</p>
        <ul className="list-disc pl-6 mb-4">
          <li>Monthly subscription with automatic renewal</li>
          <li>Annual subscription with discount pricing</li>
          <li>Enterprise plans with custom billing cycles</li>
          <li>Pay-as-you-go options for specific usage patterns</li>
          <li>Free trial period (7 days) with limited features</li>
        </ul>
        <p className="mb-4">All paid plans begin immediately after purchase or at the end of the trial period. Subscription fees are charged at the beginning of each billing cycle.</p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Subscription Management</h2>
        <p className="mb-4">You can manage your subscription through:</p>
        <ul className="list-disc pl-6 mb-4">
          <li>Account settings dashboard (Billing section)</li>
          <li>Customer support contact (via email or in-app chat)</li>
          <li>Email request to admin@themoondevs.com</li>
          <li>API-based subscription management for enterprise plans</li>
        </ul>
        <p className="mb-4">To avoid unwanted charges, cancellation requests must be submitted at least 48 hours before the next billing cycle. For annual subscriptions, we recommend reviewing your renewal date at least 7 days before automatic renewal.</p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Cancellation Process</h2>
        <p className="mb-4">To cancel your subscription:</p>
        <ol className="list-decimal pl-6 mb-4">
          <li>Log into your account dashboard</li>
          <li>Navigate to "Subscription" or "Billing" section</li>
          <li>Select "Cancel Subscription" option</li>
          <li>Complete the cancellation survey (optional but helpful)</li>
          <li>Confirm cancellation</li>
          <li>Receive email confirmation of cancellation</li>
        </ol>
        <p className="mb-4">After cancellation, your service will continue until the end of the current billing period. No partial refunds are provided for unused portions of the billing cycle unless otherwise specified.</p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Effect of Cancellation</h2>
        <p className="mb-4">When you cancel your subscription:</p>
        <ul className="list-disc pl-6 mb-4">
          <li>Your account remains active until the end of the current billing cycle</li>
          <li>Access to premium features ends at the conclusion of the paid period</li>
          <li>Your bot configurations and integration settings remain stored for 30 days</li>
          <li>Historical data and conversation logs are retained according to our data retention policy</li>
          <li>API integrations will cease functioning at the end of the paid period</li>
          <li>You may download your data during this grace period</li>
        </ul>
        <p className="mb-4">Accounts inactive for more than 90 days after cancellation may be permanently removed from our system.</p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Refund Eligibility</h2>
        <p className="mb-4">Refunds may be available in the following cases:</p>
        <ul className="list-disc pl-6 mb-4">
          <li>Service unavailability exceeding 24 consecutive hours (prorated credit)</li>
          <li>Technical issues preventing core service functionality for more than 48 hours</li>
          <li>Dissatisfaction within first 14 days for new accounts (full refund)</li>
          <li>Duplicate or erroneous charges (full refund)</li>
          <li>Platform incompatibility issues not disclosed in our documentation</li>
          <li>Major service changes that substantially reduce available functionality</li>
        </ul>
        <p className="mb-4">Refund requests based on service dissatisfaction must include specific details about the issues encountered to help us improve our platform.</p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Refund Process</h2>
        <p className="mb-4">To request a refund:</p>
        <ol className="list-decimal pl-6 mb-4">
          <li>Contact our support team via email at admin@themoondevs.com</li>
          <li>Include your account details, subscription level, and payment information</li>
          <li>Provide a detailed explanation of the reason for the refund request</li>
          <li>Submit any relevant supporting documentation or evidence</li>
          <li>Allow 5-7 business days for review and processing</li>
        </ol>
        <p className="mb-4">Refunds are typically processed using the original payment method. Processing times vary depending on your payment provider (typically 3-10 business days).</p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Prorated Refunds</h2>
        <p className="mb-4">For annual subscriptions canceled mid-term, we calculate prorated refunds as follows:</p>
        <ul className="list-disc pl-6 mb-4">
          <li>Total annual payment minus the monthly rate for months used</li>
          <li>Minus a 10% early termination fee (waived in certain circumstances)</li>
          <li>Administrative processing fee of $25 (waived for plan downgrades)</li>
        </ul>
        <p className="mb-4">Example: If you paid $1,200 for an annual plan and cancel after 4 months, the refund would be: $1,200 - ($120 × 4) - $120 (10% fee) = $600.</p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Enterprise Agreements</h2>
        <p className="mb-4">For enterprise customers with custom contracts:</p>
        <ul className="list-disc pl-6 mb-4">
          <li>Cancellation terms are governed by the specific terms of your contract</li>
          <li>Notice periods typically range from 30 to 90 days</li>
          <li>Custom implementation fees are generally non-refundable</li>
          <li>Early termination fees may apply as specified in your agreement</li>
          <li>Data export assistance is available during the transition period</li>
        </ul>
        <p className="mb-4">Please contact your designated account manager for specific details regarding your enterprise agreement.</p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Non-Refundable Items</h2>
        <p className="mb-4">The following are not eligible for refunds:</p>
        <ul className="list-disc pl-6 mb-4">
          <li>Setup and implementation fees for custom integrations</li>
          <li>Custom bot development and consulting services</li>
          <li>Used portion of subscription periods (except in cases of service failure)</li>
          <li>Additional service add-ons after the initial 14-day period</li>
          <li>Accounts terminated for Terms of Service violations</li>
          <li>Fees for exceeding usage limits or API quotas</li>
        </ul>
        <p className="mb-4">Transaction fees charged by payment processors or currency conversion fees are not refundable by us.</p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Price Changes</h2>
        <p className="mb-4">In the event of a price change:</p>
        <ul className="list-disc pl-6 mb-4">
          <li>Existing subscribers will be notified at least 30 days in advance</li>
          <li>Annual subscribers will maintain their current rate until the next renewal</li>
          <li>Monthly subscribers will see rate changes at the next billing cycle</li>
          <li>Special promotional rates may expire according to their terms</li>
        </ul>
        <p className="mb-4">If you do not agree with a price change, you may cancel your subscription before the new price takes effect.</p>
      </section>

      <section>
        <p className="text-sm text-gray-600">Last updated: {new Date().toLocaleDateString()}</p>
        <p className="text-sm text-gray-600 mt-2">For billing inquiries, contact: admin@themoondevs.com</p>
      </section>
    </div>
  );
};

export default CancellationRefund; 