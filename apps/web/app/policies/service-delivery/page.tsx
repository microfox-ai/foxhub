'use client';

import React from 'react';

const ServiceDelivery = () => {
  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-8">Service Delivery Policy</h1>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Service Definition and Scope</h2>
        <p className="mb-4">Our AI-powered bot integration platform delivers the following digital services:</p>
        <ul className="list-disc pl-6 mb-4">
          <li>Natural language processing for conversational interfaces</li>
          <li>Cross-platform messaging integration and management</li>
          <li>API connectivity to third-party services and applications</li>
          <li>Automated workflow creation and execution</li>
          <li>Secure credential storage and management</li>
          <li>Analytics and performance monitoring tools</li>
          <li>User interaction history and data management</li>
        </ul>
        <p className="mb-4">These services are delivered through our cloud-based platform, accessible via web interface and API endpoints, with bot functionality extending to supported messaging platforms.</p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Service Level Agreement (SLA)</h2>
        <p className="mb-4">Our commitment to service quality includes:</p>
        <ul className="list-disc pl-6 mb-4">
          <li>Platform uptime guarantee of 99.9% measured monthly (excluding scheduled maintenance)</li>
          <li>Maximum response time of 500ms for standard bot interactions</li>
          <li>API request processing within 1000ms for 99% of calls</li>
          <li>24/7 system monitoring with automated alert systems</li>
          <li>Redundant infrastructure across multiple availability zones</li>
          <li>Automated backup and recovery systems with 1-hour recovery point objective</li>
          <li>Maximum downtime of 4 hours per incident for critical services</li>
        </ul>
        <p className="mb-4">Different service tiers may have enhanced SLA commitments with financially-backed guarantees. See your subscription plan for specific details.</p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Performance Monitoring and Metrics</h2>
        <p className="mb-4">We maintain high performance standards through:</p>
        <ul className="list-disc pl-6 mb-4">
          <li>Real-time performance monitoring across all system components</li>
          <li>Detailed performance dashboards accessible to enterprise customers</li>
          <li>Monthly performance reports with key metrics and trends</li>
          <li>Automated alerting for performance degradation</li>
          <li>Continuous stress testing and capacity planning</li>
          <li>End-to-end message delivery tracking and verification</li>
          <li>Integration performance metrics for third-party services</li>
        </ul>
        <p className="mb-4">Our platform maintains detailed logs of all messaging operations, API calls, and system performance to ensure transparent reporting and troubleshooting capabilities.</p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Service Delivery Methodology</h2>
        <p className="mb-4">Our AI bot integration service operates through the following infrastructure:</p>
        <ul className="list-disc pl-6 mb-4">
          <li>Cloud-native architecture hosted on AWS/GCP infrastructure</li>
          <li>Containerized microservices with automated scaling</li>
          <li>Dedicated AI processing clusters for natural language understanding</li>
          <li>Secure API gateways for third-party service integration</li>
          <li>Message queuing systems to ensure delivery reliability</li>
          <li>Content delivery networks for global performance optimization</li>
          <li>Database clusters with automated replication and failover</li>
        </ul>
        <p className="mb-4">This infrastructure is designed for high availability, security, and scalability to meet the demands of enterprise messaging workloads and AI processing requirements.</p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Service Updates and Maintenance</h2>
        <p className="mb-4">Our update and maintenance process includes:</p>
        <ul className="list-disc pl-6 mb-4">
          <li>Scheduled maintenance windows during off-peak hours (typically 1AM-4AM UTC on Sundays)</li>
          <li>Advance notification at least 7 days prior to scheduled maintenance</li>
          <li>Zero-downtime updates for most system components</li>
          <li>Regular feature updates with detailed release notes</li>
          <li>Security patches applied within 24 hours of critical vulnerability discoveries</li>
          <li>Backward compatibility support for API versions for at least 6 months</li>
          <li>Beta testing program for early access to new features</li>
        </ul>
        <p className="mb-4">Emergency maintenance may be performed with shorter notice in cases where service integrity or security is at immediate risk. We strive to provide at least 4 hours notice for any emergency maintenance.</p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Platform Dependencies and Third-Party Services</h2>
        <p className="mb-4">Our service depends on the following external platforms and services:</p>
        <ul className="list-disc pl-6 mb-4">
          <li>Messaging platform APIs (WhatsApp, Telegram, Slack, etc.)</li>
          <li>Cloud infrastructure providers (AWS, Google Cloud)</li>
          <li>CDN and network service providers</li>
          <li>Domain name and DNS services</li>
          <li>Payment processing systems</li>
          <li>External AI and machine learning services (for specific features)</li>
        </ul>
        <p className="mb-4">While we maintain redundancy where possible, service disruptions from these third-party providers may impact our ability to deliver certain features. Status of major dependencies is available on our system status page.</p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Disaster Recovery and Business Continuity</h2>
        <p className="mb-4">Our disaster recovery and business continuity measures include:</p>
        <ul className="list-disc pl-6 mb-4">
          <li>Multi-region data replication for all customer data</li>
          <li>Regular backup procedures with encryption at rest</li>
          <li>Automated failover systems for critical components</li>
          <li>Documented recovery procedures with regular testing</li>
          <li>Recovery Time Objective (RTO) of 4 hours for critical systems</li>
          <li>Recovery Point Objective (RPO) of 1 hour for customer data</li>
          <li>Cold standby environments in geographically separate regions</li>
        </ul>
        <p className="mb-4">Enterprise customers can request our detailed disaster recovery documentation and testing reports.</p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Support Services and Issue Resolution</h2>
        <p className="mb-4">We provide comprehensive support through:</p>
        <ul className="list-disc pl-6 mb-4">
          <li>24/7 technical support for critical issues (Enterprise plans)</li>
          <li>Business hours support (Standard and Professional plans)</li>
          <li>Priority ticketing system with severity-based SLAs</li>
          <li>Dedicated account managers for enterprise clients</li>
          <li>Comprehensive knowledge base and documentation</li>
          <li>Regular training sessions and implementation guidance</li>
          <li>Developer support for API integration and customization</li>
        </ul>
        <p className="mb-4">Support response time targets vary by plan level and issue severity, ranging from 1 hour for critical issues on Enterprise plans to 24 hours for non-critical issues on Standard plans.</p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Service Credits for SLA Violations</h2>
        <p className="mb-4">If we fail to meet our SLA commitments, eligible customers may receive service credits according to the following schedule:</p>
        <ul className="list-disc pl-6 mb-4">
          <li>Monthly uptime between 99.0% and 99.9%: 10% of monthly fee as credit</li>
          <li>Monthly uptime between 95.0% and 99.0%: 25% of monthly fee as credit</li>
          <li>Monthly uptime below 95.0%: 50% of monthly fee as credit</li>
          <li>API response time SLA violations: 5% credit per percentage point below target</li>
        </ul>
        <p className="mb-4">To request service credits, contact our support team within 30 days of the SLA violation with relevant details and timestamps.</p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Service Governance and Compliance</h2>
        <p className="mb-4">Our service delivery is governed by the following frameworks and standards:</p>
        <ul className="list-disc pl-6 mb-4">
          <li>ISO 27001 Information Security Management</li>
          <li>SOC 2 Type II compliance for security and availability</li>
          <li>GDPR compliance for data protection</li>
          <li>CCPA compliance for California customers</li>
          <li>HIPAA compliance available for healthcare integrations (Enterprise plans)</li>
          <li>Regular penetration testing and security audits</li>
        </ul>
        <p className="mb-4">Compliance certificates and assessment reports are available to customers upon request with appropriate non-disclosure agreements.</p>
      </section>

      <section>
        <p className="text-sm text-gray-600">Last updated: {new Date().toLocaleDateString()}</p>
        <p className="text-sm text-gray-600 mt-2">For service delivery inquiries: admin@themoondevs.com</p>
      </section>
    </div>
  );
};

export default ServiceDelivery; 