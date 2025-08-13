"use client";
import React from 'react';
import PageHero from '@/components/screens/policies/PageHero';
import PromoImageSection from '@/components/screens/policies/PromoImageSection';

const TermsConditions = () => {
  return (
    <>
      <div className="mt-20 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-4xl font-bold mb-8">Terms and Conditions</h1>
        <div className="prose prose-lg">
          <p className="text-sm text-gray-500 mb-8">Last updated: August 13, 2025</p>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">1. Acceptance of Terms</h2>
            <p className="text-gray-600">
              By accessing and using Microfox’s services, you agree to these Terms. If you are accepting on behalf of an entity, you represent you have authority to bind that entity.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">2. Service Description</h2>
            <p className="text-gray-600">
              Microfox provides a workflow automation platform that executes user-directed tasks across connected services, including Google services the user authorizes. Unless we enter into a separate Service Level Agreement, the service is provided on an AS IS and AS AVAILABLE basis without uptime commitments.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">3. User Obligations</h2>
            <ul className="list-disc pl-6 text-gray-600">
              <li>Maintain accurate account information and promptly update changes.</li>
              <li>Safeguard credentials and restrict access to authorized users.</li>
              <li>Comply with applicable laws, export controls, and third‑party terms (e.g., Google API policies).</li>
              <li>Not misuse the service, including sending spam, violating privacy, or attempting to bypass security.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">4. Accounts, Billing, and Renewals</h2>
            <ul className="list-disc pl-6 text-gray-600">
              <li>Paid subscriptions renew automatically unless canceled before the renewal date.</li>
              <li>Fees are non-refundable except as stated in our <a href="/refund">Cancellation & Refund Policy</a>.</li>
              <li>Taxes may apply and are your responsibility.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">5. Trials, Beta Features, and Changes</h2>
            <ul className="list-disc pl-6 text-gray-600">
              <li>Trials are provided for evaluation only and may be modified or terminated at any time.</li>
              <li>Beta or preview features are offered AS IS and may be subject to additional terms or limitations.</li>
              <li>We may modify features to improve performance, security, or compliance; material changes will be communicated where appropriate.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">6. Intellectual Property; Content</h2>
            <p className="text-gray-600 mb-4">We retain ownership of the service and its content. You retain ownership of your prompts, configurations, and outputs, subject to third‑party rights. By submitting feedback, you grant Microfox a perpetual, worldwide, royalty-free license to use it.</p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">7. Acceptable Use and Third‑Party Services</h2>
            <p className="text-gray-600 mb-4">Use of third‑party services (e.g., Google) is subject to their terms. You authorize us to access and process your data from those services solely to provide requested features.</p>
            <ul className="list-disc pl-6 text-gray-600">
              <li>No spam, phishing, or abusive automation.</li>
              <li>No reverse engineering, scraping, or unauthorized access.</li>
              <li>No use that violates privacy, intellectual property, or export laws.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">8. Disclaimers</h2>
            <p className="text-gray-600 mb-4">The service and outputs are provided “AS IS.” We disclaim all warranties to the fullest extent permitted by law.</p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">9. Limitation of Liability</h2>
            <p className="text-gray-600">To the maximum extent permitted by law, Microfox will not be liable for any indirect, incidental, special, consequential, or punitive damages, or for loss of profits, revenues, or data. Our aggregate liability will not exceed the amounts paid by you to Microfox in the 12 months preceding the claim.</p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">10. Indemnification</h2>
            <p className="text-gray-600">You will indemnify and hold harmless Microfox from and against claims, losses, liabilities, damages, costs, and expenses (including reasonable attorneys’ fees) arising from your misuse of the service, violation of these Terms, or infringement of third‑party rights.</p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">11. Termination and Suspension</h2>
            <p className="text-gray-600">We may suspend or terminate access for material breach, unlawful use, or risk to the service. You may cancel at any time; see <a href="/refund">Cancellation & Refund Policy</a> for refund terms. Upon termination, your right to use the service ends immediately.</p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">12. Governing Law; Dispute Resolution</h2>
            <p className="text-gray-600">These Terms are governed by applicable law at Microfox’s principal place of business, without regard to conflicts of laws. Disputes will be resolved in the courts located there, unless otherwise required by law.</p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">13. Force Majeure</h2>
            <p className="text-gray-600">Neither party will be liable for delays or failures due to events beyond reasonable control, including acts of God, war, terrorism, riots, embargoes, acts of civil or military authorities, fire, flood, accidents, strikes, or shortages of transportation facilities, fuel, energy, labor, or materials.</p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">14. Assignment and Severability</h2>
            <p className="text-gray-600">You may not assign these Terms without our consent. If any provision is unenforceable, the remainder will remain in effect.</p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">15. Changes to Terms</h2>
            <p className="text-gray-600">We may modify these Terms. Material changes will be notified via the service or email and become effective upon posting unless stated otherwise.</p>
          </section>
        </div>
      </div>
      {/* <PromoImageSection /> */}
    </>
  );
}

export default TermsConditions;