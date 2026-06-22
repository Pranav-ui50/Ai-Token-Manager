/**
 * Privacy Policy Page
 *
 * Privacy policy for TokenManager platform.
 */

import { Link } from 'react-router-dom';

const PrivacyPolicyPage = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Link to="/" className="flex items-center gap-2 mb-4">
            <div className="w-10 h-10 bg-[#DC2626] rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="text-xl font-bold text-gray-900">TokenManager</span>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Privacy Policy</h1>
          <p className="text-gray-600 mt-2">Last updated: January 2025</p>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-xl shadow-sm p-8">
          {/* Introduction */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Introduction</h2>
            <p className="text-gray-600 leading-relaxed">
              TokenManager ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy
              explains how we collect, use, disclose, and safeguard your information when you use our platform
              and services. Please read this Privacy Policy carefully. By using our Services, you consent to
              the data practices described in this policy.
            </p>
          </section>

          {/* Information We Collect */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Information We Collect</h2>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">2.1 Personal Information</h3>
            <p className="text-gray-600 leading-relaxed mb-4">
              We collect information that you provide directly to us, including:
            </p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-6">
              <li><strong>Account Information:</strong> Name, email address, organization name, and password when you create an account</li>
              <li><strong>Payment Information:</strong> Billing address and payment method details for subscription processing</li>
              <li><strong>API Keys:</strong> API tokens and keys from third-party AI providers that you add to manage</li>
              <li><strong>Usage Data:</strong> Token usage statistics, cost analytics, and API call metrics</li>
              <li><strong>Communication Data:</strong> Information you provide when you contact our support team</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">2.2 Automatically Collected Information</h3>
            <p className="text-gray-600 leading-relaxed mb-4">
              We automatically collect certain information when you use our Services:
            </p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2 mb-6">
              <li><strong>Device Information:</strong> Browser type, operating system, device identifiers</li>
              <li><strong>Log Data:</strong> IP address, access times, pages viewed, and referring URLs</li>
              <li><strong>Cookies and Tracking:</strong> Session data, preferences, and authentication tokens</li>
              <li><strong>Usage Analytics:</strong> Feature usage, click patterns, and user interactions</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3">2.3 Third-Party Data</h3>
            <p className="text-gray-600 leading-relaxed">
              We receive data from third-party AI providers when you connect your API keys. This includes usage
              statistics, token consumption data, and cost information from providers like OpenAI, Anthropic,
              Google AI, and others. We use this data solely to provide our services and analytics to you.
            </p>
          </section>

          {/* How We Use Your Information */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">3. How We Use Your Information</h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              We use the information we collect for various purposes:
            </p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li><strong>Provide Services:</strong> To operate and maintain our platform, process transactions, and provide customer support</li>
              <li><strong>Analytics & Insights:</strong> To generate usage reports, cost analytics, and actionable insights about your API usage</li>
              <li><strong>Communication:</strong> To send you updates, newsletters, and promotional materials (with your consent)</li>
              <li><strong>Security:</strong> To detect, prevent, and address technical issues and security threats</li>
              <li><strong>Improvement:</strong> To understand how users interact with our Services and improve our offerings</li>
              <li><strong>Legal Compliance:</strong> To comply with legal obligations and respond to lawful requests</li>
            </ul>
          </section>

          {/* Data Sharing and Disclosure */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Data Sharing and Disclosure</h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              We do not sell your personal information. We may share your information in the following circumstances:
            </p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li><strong>Service Providers:</strong> With third-party vendors who perform services on our behalf (payment processing, cloud hosting, analytics)</li>
              <li><strong>AI Providers:</strong> We send API requests to your connected AI providers on your behalf using your API keys</li>
              <li><strong>Legal Requirements:</strong> When required by law, court order, or government regulation</li>
              <li><strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets</li>
              <li><strong>With Your Consent:</strong> When you authorize us to share your information with third parties</li>
              <li><strong>Protection:</strong> To protect the rights, property, or safety of TokenManager, our users, or others</li>
            </ul>
          </section>

          {/* Data Security */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Data Security</h2>
            <div className="text-gray-600 leading-relaxed space-y-3">
              <p>
                We implement robust security measures to protect your data:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Encryption:</strong> All data is encrypted in transit using TLS/SSL and at rest using AES-256 encryption</li>
                <li><strong>Access Controls:</strong> Strict access controls and authentication mechanisms for all systems</li>
                <li><strong>Infrastructure:</strong> Hosted on secure cloud infrastructure with regular security audits</li>
                <li><strong>API Key Security:</strong> Your API keys are encrypted and never displayed in plain text after initial input</li>
                <li><strong>Regular Audits:</strong> We conduct regular security assessments and penetration testing</li>
              </ul>
              <p className="mt-4">
                However, no method of transmission over the Internet or electronic storage is 100% secure. While we
                strive to use commercially acceptable means to protect your information, we cannot guarantee its
                absolute security.
              </p>
            </div>
          </section>

          {/* Data Retention */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Data Retention</h2>
            <div className="text-gray-600 leading-relaxed space-y-3">
              <p>
                We retain your personal information for as long as necessary to:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Provide our Services to you</li>
                <li>Comply with legal obligations</li>
                <li>Resolve disputes and enforce our agreements</li>
                <li>Maintain accurate business records</li>
              </ul>
              <p className="mt-4">
                Upon account deletion, we will:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Delete your personal information within 30 days</li>
                <li>Anonymize any usage data for analytics purposes</li>
                <li>Retain certain information as required by law or for legitimate business purposes</li>
              </ul>
            </div>
          </section>

          {/* Your Privacy Rights */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Your Privacy Rights</h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              Depending on your location, you may have the following rights:
            </p>

            <h3 className="text-lg font-semibold text-gray-800 mb-2">7.1 Access and Portability</h3>
            <p className="text-gray-600 leading-relaxed mb-4">
              You have the right to access and receive a copy of your personal data in a structured,
              machine-readable format.
            </p>

            <h3 className="text-lg font-semibold text-gray-800 mb-2">7.2 Correction</h3>
            <p className="text-gray-600 leading-relaxed mb-4">
              You can update, correct, or delete inaccurate personal information through your account settings.
            </p>

            <h3 className="text-lg font-semibold text-gray-800 mb-2">7.3 Deletion</h3>
            <p className="text-gray-600 leading-relaxed mb-4">
              You can request deletion of your personal information. We will delete your data unless retention
              is required by law or for legitimate business purposes.
            </p>

            <h3 className="text-lg font-semibold text-gray-800 mb-2">7.4 Opt-Out</h3>
            <p className="text-gray-600 leading-relaxed mb-4">
              You can opt out of marketing communications at any time. You cannot opt out of essential
              service-related communications.
            </p>

            <h3 className="text-lg font-semibold text-gray-800 mb-2">7.5 Do Not Track</h3>
            <p className="text-gray-600 leading-relaxed">
              We currently do not respond to "Do Not Track" signals. We continue to collect and use data as
              described in this Privacy Policy regardless of your browser settings.
            </p>
          </section>

          {/* Cookies */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Cookies and Tracking Technologies</h2>
            <div className="text-gray-600 leading-relaxed space-y-3">
              <p>We use cookies and similar tracking technologies to:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Essential Cookies:</strong> Required for authentication and basic site functionality</li>
                <li><strong>Analytics Cookies:</strong> Help us understand how users interact with our Services</li>
                <li><strong>Preference Cookies:</strong> Remember your settings and preferences</li>
                <li><strong>Marketing Cookies:</strong> Used to deliver relevant advertisements (with your consent)</li>
              </ul>
              <p className="mt-4">
                You can manage cookie preferences through your browser settings. Disabling certain cookies may
                affect the functionality of our Services.
              </p>
            </div>
          </section>

          {/* Third-Party Services */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">9. Third-Party Services</h2>
            <p className="text-gray-600 leading-relaxed">
              Our Services may contain links to third-party websites or services. We are not responsible for
              the privacy practices of these third parties. We encourage you to read the privacy policies of
              any third-party services you access. When you connect your API keys from AI providers (such as
              OpenAI, Anthropic, or Google AI), their respective privacy policies apply to the data they collect.
            </p>
          </section>

          {/* Children's Privacy */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">10. Children's Privacy</h2>
            <p className="text-gray-600 leading-relaxed">
              Our Services are not intended for users under the age of 18. We do not knowingly collect personal
              information from children. If we become aware that we have collected personal information from a
              child, we will take steps to delete that information promptly.
            </p>
          </section>

          {/* International Data Transfers */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">11. International Data Transfers</h2>
            <p className="text-gray-600 leading-relaxed">
              Your information may be transferred to and processed in countries other than your country of
              residence. These countries may have different data protection laws. We take appropriate steps
              to ensure your information is protected in accordance with this Privacy Policy, including using
              standard contractual clauses and other legal mechanisms for international data transfers.
            </p>
          </section>

          {/* California Privacy Rights */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">12. California Privacy Rights (CCPA)</h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              If you are a California resident, you have additional rights under the California Consumer Privacy Act:
            </p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li>Right to know what personal information is collected and how it is used</li>
              <li>Right to delete your personal information</li>
              <li>Right to opt-out of the sale of personal information</li>
              <li>Right to non-discrimination for exercising your privacy rights</li>
            </ul>
          </section>

          {/* GDPR Rights */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">13. European Data Protection (GDPR)</h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              If you are located in the European Economic Area (EEA), you have additional rights under GDPR:
            </p>
            <ul className="list-disc pl-6 text-gray-600 space-y-2">
              <li>Right to access and rectification of your personal data</li>
              <li>Right to erasure ("right to be forgotten")</li>
              <li>Right to restrict processing</li>
              <li>Right to data portability</li>
              <li>Right to object to processing</li>
              <li>Right to withdraw consent at any time</li>
            </ul>
            <p className="text-gray-600 leading-relaxed mt-4">
              Our legal basis for processing your data includes: your consent, performance of a contract,
              legitimate interests, and compliance with legal obligations.
            </p>
          </section>

          {/* Changes to Privacy Policy */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">14. Changes to This Privacy Policy</h2>
            <p className="text-gray-600 leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify you of any material changes
              by posting the new Privacy Policy on this page and updating the "Last updated" date. We encourage
              you to review this Privacy Policy periodically for any changes. Your continued use of our Services
              after any modifications constitutes your acceptance of the updated Privacy Policy.
            </p>
          </section>

          {/* Contact Us */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">15. Contact Us</h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              If you have any questions about this Privacy Policy or our data practices, please contact us:
            </p>
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <p className="text-gray-700"><strong>Email:</strong> privacy@tokenmanager.com</p>
              <p className="text-gray-700"><strong>Address:</strong> TokenManager Inc., Tech Park, Innovation Drive</p>
              <p className="text-gray-700"><strong>Data Protection Officer:</strong> dpo@tokenmanager.com</p>
            </div>
            <p className="text-gray-600 mt-4">
              For GDPR-related inquiries or to exercise your data subject rights, please contact our Data
              Protection Officer at the email address above.
            </p>
          </section>

          {/* Additional Links */}
          <div className="mt-8 pt-8 border-t border-gray-200 flex flex-wrap gap-4">
            <Link to="/terms" className="text-[#DC2626] hover:underline">
              Terms of Service
            </Link>
            <span className="text-gray-300">|</span>
            <Link to="/" className="text-[#DC2626] hover:underline flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Home
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
};

export default PrivacyPolicyPage;
