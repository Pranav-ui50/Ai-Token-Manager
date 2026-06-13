/**
 * Hero Section
 *
 * Main hero section with animated dashboard preview.
 * Dynamic stats fetched from public API.
 */

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import publicApi from '../../../services/api/public.api.js';

const HeroSection = () => {
  const navigate = useNavigate();
  const [activeMetric, setActiveMetric] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [stats, setStats] = useState({
    totalUsers: '500+',
    totalApiCalls: '10M+',
    costSaved: '$2M+',
    providers: '15+'
  });
  const [heroContent, setHeroContent] = useState(null);
  const sectionRef = useRef(null);

  // Default metrics with fallback values
  const defaultMetrics = [
    { label: 'Cost Reduction', value: '40', suffix: '%', icon: '💰', description: 'Average savings' },
    { label: 'API Calls Tracked', value: '10', suffix: 'M+', icon: '📊', description: 'Monthly volume' },
    { label: 'Providers Supported', value: '15', suffix: '+', icon: '🔌', description: 'AI integrations' },
    { label: 'Uptime', value: '99.9', suffix: '%', icon: '⚡', description: 'Reliability' }
  ];

  const [metrics, setMetrics] = useState(defaultMetrics);

  // Fetch dynamic content from API
  useEffect(() => {
    const fetchContent = async () => {
      try {
        // Fetch hero content
        const heroResponse = await publicApi.getLandingSection('hero');
        if (heroResponse.success && heroResponse.data) {
          setHeroContent(heroResponse.data);

          // Use stats from hero content if available, otherwise use defaults
          if (heroResponse.data.stats && heroResponse.data.stats.length > 0) {
            setMetrics(heroResponse.data.stats);
          }
        }

        // Fetch platform stats for badge
        const statsResponse = await publicApi.getStats();
        if (statsResponse.success && statsResponse.data) {
          setStats({
            totalUsers: statsResponse.data.totalUsers || '500+',
            totalApiCalls: statsResponse.data.totalApiCalls || '10M+',
            costSaved: statsResponse.data.costSaved || '$2M+',
            providers: statsResponse.data.providers || '15+'
          });
        }
      } catch (error) {
        console.log('Using default content:', error);
      }
    };

    fetchContent();
  }, []);

  // Intersection Observer for scroll animations
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Auto-rotate metrics
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveMetric((prev) => (prev + 1) % metrics.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [metrics.length]);

  // Filter metrics that have valid values
  const validMetrics = metrics.filter(metric =>
    metric && (metric.value?.toString().trim() || metric.label?.trim())
  );

  return (
    <section ref={sectionRef} className="relative min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
      </div>

      {/* Gradient Orbs */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-red-500/20 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16 pb-24 md:pb-16">
        <div className="grid lg:grid-cols-2 gap-12 items-center min-h-[calc(100vh-6rem)]">
          {/* Left Content */}
          <div className={`text-center lg:text-left transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full mb-6">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span className="text-sm text-white/80">Trusted by {stats.totalUsers} companies worldwide</span>
            </div>

            {/* Headline - Only show if title exists */}
            {(heroContent?.title?.trim() || heroContent?.titleHighlight?.trim()) && (
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
                {heroContent?.title?.trim() && <span>{heroContent.title}</span>}
                {heroContent?.titleHighlight?.trim() && (
                  <span className="block text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-red-600">
                    {heroContent.titleHighlight}
                  </span>
                )}
              </h1>
            )}

            {/* Subheadline - Only show if subtitle exists */}
            {heroContent?.subtitle?.trim() && (
              <p className="text-lg md:text-xl text-gray-300 mb-8 max-w-2xl">
                {heroContent.subtitle}
              </p>
            )}

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-12">
              <button
                onClick={() => navigate('/register')}
                className="px-8 py-4 bg-[#DC2626] text-white font-semibold rounded-xl hover:bg-[#B91C1C] transition-all transform hover:scale-105 shadow-lg shadow-red-500/25"
              >
                {heroContent?.ctaButton?.trim() || 'Get Started'}
                <svg className="inline-block w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </button>
              {heroContent?.secondaryCta?.trim() && (
                <button
                  onClick={() => {
                    const pricingSection = document.getElementById('pricing');
                    if (pricingSection) {
                      pricingSection.scrollIntoView({ behavior: 'smooth' });
                    }
                  }}
                  className="px-8 py-4 bg-white/10 backdrop-blur-sm text-white font-semibold rounded-xl hover:bg-white/20 transition-all border border-white/20"
                >
                  {heroContent.secondaryCta}
                </button>
              )}
            </div>

            {/* Metrics - Only show valid metrics */}
            {validMetrics.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-8 md:mb-12">
                {validMetrics.map((metric, index) => (
                  <div
                    key={index}
                    onClick={() => setActiveMetric(index)}
                    className={`p-3 md:p-4 rounded-xl cursor-pointer transition-all duration-500 ${
                      activeMetric === index
                        ? 'bg-white/20 backdrop-blur-sm scale-105 shadow-lg'
                        : 'bg-white/5 hover:bg-white/10'
                    }`}
                  >
                    {metric.icon && <div className="text-xl md:text-2xl mb-1">{metric.icon}</div>}
                    <div className="text-xl md:text-2xl lg:text-3xl font-bold text-white">
                      {metric.value}{metric.suffix || ''}
                    </div>
                    {metric.label?.trim() && <div className="text-xs md:text-sm text-gray-400">{metric.label}</div>}
                    {activeMetric === index && metric.description?.trim() && (
                      <div className="text-xs text-green-400 mt-1 hidden md:block">{metric.description}</div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Scroll Indicator - Mobile Only */}
            <div className="flex justify-center lg:hidden">
              <button
                onClick={() => {
                  const featuresSection = document.getElementById('features');
                  if (featuresSection) {
                    featuresSection.scrollIntoView({ behavior: 'smooth' });
                  }
                }}
                className="flex flex-col items-center gap-1 text-white/60 hover:text-white transition-colors"
              >
                <span className="text-xs">Scroll to explore</span>
                <svg className="w-5 h-5 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              </button>
            </div>
          </div>

          {/* Right Content - Dashboard Preview */}
          <div className={`hidden lg:block relative transition-all duration-1000 delay-300 ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-10'}`}>
            <div className="relative">
              {/* Dashboard Card */}
              <div className="bg-gray-800/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/10 overflow-hidden">
                {/* Window Controls */}
                <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span className="ml-4 text-sm text-gray-400">TokenManager Dashboard</span>
                </div>

                {/* Dashboard Content */}
                <div className="p-6">
                  {/* Stats Row */}
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="bg-gray-700/50 rounded-lg p-4">
                      <div className="text-xs text-gray-400 mb-1">Total Spend</div>
                      <div className="text-xl font-bold text-white">$12,847</div>
                      <div className="text-xs text-green-400">-23% from last month</div>
                    </div>
                    <div className="bg-gray-700/50 rounded-lg p-4">
                      <div className="text-xs text-gray-400 mb-1">Tokens Used</div>
                      <div className="text-xl font-bold text-white">2.4M</div>
                      <div className="text-xs text-green-400">+12% efficiency</div>
                    </div>
                    <div className="bg-gray-700/50 rounded-lg p-4">
                      <div className="text-xs text-gray-400 mb-1">Active APIs</div>
                      <div className="text-xl font-bold text-white">8</div>
                      <div className="text-xs text-gray-400">All healthy</div>
                    </div>
                  </div>

                  {/* Chart Placeholder */}
                  <div className="bg-gray-700/30 rounded-lg p-4 mb-4">
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-sm font-medium text-white">Token Usage</span>
                      <span className="text-xs text-gray-400">Last 7 days</span>
                    </div>
                    <div className="flex items-end gap-2 h-32">
                      {[40, 65, 45, 80, 55, 90, 70].map((height, index) => (
                        <div
                          key={index}
                          className="flex-1 bg-gradient-to-t from-red-600 to-red-400 rounded-t transition-all duration-500"
                          style={{ height: `${height}%` }}
                        />
                      ))}
                    </div>
                    <div className="flex justify-between mt-2 text-xs text-gray-400">
                      <span>Mon</span>
                      <span>Tue</span>
                      <span>Wed</span>
                      <span>Thu</span>
                      <span>Fri</span>
                      <span>Sat</span>
                      <span>Sun</span>
                    </div>
                  </div>

                  {/* Provider Logos */}
                  <div className="flex items-center justify-center gap-4 opacity-60">
                    <div className="text-xs text-gray-400">Powered by</div>
                    <div className="flex items-center gap-3">
                      {['OpenAI', 'Anthropic', 'Google', 'Meta'].map((provider, index) => (
                        <div
                          key={index}
                          className="px-3 py-1 bg-gray-600/50 rounded text-xs text-white"
                        >
                          {provider}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating Elements */}
              <div className="absolute -top-4 -right-4 bg-green-500 text-white text-sm font-medium px-4 py-2 rounded-lg shadow-lg animate-bounce">
                ✓ Cost alerts active
              </div>
              <div className="absolute -bottom-4 -left-4 bg-blue-500 text-white text-sm font-medium px-4 py-2 rounded-lg shadow-lg">
                Real-time monitoring
              </div>
            </div>
          </div>
        </div>

        {/* Scroll Indicator - Desktop Only */}
        <div className="hidden lg:block absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <button
            onClick={() => {
              const featuresSection = document.getElementById('features');
              if (featuresSection) {
                featuresSection.scrollIntoView({ behavior: 'smooth' });
              }
            }}
            className="text-white/60 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </button>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;