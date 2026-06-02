/**
 * Pricing Section
 *
 * Displays subscription plans dynamically from API.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import publicApi from '../../../services/api/public.api.js';

const PricingSection = () => {
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [billingInterval, setBillingInterval] = useState('month');

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const response = await publicApi.getPlans();
      if (response.success) {
        setPlans(response.data || []);
      }
    } catch (err) {
      setError('Failed to load plans');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price);
  };

  const getTierColor = (tier) => {
    const colors = {
      free: { bg: 'bg-gray-50', border: 'border-gray-200', badge: 'bg-gray-100 text-gray-700' },
      starter: { bg: 'bg-blue-50', border: 'border-blue-200', badge: 'bg-blue-100 text-blue-700' },
      professional: { bg: 'bg-purple-50', border: 'border-purple-200', badge: 'bg-purple-100 text-purple-700' },
      business: { bg: 'bg-yellow-50', border: 'border-yellow-200', badge: 'bg-yellow-100 text-yellow-700' },
      enterprise: { bg: 'bg-red-50', border: 'border-red-200', badge: 'bg-red-100 text-red-700' }
    };
    return colors[tier] || colors.starter;
  };

  const getTierName = (tier) => {
    const names = {
      free: 'Free',
      starter: 'Starter',
      professional: 'Professional',
      business: 'Business',
      enterprise: 'Enterprise'
    };
    return names[tier] || tier;
  };

  const getDisplayPrice = (plan) => {
    if (billingInterval === 'year' && plan.billing?.interval === 'month') {
      // Calculate yearly price with 20% discount
      return (plan.billing?.price || 0) * 12 * 0.8;
    }
    return plan.billing?.price || 0;
  };

  const handleSelectPlan = (plan) => {
    navigate(`/register?plan=${plan.id}`);
  };

  if (loading) {
    return (
      <section id="pricing" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#DC2626] mx-auto"></div>
            <p className="mt-4 text-gray-500">Loading plans...</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="pricing" className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Simple, Transparent Pricing
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Choose the plan that fits your needs. All plans include core features with no hidden fees.
          </p>

          {/* Billing Toggle */}
          <div className="flex items-center justify-center gap-4 mt-8">
            <span className={`text-sm font-medium ${billingInterval === 'month' ? 'text-gray-900' : 'text-gray-500'}`}>
              Monthly
            </span>
            <button
              onClick={() => setBillingInterval(billingInterval === 'month' ? 'year' : 'month')}
              className={`relative w-14 h-7 rounded-full transition-colors ${
                billingInterval === 'year' ? 'bg-[#DC2626]' : 'bg-gray-300'
              }`}
            >
              <span
                className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  billingInterval === 'year' ? 'transform translate-x-7' : ''
                }`}
              />
            </button>
            <span className={`text-sm font-medium ${billingInterval === 'year' ? 'text-gray-900' : 'text-gray-500'}`}>
              Yearly
              <span className="ml-1 text-green-600 font-semibold">(Save 20%)</span>
            </span>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="text-center mb-8">
            <p className="text-red-600">{error}</p>
            <button
              onClick={fetchPlans}
              className="mt-2 text-[#DC2626] hover:underline"
            >
              Try again
            </button>
          </div>
        )}

        {/* Plans Grid */}
        {plans.length === 0 && !error ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No plans available at the moment.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {plans.map((plan) => {
              const tierStyle = getTierColor(plan.tier);
              const isPopular = plan.isPopular || plan.tier === 'professional';

              return (
                <div
                  key={plan.id}
                  className={`relative bg-white rounded-2xl border-2 ${
                    isPopular ? 'border-[#DC2626] shadow-lg' : 'border-gray-200'
                  } overflow-hidden transition-all hover:shadow-xl`}
                >
                  {/* Popular Badge */}
                  {isPopular && (
                    <div className="absolute top-0 right-0 bg-[#DC2626] text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
                      Most Popular
                    </div>
                  )}

                  <div className="p-6">
                    {/* Plan Header */}
                    <div className="mb-4">
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${tierStyle.badge}`}>
                        {getTierName(plan.tier)}
                      </span>
                      <h3 className="mt-2 text-xl font-bold text-gray-900">{plan.name}</h3>
                      {plan.description && (
                        <p className="text-sm text-gray-500 mt-1">{plan.description}</p>
                      )}
                    </div>

                    {/* Price */}
                    <div className="mb-6">
                      <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-bold text-gray-900">
                          {plan.billing?.price === 0 ? 'Free' : formatPrice(getDisplayPrice(plan), plan.billing?.currency)}
                        </span>
                        {plan.billing?.price > 0 && (
                          <span className="text-gray-500">
                            /{billingInterval === 'year' ? 'year' : plan.billing?.interval || 'month'}
                          </span>
                        )}
                      </div>
                      {billingInterval === 'year' && plan.billing?.price > 0 && plan.billing?.interval === 'month' && (
                        <p className="text-sm text-gray-400 mt-1">
                          <span className="line-through">{formatPrice((plan.billing?.price || 0) * 12, plan.billing?.currency)}/year</span>
                        </p>
                      )}
                    </div>

                    {/* Features */}
                    <div className="space-y-3 mb-6">
                      {/* Included Credits */}
                      {plan.credits?.includedCredits > 0 && (
                        <div className="flex items-center gap-2 text-sm">
                          <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span className="text-gray-600">
                            {plan.credits.includedCredits.toLocaleString()} {plan.credits.creditType || 'tokens'} included
                          </span>
                        </div>
                      )}

                      {/* Usage Limits */}
                      {plan.pricingModel?.includedTokens > 0 && (
                        <div className="flex items-center gap-2 text-sm">
                          <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span className="text-gray-600">
                            {plan.pricingModel.includedTokens.toLocaleString()} tokens/month
                          </span>
                        </div>
                      )}

                      {/* Features List */}
                      {(plan.features || []).slice(0, 5).map((feature, index) => (
                        <div key={index} className="flex items-center gap-2 text-sm">
                          <svg
                            className={`w-5 h-5 ${feature.enabled ? 'text-green-500' : 'text-gray-300'}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            {feature.enabled ? (
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            ) : (
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            )}
                          </svg>
                          <span className={feature.enabled ? 'text-gray-600' : 'text-gray-400'}>
                            {feature.name || `Feature ${index + 1}`}
                          </span>
                        </div>
                      ))}

                      {/* Plan Limits */}
                      {plan.limits?.maxUsers && (
                        <div className="flex items-center gap-2 text-sm">
                          <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span className="text-gray-600">Up to {plan.limits.maxUsers} users</span>
                        </div>
                      )}

                      {plan.limits?.maxApiCalls && (
                        <div className="flex items-center gap-2 text-sm">
                          <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span className="text-gray-600">{plan.limits.maxApiCalls.toLocaleString()} API calls</span>
                        </div>
                      )}

                      {/* Unlimited fallback */}
                      {!plan.credits?.includedCredits && !plan.pricingModel?.includedTokens && !plan.limits?.maxApiCalls && (
                        <div className="flex items-center gap-2 text-sm">
                          <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span className="text-gray-600">Core features included</span>
                        </div>
                      )}
                    </div>

                    {/* CTA Button */}
                    <button
                      onClick={() => handleSelectPlan(plan)}
                      className={`w-full py-3 px-4 rounded-lg font-semibold transition-all ${
                        isPopular
                          ? 'bg-[#DC2626] text-white hover:bg-[#B91C1C]'
                          : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                      }`}
                    >
                      {plan.billing?.price === 0 ? 'Get Started' : 'Start Free Trial'}
                    </button>

                    {/* Trial Info */}
                    {plan.billing?.trialDays > 0 && (
                      <p className="text-center text-sm text-gray-500 mt-3">
                        {plan.billing.trialDays}-day free trial
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Enterprise CTA */}
        <div className="mt-12 text-center bg-white rounded-xl p-8 border border-gray-200">
          <h3 className="text-xl font-bold text-gray-900 mb-2">Need a custom solution?</h3>
          <p className="text-gray-600 mb-4">
            Enterprise plans with dedicated support, custom limits, and SLA guarantees.
          </p>
          <button
            onClick={() => navigate('/contact')}
            className="px-6 py-2 bg-gray-900 text-white font-semibold rounded-lg hover:bg-gray-800 transition-colors"
          >
            Contact Sales
          </button>
        </div>
      </div>
    </section>
  );
};

export default PricingSection;