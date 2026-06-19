/**
 * Subscription Page
 *
 * Displays organization's current subscription plan details.
 * Read-only view for finance_admin role.
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useOrganization } from '../../context/OrganizationContext.jsx';
import usePermissions from '../../hooks/usePermissions.js';
import { formatIndianNumber } from '../../utils/currency.js';

// Get status badge styles for subscription
const getStatusBadge = (status) => {
  const styles = {
    active: 'bg-green-100 text-green-700',
    trial: 'bg-blue-100 text-blue-700',
    pending_payment: 'bg-yellow-100 text-yellow-700',
    past_due: 'bg-orange-100 text-orange-700',
    expired: 'bg-red-100 text-red-700',
    cancelled: 'bg-gray-100 text-gray-700'
  };
  return styles[status] || 'bg-gray-100 text-gray-700';
};

function SubscriptionPage() {
  const { currentOrganization, isLoading: orgLoading } = useOrganization();
  const { role } = usePermissions();
  const [loading, setLoading] = useState(true);

  // Get subscription data from organization
  const subscription = currentOrganization?.subscription || null;
  const hasSubscription = subscription && (subscription.planId || subscription.status === 'trial');

  // Get plan display name
  const getPlanDisplayName = () => {
    if (subscription?.planId?.name) {
      return subscription.planId.name;
    }
    if (subscription?.planName) {
      return subscription.planName;
    }
    if (subscription?.plan) {
      return subscription.plan.charAt(0).toUpperCase() + subscription.plan.slice(1);
    }
    if (subscription?.status === 'trial') {
      return 'Free Trial';
    }
    return null;
  };

  const planDisplayName = getPlanDisplayName();

  useEffect(() => {
    if (!orgLoading) {
      setLoading(false);
    }
  }, [orgLoading]);

  if (loading || orgLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <svg className="animate-spin h-10 w-10 text-[#DC2626] mx-auto" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="mt-4 text-gray-500">Loading subscription...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Subscription</h1>
              <p className="text-sm text-gray-500">
                View your organization's subscription details
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* No Subscription */}
        {!hasSubscription && (
          <div className="bg-white rounded-xl shadow-soft p-12 text-center">
            <svg className="mx-auto h-16 w-16 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h2 className="mt-4 text-xl font-semibold text-gray-900">No Active Subscription</h2>
            <p className="mt-2 text-gray-500">
              Your organization does not have an active subscription plan.
            </p>
            <p className="mt-4 text-sm text-gray-400">
              Contact your organization owner to set up a subscription.
            </p>
          </div>
        )}

        {/* Current Plan Section */}
        {hasSubscription && planDisplayName && (
          <div className="bg-white rounded-xl shadow-soft border border-gray-100 overflow-hidden">
            {/* Plan Header */}
            <div className="bg-gradient-to-r from-[#DC2626] to-[#B91C1C] px-6 py-8 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-white/80">Current Plan</p>
                  <h2 className="text-3xl font-bold">{planDisplayName}</h2>
                </div>
                <span className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium ${getStatusBadge(subscription?.status)}`}>
                  {subscription?.status?.charAt(0).toUpperCase() + subscription?.status?.slice(1)}
                </span>
              </div>
            </div>

            {/* Plan Details */}
            <div className="p-6">
              {/* Billing Info */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {/* Billing Interval */}
                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Billing Cycle</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {subscription?.billingCycle === 'yearly' ? 'Yearly' : 'Monthly'}
                    </p>
                  </div>
                </div>

                {/* Started Date */}
                {subscription?.currentPeriodStart && (
                  <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                    <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-4 4M3 5v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Started</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {new Date(subscription.currentPeriodStart).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                )}

                {/* Renews/Expires Date */}
                {subscription?.status === 'trial' && subscription?.trialEndsAt ? (
                  <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                    <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Trial Ends</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {new Date(subscription.trialEndsAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ) : subscription?.currentPeriodEnd ? (
                  <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Renews</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ) : null}
              </div>

              {/* Plan Limits */}
              {subscription?.planId?.limits && (
                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Plan Includes</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Users Limit */}
                    <div className="flex items-center gap-3 bg-gray-50 rounded-lg px-4 py-3">
                      <svg className="w-5 h-5 text-blue-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                      <span className="text-gray-700">
                        Up to <span className="font-semibold text-gray-900">{subscription.planId.limits.maxUsers || 'Unlimited'}</span> users
                      </span>
                    </div>

                    {/* Projects Limit */}
                    <div className="flex items-center gap-3 bg-gray-50 rounded-lg px-4 py-3">
                      <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                      <span className="text-gray-700">
                        Up to <span className="font-semibold text-gray-900">{subscription.planId.limits.maxProjects || 'Unlimited'}</span> projects
                      </span>
                    </div>

                    {/* Features Limit */}
                    <div className="flex items-center gap-3 bg-gray-50 rounded-lg px-4 py-3">
                      <svg className="w-5 h-5 text-purple-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                      <span className="text-gray-700">
                        Up to <span className="font-semibold text-gray-900">{subscription.planId.limits.maxFeatures || 'Unlimited'}</span> features
                      </span>
                    </div>

                    {/* Simulations Limit */}
                    <div className="flex items-center gap-3 bg-gray-50 rounded-lg px-4 py-3">
                      <svg className="w-5 h-5 text-orange-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                      <span className="text-gray-700">
                        <span className="font-semibold text-gray-900">{subscription.planId.limits.maxSimulations || 'Unlimited'}</span> simulations
                      </span>
                    </div>

                    {/* API Calls Limit */}
                    <div className="flex items-center gap-3 bg-gray-50 rounded-lg px-4 py-3">
                      <svg className="w-5 h-5 text-cyan-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="text-gray-700">
                        <span className="font-semibold text-gray-900">{subscription.planId.limits.maxApiCalls ? formatIndianNumber(subscription.planId.limits.maxApiCalls) : 'Unlimited'}</span> API calls
                      </span>
                    </div>

                    {/* Tokens/Credits Limit */}
                    <div className="flex items-center gap-3 bg-gray-50 rounded-lg px-4 py-3">
                      <svg className="w-5 h-5 text-pink-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                      </svg>
                      <span className="text-gray-700">
                        <span className="font-semibold text-gray-900">{formatIndianNumber(subscription.planId.credits?.includedCredits || subscription.planId.limits.maxTokens || 0)}</span> tokens included
                      </span>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        )}

        {/* Quick Links */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <Link
            to="/invoices"
            className="bg-white rounded-xl shadow-soft p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">View Invoices</h3>
                <p className="text-sm text-gray-500">Access your billing history and invoices</p>
              </div>
            </div>
          </Link>

          <Link
            to="/analytics"
            className="bg-white rounded-xl shadow-soft p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">View Analytics</h3>
                <p className="text-sm text-gray-500">Track usage and performance metrics</p>
              </div>
            </div>
          </Link>
        </div>
      </main>
    </div>
  );
}

export default SubscriptionPage;