/**
 * Testimonials Section
 *
 * Customer testimonials with ratings.
 */

import { useState } from 'react';

const TestimonialsSection = () => {
  const [activeIndex, setActiveIndex] = useState(0);

  const testimonials = [
    {
      id: 1,
      name: 'Sarah Chen',
      role: 'CTO',
      company: 'TechStartup Inc.',
      image: null,
      rating: 5,
      quote: "TokenManager helped us reduce our AI costs by 45% in the first month. The real-time analytics and forecasting features are exactly what we needed to scale efficiently.",
      highlight: '45% cost reduction'
    },
    {
      id: 2,
      name: 'Michael Rodriguez',
      role: 'VP of Engineering',
      company: 'DataDriven Co.',
      image: null,
      rating: 5,
      quote: "The platform's ability to track usage across multiple AI providers in one dashboard is a game-changer. We went from spending hours on manual reports to having everything automated.",
      highlight: 'Hours saved daily'
    },
    {
      id: 3,
      name: 'Emily Watson',
      role: 'Product Manager',
      company: 'AI Solutions Ltd.',
      image: null,
      rating: 5,
      quote: "The scenario simulation feature helped us model different pricing strategies before implementation. It's saved us from making costly mistakes.",
      highlight: 'Risk mitigation'
    },
    {
      id: 4,
      name: 'David Kim',
      role: 'Founder',
      company: 'ScaleAI Startup',
      image: null,
      rating: 4,
      quote: "As a startup, every dollar counts. TokenManager's break-even analysis helped us understand exactly when our AI investment would become profitable.",
      highlight: 'Clear ROI visibility'
    },
    {
      id: 5,
      name: 'Lisa Thompson',
      role: 'Finance Director',
      company: 'Enterprise Corp',
      image: null,
      rating: 5,
      quote: "The team management features and role-based access control make it easy for our entire organization to collaborate while maintaining proper oversight.",
      highlight: 'Team collaboration'
    },
    {
      id: 6,
      name: 'James Miller',
      role: 'DevOps Lead',
      company: 'CloudFirst Technologies',
      image: null,
      rating: 5,
      quote: "Integration was seamless. We connected all our AI providers within minutes and had complete visibility into our token usage immediately.",
      highlight: 'Quick integration'
    }
  ];

  const renderStars = (rating) => {
    return (
      <div className="flex gap-1">
        {[...Array(5)].map((_, index) => (
          <svg
            key={index}
            className={`w-5 h-5 ${index < rating ? 'text-yellow-400' : 'text-gray-300'}`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
      </div>
    );
  };

  return (
    <section className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Trusted by Teams Worldwide
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            See what our customers are saying about their experience with TokenManager.
          </p>
        </div>

        {/* Featured Testimonial */}
        <div className="bg-white rounded-2xl shadow-lg p-8 md:p-12 mb-8">
          <div className="flex flex-col md:flex-row gap-8 items-center">
            <div className="flex-shrink-0">
              <div className="w-24 h-24 bg-gradient-to-br from-[#DC2626] to-[#B91C1C] rounded-full flex items-center justify-center text-white text-3xl font-bold">
                {testimonials[activeIndex].name.charAt(0)}
              </div>
            </div>
            <div className="flex-1 text-center md:text-left">
              <div className="flex justify-center md:justify-start mb-4">
                {renderStars(testimonials[activeIndex].rating)}
              </div>
              <blockquote className="text-xl md:text-2xl text-gray-700 mb-4 leading-relaxed">
                "{testimonials[activeIndex].quote}"
              </blockquote>
              <div className="flex flex-col md:flex-row md:items-center gap-2">
                <span className="font-semibold text-gray-900">{testimonials[activeIndex].name}</span>
                <span className="hidden md:inline text-gray-400">•</span>
                <span className="text-gray-600">{testimonials[activeIndex].role}</span>
                <span className="hidden md:inline text-gray-400">•</span>
                <span className="text-[#DC2626] font-medium">{testimonials[activeIndex].company}</span>
              </div>
              <div className="mt-3 inline-block px-4 py-1 bg-green-100 text-green-700 text-sm font-medium rounded-full">
                {testimonials[activeIndex].highlight}
              </div>
            </div>
          </div>
        </div>

        {/* Testimonial Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {testimonials.map((testimonial, index) => (
            <div
              key={testimonial.id}
              onClick={() => setActiveIndex(index)}
              className={`bg-white rounded-xl p-6 border-2 cursor-pointer transition-all ${
                activeIndex === index
                  ? 'border-[#DC2626] shadow-lg'
                  : 'border-gray-100 hover:border-gray-200'
              }`}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center text-gray-600 font-semibold">
                  {testimonial.name.charAt(0)}
                </div>
                <div>
                  <div className="font-semibold text-gray-900">{testimonial.name}</div>
                  <div className="text-sm text-gray-500">{testimonial.role}</div>
                </div>
              </div>
              <div className="mb-3">
                {renderStars(testimonial.rating)}
              </div>
              <p className="text-sm text-gray-600 line-clamp-3">
                "{testimonial.quote}"
              </p>
            </div>
          ))}
        </div>

        {/* Stats */}
        <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl p-6 text-center">
            <div className="text-3xl font-bold text-gray-900">500+</div>
            <div className="text-sm text-gray-500">Active Teams</div>
          </div>
          <div className="bg-white rounded-xl p-6 text-center">
            <div className="text-3xl font-bold text-gray-900">$2M+</div>
            <div className="text-sm text-gray-500">Costs Saved</div>
          </div>
          <div className="bg-white rounded-xl p-6 text-center">
            <div className="text-3xl font-bold text-gray-900">15M+</div>
            <div className="text-sm text-gray-500">API Calls Tracked</div>
          </div>
          <div className="bg-white rounded-xl p-6 text-center">
            <div className="text-3xl font-bold text-gray-900">4.9/5</div>
            <div className="text-sm text-gray-500">Customer Rating</div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;