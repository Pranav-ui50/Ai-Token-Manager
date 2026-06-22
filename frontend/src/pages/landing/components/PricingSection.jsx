/**
 * Pricing Section
 *
 * Displays subscription plans dynamically from API.
 * Uses PlansContext for centralized state management.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePlans } from '../../../context/PlansContext.jsx';
import Loader from '../../../components/common/Loader.jsx';

const PricingSection = () => {
  const navigate = useNavigate();
  const { plans, loading, error, refreshPlans } = usePlans();
  const [billingInterval, setBillingInterval] = useState('month');
  const [currency, setCurrency] = useState('USD');

  // Currency conversion rates (approximate)
  const conversionRates = {
    USD: 1,
    INR: 83.5, // Approximate USD to INR rate
    EUR: 0.92,
    GBP: 0.79
  };

  // Currency symbols
  const currencySymbols = {
    USD: '$',
    INR: '₹',
    EUR: '€',
    GBP: '£'
  };

  const formatPrice = (price, curr = 'USD') => {
    const symbol = currencySymbols[curr] || '$';
    const convertedPrice = price * (conversionRates[curr] || 1);
    return `${symbol}${convertedPrice.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  const getTierColor = (tier) => {
    const colors = {
      starter: { bg: 'bg-blue-50', border: 'border-blue-200', badge: 'bg-blue-100 text-blue-700' },
      professional: { bg: 'bg-purple-50', border: 'border-purple-200', badge: 'bg-purple-100 text-purple-700' },
      business: { bg: 'bg-yellow-50', border: 'border-yellow-200', badge: 'bg-yellow-100 text-yellow-700' },
      enterprise: { bg: 'bg-red-50', border: 'border-red-200', badge: 'bg-red-100 text-red-700' }
    };
    return colors[tier] || colors.starter;
  };

  const getTierName = (tier) => {
    const names = {
      starter: 'Starter',
      professional: 'Professional',
      business: 'Business',
      enterprise: 'Enterprise'
    };
    return names[tier] || tier;
  };

  const getDisplayPrice = (plan) => {
    const basePrice = plan.billing?.price || 0;
    if (billingInterval === 'year' && plan.billing?.interval === 'month') {
      // Calculate yearly price with 20% discount
      return basePrice * 12 * 0.8;
    }
    return basePrice;
  };

  const handleSelectPlan = (plan) => {
    navigate(`/register?plan=${plan.id}&currency=${currency}&billing=${billingInterval}`);
  };

  if (loading) {
    return (
      <section id="pricing" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <Loader text="Loading plans..." />
          </div>
        </div>
      </section>
    );
  }

  // Filter out Enterprise plans - they will be shown as "Contact Us"
  const displayPlans = plans.filter(plan => plan.tier !== 'enterprise' && plan.tier !== 'free');

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
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mt-8">
            {/* Currency Selector */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Currency:</span>
              <div className="flex items-center bg-white border border-gray-200 rounded-lg p-1">
                {['USD', 'INR', 'EUR', 'GBP'].map((curr) => (
                  <button
                    key={curr}
                    onClick={() => setCurrency(curr)}
                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                      currency === curr
                        ? 'bg-[#DC2626] text-white'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {curr}
                  </button>
                ))}
              </div>
            </div>

            {/* Billing Interval Toggle */}
            <div className="flex items-center gap-4">
              <span className={`text-sm font-medium ${billingInterval === 'month' ? 'text-gray-900' : 'text-gray-500'}`}>
                Month
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
                Year
                <span className="ml-1 text-green-600 font-semibold">(Save 20%)</span>
              </span>
            </div>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="text-center mb-8">
            <p className="text-red-600">{error}</p>
            <button
              onClick={refreshPlans}
              className="mt-2 text-[#DC2626] hover:underline"
            >
              Try again
            </button>
          </div>
        )}

        {/* Plans Grid */}
        {displayPlans.length === 0 && !error ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No plans available at the moment. Please contact support.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {displayPlans.map((plan) => {
              const tierStyle = getTierColor(plan.tier);
              const isPopular = plan.isPopular || plan.tier === 'professional';

              return (
                <div
                  key={plan.id}
                  className={`relative bg-white rounded-2xl border-2 ${
                    isPopular ? 'border-[#DC2626] shadow-lg' : 'border-gray-200'
                  } overflow-hidden transition-all hover:shadow-xl`}
                >
                  <div className="p-6">
                    {/* Plan Header */}
                    <div className="mb-4">
                      <div className="flex items-center gap-2">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${tierStyle.badge}`}>
                          {getTierName(plan.tier)}
                        </span>
                        {isPopular && (
                          <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-[#DC2626] text-white">
                            Popular
                          </span>
                        )}
                      </div>
                      <h3 className="mt-2 text-xl font-bold text-gray-900">{plan.name}</h3>
                      {plan.description && (
                        <p className="text-sm text-gray-500 mt-1">{plan.description}</p>
                      )}
                    </div>

                    {/* Price */}
                    <div className="mb-6">
                      <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-bold text-gray-900">
                          {formatPrice(getDisplayPrice(plan), currency)}
                        </span>
                        <span className="text-gray-500">
                          /{billingInterval === 'year' ? 'year' : plan.billing?.interval || 'month'}
                        </span>
                      </div>
                      {billingInterval === 'year' && plan.billing?.price > 0 && plan.billing?.interval === 'month' && (
                        <p className="text-sm text-gray-400 mt-1">
                          <span className="line-through">{formatPrice((plan.billing?.price || 0) * 12, currency)}/year</span>
                        </p>
                      )}
                    </div>

                    {/* Features */}
                    <div className="space-y-3 mb-6">
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
                      {plan.limits?.maxProjects > 0 && (
                        <div className="flex items-center gap-2 text-sm">
                          <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span className="text-gray-600">Up to {plan.limits.maxProjects} project{plan.limits.maxProjects > 1 ? 's' : ''}</span>
                        </div>
                      )}

                      {plan.limits?.maxFeatures > 0 && (
                        <div className="flex items-center gap-2 text-sm">
                          <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span className="text-gray-600">Up to {plan.limits.maxFeatures} feature{plan.limits.maxFeatures > 1 ? 's' : ''}</span>
                        </div>
                      )}

                      {plan.limits?.maxSimulations > 0 && (
                        <div className="flex items-center gap-2 text-sm">
                          <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span className="text-gray-600">{plan.limits.maxSimulations.toLocaleString()} simulation{plan.limits.maxSimulations > 1 ? 's' : ''}</span>
                        </div>
                      )}

                      {plan.limits?.maxUsers > 0 && (
                        <div className="flex items-center gap-2 text-sm">
                          <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span className="text-gray-600">Up to {plan.limits.maxUsers} user{plan.limits.maxUsers > 1 ? 's' : ''}</span>
                        </div>
                      )}

                      {plan.limits?.maxApiCalls > 0 && (
                        <div className="flex items-center gap-2 text-sm">
                          <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span className="text-gray-600">{plan.limits.maxApiCalls.toLocaleString()} API calls</span>
                        </div>
                      )}

                      {plan.limits?.maxTokens > 0 && (
                        <div className="flex items-center gap-2 text-sm">
                          <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span className="text-gray-600">{plan.limits.maxTokens.toLocaleString()} tokens</span>
                        </div>
                      )}

                      {/* Unlimited fallback */}
                      {!plan.limits?.maxProjects && !plan.limits?.maxFeatures && !plan.limits?.maxSimulations && !plan.limits?.maxApiCalls && !plan.limits?.maxUsers && !plan.features?.length && (
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
                      Start Free Trial
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
      </div>
    </section>
  );
};

export default PricingSection;