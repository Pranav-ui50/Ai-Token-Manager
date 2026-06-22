/**
 * How It Works Section
 *
 * 5-step process explaining the platform workflow.
 * Dynamic content fetched from API.
 */

import { useState, useEffect } from 'react';
import publicApi from '../../../services/api/public.api.js';

// Icon mapping
const stepIcons = {
  link: (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
    </svg>
  ),
  settings: (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  chart: (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
  trending: (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
  ),
  rocket: (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  )
};

// Default steps as fallback
const defaultSteps = [
  {
    number: '01',
    title: 'Connect Provider',
    description: 'Link your AI provider accounts using secure API keys. We support OpenAI, Anthropic, Google, and 15+ more.',
    icon: 'link'
  },
  {
    number: '02',
    title: 'Configure Pricing',
    description: 'Set up your pricing models, tokens, and usage limits. Configure subscription plans for your customers.',
    icon: 'settings'
  },
  {
    number: '03',
    title: 'Track Usage',
    description: 'Monitor real-time token usage, API calls, and costs across all your providers in one dashboard.',
    icon: 'chart'
  },
  {
    number: '04',
    title: 'Optimize Cost',
    description: 'Identify cost-saving opportunities with AI-powered insights and optimization recommendations.',
    icon: 'trending'
  },
  {
    number: '05',
    title: 'Scale Profitably',
    description: 'Make informed decisions with forecasting and break-even analysis. Grow your AI business sustainably.',
    icon: 'rocket'
  }
];

const HowItWorksSection = () => {
  const [steps, setSteps] = useState(defaultSteps);
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');

  // Fetch dynamic content from API
  useEffect(() => {
    const fetchContent = async () => {
      try {
        const response = await publicApi.getLandingSection('howItWorks');
        if (response.success && response.data) {
          if (response.data.steps) {
            setSteps(response.data.steps);
          }
          // Update title/subtitle - use empty string if not provided to allow hiding
          setTitle(response.data.title ?? '');
          setSubtitle(response.data.subtitle ?? '');
        }
      } catch (error) {
        console.log('Using default how it works content:', error);
      }
    };

    fetchContent();
  }, []);

  // Filter steps that have valid title and description
  const validSteps = steps.filter(step =>
    step && step.title?.trim() && step.description?.trim()
  );

  // Check if header should be shown
  const showHeader = title?.trim() || subtitle?.trim();

  // Don't render section if no valid content
  if (validSteps.length === 0 && !showHeader) {
    return null;
  }

  return (
    <section id="how-it-works" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header - Only show if title or subtitle exists */}
        {showHeader && (
          <div className="text-center mb-16">
            {title?.trim() && (
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                {title}
              </h2>
            )}
            {subtitle?.trim() && (
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                {subtitle}
              </p>
            )}
          </div>
        )}

        {/* Steps */}
        {validSteps.length > 0 && (
          <div className="relative">
            {/* Connecting Line */}
            <div className="hidden lg:block absolute top-1/2 left-0 right-0 h-1 bg-gray-100 -translate-y-1/2" />

            <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-8">
              {validSteps.map((step, index) => (
                <div key={index} className="relative">
                  {/* Step Card */}
                  <div className="bg-white rounded-xl p-6 border border-gray-100 hover:border-gray-200 hover:shadow-lg transition-all group">
                    {/* Number Badge */}
                    <div className="absolute -top-4 left-6 bg-[#DC2626] text-white text-sm font-bold px-3 py-1 rounded-full">
                      {step.number}
                    </div>

                    {/* Icon */}
                    <div className="w-16 h-16 bg-gray-50 rounded-xl flex items-center justify-center mb-4 group-hover:bg-red-50 transition-colors">
                      <div className="text-gray-600 group-hover:text-[#DC2626] transition-colors">
                        {stepIcons[step.icon] || stepIcons.link}
                      </div>
                    </div>

                    {/* Content */}
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {step.title}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {step.description}
                    </p>
                  </div>

                  {/* Arrow (between steps) */}
                  {index < validSteps.length - 1 && (
                    <div className="hidden lg:flex absolute top-1/2 -right-4 transform -translate-y-1/2 z-10">
                      <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </section>
  );
};

export default HowItWorksSection;
