/**
 * FAQ Section
 *
 * Frequently asked questions with accordion.
 * Dynamic content fetched from API.
 */

import { useState, useEffect } from 'react';
import publicApi from '../../../services/api/public.api.js';

// Default FAQs as fallback
const defaultFaqs = [
  {
    category: 'Getting Started',
    questions: [
      {
        question: 'How do I get started with TokenManager?',
        answer: 'Getting started is easy! Simply sign up for a free account, connect your AI provider API keys, and start tracking your usage immediately.'
      },
      {
        question: 'What AI providers do you support?',
        answer: 'We support all major AI providers including OpenAI, Anthropic (Claude), Google AI, Mistral, Cohere, Meta AI, and 15+ more.'
      },
      {
        question: 'Is there a free trial available?',
        answer: 'Yes! We offer a 14-day free trial on all paid plans with full access to features. No credit card required.'
      }
    ]
  },
  {
    category: 'Pricing & Billing',
    questions: [
      {
        question: 'How does the pricing work?',
        answer: 'Our pricing is based on your subscription tier, not your AI usage. You pay a flat monthly or yearly fee for access to the platform.'
      },
      {
        question: 'Can I switch plans at any time?',
        answer: 'Absolutely! You can upgrade or downgrade your plan at any time. Changes are prorated for the remainder of your billing cycle.'
      }
    ]
  }
];

const FAQSection = () => {
  const [openIndex, setOpenIndex] = useState(null);
  const [faqs, setFaqs] = useState(defaultFaqs);
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');

  // Fetch dynamic content from API
  useEffect(() => {
    const fetchContent = async () => {
      try {
        const response = await publicApi.getLandingSection('faq');
        if (response.success && response.data) {
          if (response.data.items) {
            // Convert flat list to categorized format if needed
            const items = response.data.items;
            if (items.length > 0 && items[0].category) {
              // Group by category
              const grouped = items.reduce((acc, item) => {
                const category = item.category || 'General';
                if (!acc[category]) {
                  acc[category] = { category, questions: [] };
                }
                acc[category].questions.push({
                  question: item.question,
                  answer: item.answer
                });
                return acc;
              }, {});
              setFaqs(Object.values(grouped));
            } else {
              // Use as flat list under "General" category
              setFaqs([{ category: 'General', questions: items }]);
            }
          }
          // Update title/subtitle - use empty string if not provided to allow hiding
          setTitle(response.data.title ?? '');
          setSubtitle(response.data.subtitle ?? '');
        }
      } catch (error) {
        console.log('Using default FAQs:', error);
      }
    };

    fetchContent();
  }, []);

  const toggleFaq = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  // Filter FAQs that have both question and answer
  const validFaqs = faqs.map(category => ({
    ...category,
    questions: category.questions.filter(
      q => q.question?.trim() && q.answer?.trim()
    )
  })).filter(category => category.questions.length > 0);

  // Check if we should show the header
  const showHeader = title?.trim() || subtitle?.trim();

  // If no valid FAQs, don't render the section
  if (validFaqs.length === 0) {
    return null;
  }

  return (
    <section id="faq" className="py-20 bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header - Only show if title or subtitle exists */}
        {showHeader && (
          <div className="text-center mb-12">
            {title?.trim() && (
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                {title}
              </h2>
            )}
            {subtitle?.trim() && (
              <p className="text-lg text-gray-600">
                {subtitle}
              </p>
            )}
          </div>
        )}

        {/* FAQ Categories */}
        <div className="space-y-8">
          {validFaqs.map((category, categoryIndex) => (
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

      </div>
    </section>
  );
};

export default FAQSection;