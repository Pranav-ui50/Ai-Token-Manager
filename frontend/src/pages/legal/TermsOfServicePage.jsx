/**
 * Terms of Service Page
 *
 * Legal terms and conditions for using TokenManager.
 */

import { Link } from 'react-router-dom';

const TermsOfServicePage = () => {
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
          <h1 className="text-3xl font-bold text-gray-900">Terms of Service</h1>
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
              Welcome to TokenManager. These Terms of Service ("Terms") govern your access to and use of our platform,
              including our website, applications, and services (collectively, the "Services"). By accessing or using
              our Services, you agree to be bound by these Terms. If you do not agree to these Terms, do not use our Services.
            </p>
          </section>

          {/* Account Terms */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Account Terms</h2>
            <div className="text-gray-600 leading-relaxed space-y-3">
              <p><strong>2.1 Account Creation:</strong> To use our Services, you must create an account. You are responsible for
              maintaining the security of your account and any activities that occur under your account.</p>
              <p><strong>2.2 Account Security:</strong> You are responsible for keeping your password confidential and for all
              activities that occur under your account. You must notify us immediately of any unauthorized use of your account.</p>
              <p><strong>2.3 Account Restrictions:</strong> You may not create multiple accounts for the same organization without
              our prior written consent. Each account must be associated with a valid email address.</p>
              <p><strong>2.4 Account Termination:</strong> We reserve the right to suspend or terminate your account at any time
              for violation of these Terms or for any other reason at our sole discretion.</p>
            </div>
          </section>

          {/* API Token Management */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">3. API Token Management Services</h2>
            <div className="text-gray-600 leading-relaxed space-y-3">
              <p><strong>3.1 Service Description:</strong> TokenManager provides tools for managing API tokens,
              monitoring usage, analyzing costs, and optimizing API consumption across multiple AI providers including
              OpenAI, Anthropic, Google AI, and others.</p>
              <p><strong>3.2 API Keys:</strong> You are responsible for the API keys you add to our platform. You must have
              the necessary permissions to use these API keys. You are solely responsible for all activities that occur
              using your API keys through our Services.</p>
              <p><strong>3.3 Usage Monitoring:</strong> We monitor API usage on your behalf and provide analytics and insights.
              We do not store or access the actual content of your API requests beyond what is necessary for our services.</p>
              <p><strong>3.4 Third-Party Services:</strong> Our Services may integrate with third-party AI providers. Your use
              of these third-party services is subject to their respective terms of service.</p>
            </div>
          </section>

          {/* Subscription and Payments */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Subscription and Payments</h2>
            <div className="text-gray-600 leading-relaxed space-y-3">
              <p><strong>4.1 Subscription Plans:</strong> We offer various subscription plans. By subscribing to a paid plan,
              you agree to pay the applicable fees as described at the time of purchase.</p>
              <p><strong>4.2 Billing Cycle:</strong> Subscriptions are billed monthly or annually, depending on your chosen plan.
              All fees are non-refundable except as expressly stated in these Terms.</p>
              <p><strong>4.3 Price Changes:</strong> We may change our subscription prices at any time. Price changes will
              not affect your current subscription period. You will be notified of any price changes before they take effect.</p>
              <p><strong>4.4 Taxes:</strong> You are responsible for all taxes associated with your subscription. Prices may
              be subject to applicable taxes in your jurisdiction.</p>
              <p><strong>4.5 Automatic Renewal:</strong> Your subscription will automatically renew at the end of each billing
              cycle unless you cancel it before the renewal date.</p>
            </div>
          </section>

          {/* Acceptable Use */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Acceptable Use Policy</h2>
            <div className="text-gray-600 leading-relaxed space-y-3">
              <p>You agree not to use our Services to:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Violate any applicable laws or regulations</li>
                <li>Infringe upon the intellectual property rights of others</li>
                <li>Distribute malware, spam, or other harmful content</li>
                <li>Attempt to gain unauthorized access to our systems or other users' accounts</li>
                <li>Interfere with or disrupt the integrity or performance of our Services</li>
                <li>Use our Services for any illegal or unauthorized purpose</li>
                <li>Reverse engineer, decompile, or disassemble any part of our Services</li>
                <li>Resell or redistribute our Services without our written permission</li>
              </ul>
            </div>
          </section>

          {/* Intellectual Property */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Intellectual Property</h2>
            <div className="text-gray-600 leading-relaxed space-y-3">
              <p><strong>6.1 Our Rights:</strong> TokenManager and its licensors own all right, title, and interest in and to
              our Services, including all intellectual property rights. These Terms do not grant you any rights to our
              trademarks, logos, or other proprietary information.</p>
              <p><strong>6.2 Your Rights:</strong> You retain all rights to your data and content that you upload to or create
              using our Services. By using our Services, you grant us a limited license to process your data solely for
              the purpose of providing the Services.</p>
              <p><strong>6.3 Feedback:</strong> If you provide feedback or suggestions about our Services, we may use such
              feedback without any obligation to you.</p>
            </div>
          </section>

          {/* Data Privacy */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Data Privacy and Security</h2>
            <div className="text-gray-600 leading-relaxed space-y-3">
              <p><strong>7.1 Privacy Policy:</strong> Our collection and use of your personal information is governed by our
              <Link to="/privacy" className="text-[#DC2626] hover:underline"> Privacy Policy</Link>. By using our Services,
              you consent to our collection and use of your data as described in our Privacy Policy.</p>
              <p><strong>7.2 Data Security:</strong> We implement industry-standard security measures to protect your data.
              However, no method of transmission over the Internet is 100% secure, and we cannot guarantee absolute security.</p>
              <p><strong>7.3 Data Retention:</strong> We retain your data for as long as your account is active or as needed
              to provide you with our Services. Upon account termination, we will delete your data in accordance with our
              Privacy Policy.</p>
            </div>
          </section>

          {/* Limitation of Liability */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Limitation of Liability</h2>
            <div className="text-gray-600 leading-relaxed space-y-3">
              <p><strong>8.1 Disclaimer:</strong> OUR SERVICES ARE PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES
              OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY,
              FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.</p>
              <p><strong>8.2 Limitation:</strong> TO THE MAXIMUM EXTENT PERMITTED BY LAW, TOKENMANAGER SHALL NOT BE LIABLE
              FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES,
              WHETHER INCURRED DIRECTLY OR INDIRECTLY, OR ANY LOSS OF DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES.</p>
              <p><strong>8.3 Cap:</strong> IN NO EVENT SHALL OUR TOTAL LIABILITY EXCEED THE AMOUNT YOU HAVE PAID US FOR
              THE SERVICES IN THE TWELVE MONTHS PRECEDING THE CLAIM.</p>
            </div>
          </section>

          {/* Indemnification */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">9. Indemnification</h2>
            <p className="text-gray-600 leading-relaxed">
              You agree to indemnify, defend, and hold harmless TokenManager and its officers, directors, employees,
              contractors, agents, and affiliates from any claims, damages, losses, liabilities, and expenses
              (including reasonable attorneys' fees) arising out of or related to your use of our Services, your
              violation of these Terms, or your violation of any rights of a third party.
            </p>
          </section>

          {/* Termination */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">10. Termination</h2>
            <div className="text-gray-600 leading-relaxed space-y-3">
              <p><strong>10.1 By You:</strong> You may terminate your account at any time by following the instructions
              in your account settings. Upon termination, your right to use our Services will immediately cease.</p>
              <p><strong>10.2 By Us:</strong> We may terminate or suspend your account and access to our Services at our
              sole discretion, without prior notice or liability, for any reason, including breach of these Terms.</p>
              <p><strong>10.3 Effect:</strong> Upon termination, all provisions of these Terms which by their nature
              should survive termination shall survive, including ownership provisions, warranty disclaimers,
              indemnification, and limitations of liability.</p>
            </div>
          </section>

          {/* Governing Law */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">11. Governing Law</h2>
            <p className="text-gray-600 leading-relaxed">
              These Terms shall be governed by and construed in accordance with the laws of the United States,
              without regard to its conflict of law provisions. Any disputes arising from these Terms or your use
              of our Services shall be resolved in the courts of the applicable jurisdiction.
            </p>
          </section>

          {/* Changes to Terms */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">12. Changes to Terms</h2>
            <p className="text-gray-600 leading-relaxed">
              We reserve the right to modify these Terms at any time. We will notify you of any changes by posting
              the new Terms on our website and updating the "Last updated" date. Your continued use of our Services
              after such modifications constitutes your acceptance of the new Terms.
            </p>
          </section>

          {/* Contact */}
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">13. Contact Us</h2>
            <p className="text-gray-600 leading-relaxed">
              If you have any questions about these Terms, please contact us at:
            </p>
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <p className="text-gray-700"><strong>Email:</strong> legal@tokenmanager.com</p>
              <p className="text-gray-700"><strong>Address:</strong> TokenManager Inc., Tech Park, Innovation Drive</p>
            </div>
          </section>

          {/* Back Link */}
          <div className="mt-8 pt-8 border-t border-gray-200">
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

export default TermsOfServicePage;
