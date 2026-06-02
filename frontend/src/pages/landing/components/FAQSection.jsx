/**
 * FAQ Section
 *
 * Frequently asked questions with accordion.
 */

import { useState } from 'react';

const FAQSection = () => {
  const [openIndex, setOpenIndex] = useState(null);

  const faqs = [
    {
      category: 'Getting Started',
      questions: [
        {
          question: 'How do I get started with TokenManager?',
          answer: 'Getting started is easy! Simply sign up for a free account, connect your AI provider API keys, and start tracking your usage immediately. Our onboarding process takes less than 5 minutes, and you\'ll have access to your dashboard right away.'
        },
        {
          question: 'What AI providers do you support?',
          answer: 'We support all major AI providers including OpenAI, Anthropic (Claude), Google AI, Mistral, Cohere, Meta AI, and 15+ more. We\'re constantly adding new integrations based on customer demand.'
        },
        {
          question: 'Is there a free trial available?',
          answer: 'Yes! We offer a 14-day free trial on all paid plans with full access to features. No credit card required. You can also start with our Free plan which includes basic tracking features forever.'
        }
      ]
    },
    {
      category: 'Pricing & Billing',
      questions: [
        {
          question: 'How does the pricing work?',
          answer: 'Our pricing is based on your subscription tier, not your AI usage. You pay a flat monthly or yearly fee for access to the platform. Your actual AI costs go directly to your provider. We offer 5 tiers: Free, Starter, Professional, Business, and Enterprise.'
        },
        {
          question: 'Can I switch plans at any time?',
          answer: 'Absolutely! You can upgrade or downgrade your plan at any time. When upgrading, you\'ll be prorated for the remainder of your billing cycle. When downgrading, the change takes effect at the start of your next billing period.'
        },
        {
          question: 'What payment methods do you accept?',
          answer: 'We accept all major credit cards (Visa, MasterCard, American Express), PayPal, and bank transfers for Enterprise customers. All payments are processed securely through Stripe.'
        },
        {
          question: 'Do you offer discounts for annual billing?',
          answer: 'Yes! When you choose annual billing, you save 20% compared to monthly billing. That\'s like getting over 2 months free. Annual plans also come with priority support.'
        }
      ]
    },
    {
      category: 'Features & Functionality',
      questions: [
        {
          question: 'How does token tracking work?',
          answer: 'TokenManager connects to your AI provider APIs and automatically logs every API call. We track input tokens, output tokens, costs, latency, and more. All data is updated in real-time and stored for historical analysis.'
        },
        {
          question: 'Can I set up cost alerts?',
          answer: 'Yes! You can configure custom alerts for cost thresholds, unusual usage patterns, and budget limits. Alerts can be delivered via email, Slack, or webhook integrations. Stay informed before costs spiral.'
        },
        {
          question: 'What is the break-even analysis feature?',
          answer: 'Our break-even analysis helps you understand when your AI investment becomes profitable. Input your costs and revenue models, and we\'ll calculate your break-even point, margin analysis, and ROI projections.'
        },
        {
          question: 'Can I manage multiple organizations?',
          answer: 'Enterprise plans support multiple organizations under a single account. Each organization has its own billing, users, and settings. Perfect for agencies and managed service providers.'
        }
      ]
    },
    {
      category: 'Security & Privacy',
      questions: [
        {
          question: 'How secure is my API key data?',
          answer: 'Your API keys are encrypted using AES-256 encryption and stored in secure vaults. We never store keys in plain text, and our systems are SOC 2 Type II certified. Your keys are only used to make API calls on your behalf.'
        },
        {
          question: 'Do you have access to my AI conversations?',
          answer: 'No. We only track metadata like token counts, costs, and API response times. We never see or store the actual content of your prompts or responses. Your data remains completely private.'
        },
        {
          question: 'Are you GDPR and CCPA compliant?',
          answer: 'Yes, we are fully compliant with GDPR, CCPA, and other major data protection regulations. You can request data export or deletion at any time from your account settings.'
        }
      ]
    },
    {
      category: 'Team & Collaboration',
      questions: [
        {
          question: 'How many team members can I add?',
          answer: 'The number of team members depends on your plan. Free plan includes 1 user, Starter up to 3, Professional up to 10, Business up to 50, and Enterprise offers unlimited users. Each user can have custom role-based permissions.'
        },
        {
          question: 'What roles and permissions are available?',
          answer: 'We offer granular role-based access control (RBAC) with roles like Super Admin, Org Owner, Finance Admin, Product Manager, Developer, and Viewer. Each role has predefined permissions, and custom roles are available on Enterprise plans.'
        },
        {
          question: 'Can I share reports with stakeholders?',
          answer: 'Yes! You can generate shareable reports with custom date ranges and metrics. Reports can be exported as PDF or CSV, or shared via a secure link that expires after a set time.'
        }
      ]
    },
    {
      category: 'Support',
      questions: [
        {
          question: 'What support options are available?',
          answer: 'Free and Starter plans include community support and documentation. Professional and Business plans include email support with 24-hour response time. Enterprise plans include dedicated account managers, phone support, and 4-hour response SLA.'
        },
        {
          question: 'Do you offer onboarding assistance?',
          answer: 'Professional plans include guided onboarding. Business and Enterprise plans include custom onboarding sessions, training for your team, and ongoing strategic consulting. We\'re here to ensure your success.'
        }
      ]
    }
  ];

  const toggleFaq = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section id="faq" className="py-20 bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-lg text-gray-600">
            Find answers to common questions about TokenManager.
          </p>
        </div>

        {/* FAQ Categories */}
        <div className="space-y-8">
          {faqs.map((category, categoryIndex) => (
            <div key={categoryIndex}>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {category.category}
              </h3>
              <div className="space-y-3">
                {category.questions.map((faq, faqIndex) => {
                  const index = `${categoryIndex}-${faqIndex}`;
                  const isOpen = openIndex === index;

                  return (
                    <div
                      key={faqIndex}
                      className="border border-gray-200 rounded-xl overflow-hidden"
                    >
                      <button
                        onClick={() => toggleFaq(index)}
                        className="w-full flex items-center justify-between p-4 text-left bg-white hover:bg-gray-50 transition-colors"
                      >
                        <span className="font-medium text-gray-900">{faq.question}</span>
                        <svg
                          className={`w-5 h-5 text-gray-500 transition-transform ${
                            isOpen ? 'rotate-180' : ''
                          }`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      {isOpen && (
                        <div className="px-4 pb-4">
                          <p className="text-gray-600 leading-relaxed">{faq.answer}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Still Have Questions */}
        <div className="mt-12 text-center bg-gray-50 rounded-2xl p-8">
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Still have questions?
          </h3>
          <p className="text-gray-600 mb-6">
            Can't find what you're looking for? Our team is here to help.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/contact"
              className="px-6 py-3 bg-[#DC2626] text-white font-semibold rounded-lg hover:bg-[#B91C1C] transition-colors"
            >
              Contact Support
            </a>
            <a
              href="/docs"
              className="px-6 py-3 bg-white text-gray-900 font-semibold rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              View Documentation
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FAQSection;