'use client';

import { LandingLayout } from '@/components/screens/landing/LandingLayout';
import React from 'react';

const Contact = () => {
  return (
    <LandingLayout>
      <div className="max-w-4xl mt-20 mx-auto py-8 px-4">
        <h1 className="text-3xl font-bold mb-8">Contact Us</h1>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">General Inquiries</h2>
          <p className="mb-4">For general questions and support:</p>
          <ul className="list-none pl-6 mb-4">
            <li><strong>Email:</strong> admin@themoondevs.com</li>
            <li><strong>Chat Support:</strong> Available 24/7 in your dashboard</li>
            <li><strong>Hours:</strong> 24/7 for Enterprise plans; Monday-Friday 9AM-5PM Eastern Time for other plans</li>
            <li><strong>Response Time:</strong> Within 4 hours during business hours</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Technical Support</h2>
          <p className="mb-4">For technical issues and assistance:</p>
          <ul className="list-none pl-6 mb-4">
            <li><strong>Email:</strong> tech-support@themoondevs.com</li>
            <li><strong>Support Portal:</strong> support@themoondevs.com</li>
            <li><strong>API and Integration Help:</strong> api-support@themoondevs.com</li>
            <li><strong>Documentation:</strong> docs@themoondevs.com</li>
            <li><strong>Response Time:</strong> Critical issues - 1 hour; Standard issues - 8 hours</li>
          </ul>
          <p className="mb-4">Please include your account ID, relevant error messages, and steps to reproduce when reporting technical issues.</p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Privacy and Data Inquiries</h2>
          <p className="mb-4">For privacy-related concerns and data requests:</p>
          <ul className="list-none pl-6 mb-4">
            <li><strong>Email:</strong> admin@themoondevs.com</li>
            <li><strong>Data Protection Officer:</strong> admin@themoondevs.com</li>
            <li><strong>GDPR Requests:</strong> admin@themoondevs.com</li>
            <li><strong>CCPA Requests:</strong> admin@themoondevs.com</li>
            <li><strong>Data Export Requests:</strong> admin@themoondevs.com</li>
            <li><strong>Response Time:</strong> Within 24-48 hours (as required by applicable regulations)</li>
          </ul>
          <p className="mb-4">We take privacy concerns seriously and will respond promptly to all inquiries. For data subject access requests, please be prepared to verify your identity.</p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Sales and Account Management</h2>
          <p className="mb-4">For sales inquiries and account questions:</p>
          <ul className="list-none pl-6 mb-4">
            <li><strong>New Accounts:</strong> growth@themoondevs.com</li>
            <li><strong>Enterprise Sales:</strong> growth@themoondevs.com</li>
            <li><strong>Billing Questions:</strong> admin@themoondevs.com</li>
            <li><strong>Account Changes:</strong> admin@themoondevs.com</li>
            <li><strong>Hours:</strong> Monday - Friday, 9 AM - 6 PM Eastern Time</li>
          </ul>
          <p className="mb-4">Schedule a demo with our sales team to learn how our AI bot integration platform can help streamline your business operations.</p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Partnership Opportunities</h2>
          <p className="mb-4">For partnership and integration inquiries:</p>
          <ul className="list-none pl-6 mb-4">
            <li><strong>Technology Partnerships:</strong> growth@themoondevs.com</li>
            <li><strong>API Integration Partners:</strong> growth@themoondevs.com</li>
            <li><strong>Messaging Platform Partnerships:</strong> growth@themoondevs.com</li>
            <li><strong>Reseller Program:</strong> growth@themoondevs.com</li>
          </ul>
          <p className="mb-4">We're always looking to expand our ecosystem with innovative partners who share our vision for seamless bot integration across messaging platforms.</p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Security Issues</h2>
          <p className="mb-4">For reporting security vulnerabilities:</p>
          <ul className="list-none pl-6 mb-4">
            <li><strong>Email:</strong> admin@themoondevs.com</li>
            <li><strong>Responsible Disclosure:</strong> security.microfox.com/disclosure</li>
            <li><strong>Encryption:</strong> PGP key available at security.microfox.com/pgp-key</li>
            <li><strong>Bug Bounty Program:</strong> themoondevs.com/microfox</li>
          </ul>
          <p className="mb-4">We take security concerns very seriously. All reports are investigated promptly, and we appreciate responsible disclosure of potential vulnerabilities.</p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Media Inquiries</h2>
          <p className="mb-4">For press and media contacts:</p>
          <ul className="list-none pl-6 mb-4">
            <li><strong>Press Contact:</strong> growth@themoondevs.com</li>
            <li><strong>Media Kit:</strong> growth@themoondevs.com/media-kit</li>
            <li><strong>Interview Requests:</strong> growth@themoondevs.com</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Office Locations</h2>
          <p className="mb-4">
            <strong>Headquarters:</strong><br />
            Bangaluru, India<br />
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Support Hours by Region</h2>
          <ul className="list-none pl-6 mb-4">
            <li><strong>North America:</strong> 6AM - 8PM Eastern Time</li>
            <li><strong>Europe:</strong> 8AM - 6PM Central European Time</li>
            <li><strong>Asia-Pacific:</strong> 9AM - 7PM Singapore Time</li>
            <li><strong>Enterprise 24/7 Support:</strong> Available in all regions</li>
          </ul>
        </section>

        <section>
          <p className="text-sm text-gray-600">Response times may vary during holidays and peak periods. Enterprise customers receive priority support according to their service level agreements.</p>
          <p className="text-sm text-gray-600 mt-2">Last updated: {new Date().toLocaleDateString()}</p>
        </section>
      </div>
    </LandingLayout>
  );
};

export default Contact; 