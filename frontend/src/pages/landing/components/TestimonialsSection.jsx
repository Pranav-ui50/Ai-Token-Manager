/**
 * Testimonials Section
 *
 * Customer testimonials with ratings.
 * Dynamic content fetched from API.
 */

import { useState, useEffect } from 'react';
import publicApi from '../../../services/api/public.api.js';

// Default testimonials as fallback
const defaultTestimonials = [
  {
    _id: '1',
    name: 'Sarah Chen',
    role: 'CTO',
    company: 'TechStartup Inc.',
    avatarInitials: 'SC',
    avatarColor: 'bg-blue-500',
    content: "TokenManager helped us reduce our AI costs by 45% in the first month. The real-time analytics and forecasting features are exactly what we needed to scale efficiently.",
    rating: 5,
    isVerified: true
  },
  {
    _id: '2',
    name: 'Michael Rodriguez',
    role: 'VP of Engineering',
    company: 'DataDriven Co.',
    avatarInitials: 'MR',
    avatarColor: 'bg-purple-500',
    content: "The platform's ability to track usage across multiple AI providers in one dashboard is a game-changer. We went from spending hours on manual reports to having everything automated.",
    rating: 5,
    isVerified: true
  },
  {
    _id: '3',
    name: 'Emily Watson',
    role: 'Product Manager',
    company: 'AI Solutions Ltd.',
    avatarInitials: 'EW',
    avatarColor: 'bg-teal-500',
    content: "The scenario simulation feature helped us model different pricing strategies before implementation. It's saved us from making costly mistakes.",
    rating: 5,
    isVerified: true
  }
];

// Default platform stats as fallback
const defaultStats = [
  { statKey: 'ai_models', statValue: '50+', statLabel: 'AI Models', icon: '🤖' },
  { statKey: 'api_requests', statValue: '10M+', statLabel: 'API Requests', icon: '📊' },
  { statKey: 'users', statValue: '5000+', statLabel: 'Active Users', icon: '👥' },
  { statKey: 'uptime', statValue: '99.9%', statLabel: 'Uptime', icon: '⚡' }
];

// Default section content
const defaultSectionContent = {
  title: 'Trusted by Teams Worldwide',
  subtitle: 'See what our customers are saying about their experience with TokenManager.'
};

const TestimonialsSection = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [testimonials, setTestimonials] = useState(defaultTestimonials);
  const [stats, setStats] = useState(defaultStats);
  const [sectionTitle, setSectionTitle] = useState('');
  const [sectionSubtitle, setSectionSubtitle] = useState('');
  const [loading, setLoading] = useState(true);

  // Fetch dynamic content from API
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch testimonials
        const testimonialsRes = await publicApi.getTestimonials();
        if (testimonialsRes.success && testimonialsRes.data && testimonialsRes.data.length > 0) {
          setTestimonials(testimonialsRes.data);
        }

        // Fetch platform stats
        const statsRes = await publicApi.getPlatformStats();
        if (statsRes.success && statsRes.data && statsRes.data.length > 0) {
          setStats(statsRes.data);
        }

        // Fetch section content (title/subtitle)
        const sectionRes = await publicApi.getLandingSection('testimonials');
        if (sectionRes.success && sectionRes.data) {
          // Update title/subtitle - use empty string if not provided to allow hiding
          setSectionTitle(sectionRes.data.title ?? '');
          setSectionSubtitle(sectionRes.data.subtitle ?? '');
        }
      } catch (error) {
        console.log('Using default content:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

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

  // Safety check for testimonials
  const currentTestimonial = testimonials[activeIndex] || testimonials[0];

  // Filter testimonials that have required content (quote and author)
  const validTestimonials = testimonials.filter(
    t => (t.quote?.trim() || t.content?.trim()) && (t.author?.trim() || t.name?.trim())
  );

  // Check if we should show the header
  const showHeader = sectionTitle?.trim() || sectionSubtitle?.trim();

  // If no valid testimonials, don't render the section
  if (validTestimonials.length === 0 && !loading) {
    return null;
  }

  return (
    <section className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header - Only show if title or subtitle exists */}
        {showHeader && (
          <div className="text-center mb-12">
            {sectionTitle?.trim() && (
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                {sectionTitle}
              </h2>
            )}
            {sectionSubtitle?.trim() && (
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                {sectionSubtitle}
              </p>
            )}
          </div>
        )}

        {/* Featured Testimonial */}
        <div className="bg-white rounded-2xl shadow-lg p-8 md:p-12 mb-8">
          <div className="flex flex-col md:flex-row gap-8 items-center">
            <div className="flex-shrink-0">
              <div className={`w-24 h-24 ${currentTestimonial?.avatarColor || 'bg-gradient-to-br from-[#DC2626] to-[#B91C1C]'} rounded-full flex items-center justify-center text-white text-2xl font-bold`}>
                {currentTestimonial?.avatarInitials || currentTestimonial?.name?.substring(0, 2).toUpperCase() || 'A'}
              </div>
            </div>
            <div className="flex-1 text-center md:text-left">
              <div className="flex justify-center md:justify-start mb-4 items-center gap-2">
                {renderStars(currentTestimonial?.rating || 5)}
                {currentTestimonial?.isVerified && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">
                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Verified
                  </span>
                )}
              </div>
              <blockquote className="text-xl md:text-2xl text-gray-700 mb-4 leading-relaxed">
                "{currentTestimonial?.content || currentTestimonial?.quote || ''}"
              </blockquote>
              <div className="flex flex-col md:flex-row md:items-center gap-2">
                <span className="font-semibold text-gray-900">{currentTestimonial?.name || currentTestimonial?.author || 'Anonymous'}</span>
                {(currentTestimonial?.role || currentTestimonial?.name) && <span className="hidden md:inline text-gray-400">•</span>}
                <span className="text-gray-600">{currentTestimonial?.role || 'User'}</span>
                {currentTestimonial?.company && <span className="hidden md:inline text-gray-400">•</span>}
                <span className="text-[#DC2626] font-medium">{currentTestimonial?.company || 'Company'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Testimonial Grid - Only show valid testimonials */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {validTestimonials.map((testimonial, index) => (
            <div
              key={testimonial._id || testimonial.id || index}
              onClick={() => setActiveIndex(index)}
              className={`bg-white rounded-xl p-6 border-2 cursor-pointer transition-all ${
                activeIndex === index
                  ? 'border-[#DC2626] shadow-lg'
                  : 'border-gray-100 hover:border-gray-200'
              }`}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-12 h-12 ${testimonial?.avatarColor || 'bg-gradient-to-br from-gray-100 to-gray-200'} rounded-full flex items-center justify-center text-white font-semibold`}>
                  {testimonial?.avatarInitials || testimonial?.name?.charAt(0) || 'A'}
                </div>
                <div>
                  <div className="font-semibold text-gray-900">{testimonial?.name || testimonial?.author || 'Anonymous'}</div>
                  <div className="text-sm text-gray-500">{testimonial?.role || 'User'}</div>
                </div>
              </div>
              <div className="mb-3 flex items-center gap-2">
                {renderStars(testimonial?.rating || 5)}
                {testimonial?.isVerified && (
                  <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.4414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <p className="text-sm text-gray-600 line-clamp-3">
                "{testimonial?.content || testimonial?.quote || ''}"
              </p>
              {testimonial?.company && (
                <div className="mt-3 text-xs text-gray-400">
                  {testimonial?.company}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Platform Stats */}
        <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-6">
          {stats.map((stat, index) => (
            <div key={stat._id || stat.statKey || index} className="bg-white rounded-xl p-6 text-center">
              <div className="text-3xl mb-2">{stat.icon || '📊'}</div>
              <div className="text-3xl font-bold text-gray-900">{stat.statValue}</div>
              <div className="text-sm text-gray-500">{stat.statLabel}</div>
              {stat.description && (
                <div className="text-xs text-gray-400 mt-1">{stat.description}</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;