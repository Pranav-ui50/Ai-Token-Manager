/**
 * Dashboard Page
 *
 * Main dashboard page after login with Red & White theme.
 * Dynamic data fetching for viewers and default users.
 */

import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';
import usePermissions from '../../hooks/usePermissions.js';
import { useOrganization } from '../../context/index.js';
import projectApi from '../../services/api/project.api.js';
import featureApi from '../../services/api/feature.api.js';
import planApi from '../../services/api/plan.api.js';
import simulationApi from '../../services/api/simulation.api.js';
import Loader from '../../components/common/Loader.jsx';

// Helper to extract numeric value from potentially nested object
const extractNumber = (value) => {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'object') {
    return value.total || value.count || 0;
  }
  return 0;
};

// Get status badge styles
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

// Get plan tier badge styles
const getPlanTierBadge = (tier) => {
  const styles = {
    free: 'bg-gray-100 text-gray-700',
    starter: 'bg-blue-100 text-blue-700',
    professional: 'bg-purple-100 text-purple-700',
    business: 'bg-yellow-100 text-yellow-700',
    enterprise: 'bg-[#DC2626]/10 text-[#DC2626]'
  };
  return styles[tier] || 'bg-gray-100 text-gray-700';
};

const DashboardPage = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { role } = usePermissions();
  const { currentOrganization, isLoading: orgLoading } = useOrganization();
  const [stats, setStats] = useState({
    projects: 0,
    features: 0,
    plans: 0,
    simulations: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Get organization ID from currentOrganization context or user object
  const organizationId = currentOrganization?._id || user?.organization?._id || user?.organization;

  // Get subscription data from organization
  const subscription = currentOrganization?.subscription || null;

  // Check if organization has a subscription (trial or active plan)
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
      // Capitalize first letter
      return subscription.plan.charAt(0).toUpperCase() + subscription.plan.slice(1);
    }
    if (subscription?.status === 'trial') {
      return 'Free Trial';
    }
    return null;
  };

  const planDisplayName = getPlanDisplayName();

  useEffect(() => {
    // Only fetch when we have an organization ID
    if (organizationId) {
      fetchDashboardData();
    } else if (!orgLoading && !organizationId) {
      // No organization - set empty stats
      setIsLoading(false);
    }
  }, [organizationId, orgLoading]);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      console.log('[Dashboard] Fetching data for organization:', organizationId);

      // Fetch all data in parallel using organization ID
      const [projectsRes, featuresRes, plansRes, simulationsRes] = await Promise.allSettled([
        // Projects - use organization-specific endpoint
        projectApi.getForOrganization(organizationId).catch(err => {
          console.error('[Dashboard] Projects fetch error:', err);
          return [];
        }),
        // Features - filter by organization
        featureApi.getAll({ limit: 100, organization: organizationId }).catch(err => {
          console.error('[Dashboard] Features fetch error:', err);
          return { data: { features: [], pagination: { total: 0 } } };
        }),
        // Plans - get public plans (available to all organizations)
        planApi.getPublic().catch(err => {
          console.error('[Dashboard] Plans fetch error:', err);
          return { data: { plans: [], pagination: { total: 0 } } };
        }),
        // Simulations - use organization-specific endpoint
        simulationApi.getForOrganization(organizationId).catch(err => {
          console.error('[Dashboard] Simulations fetch error:', err);
          return [];
        })
      ]);

      console.log('[Dashboard] API Responses:', { projectsRes, featuresRes, plansRes, simulationsRes });

      // Process projects - API returns array directly via response.data.data
      if (projectsRes.status === 'fulfilled') {
        const projectsData = projectsRes.value;
        // Handle case where response is an array directly
        const projectsList = Array.isArray(projectsData) ? projectsData : (projectsData?.data || projectsData?.projects || []);
        const count = Array.isArray(projectsData) ? projectsData.length : (projectsData?.total || projectsData?.count || projectsList.length);
        console.log('[Dashboard] Projects count:', count);
        setStats(prev => ({ ...prev, projects: count }));
      } else {
        console.error('[Dashboard] Projects failed:', projectsRes.reason);
      }

      // Process features - API returns axios response, response.data = { success: true, data: { features: [], pagination: {} } }
      if (featuresRes.status === 'fulfilled') {
        const featuresResponse = featuresRes.value;
        // Axios response: response.data = { success: true, data: {...} }
        const apiData = featuresResponse?.data; // { success: true, data: {...} }
        const innerData = apiData?.data || apiData || {}; // { features: [...], pagination: {...} }
        const featuresList = innerData.features || [];
        const pagination = innerData.pagination || {};
        const count = pagination.total || innerData.total || featuresList.length || 0;
        console.log('[Dashboard] Features count:', count, 'innerData:', innerData);
        setStats(prev => ({ ...prev, features: count }));
      } else {
        console.error('[Dashboard] Features failed:', featuresRes.reason);
      }

      // Process plans - API returns axios response from getPublic()
      if (plansRes.status === 'fulfilled') {
        const plansResponse = plansRes.value;
        // getPublic() returns { success: true, data: { plans: [...] } } or { plans: [...] }
        const apiData = plansResponse?.data; // { success: true, data: {...} } or { plans: [...] }
        let plansList = [];
        let count = 0;

        if (apiData?.success && apiData?.data?.plans) {
          // Format: { success: true, data: { plans: [...] } }
          plansList = apiData.data.plans;
          count = plansList.length;
        } else if (apiData?.plans) {
          // Format: { plans: [...] }
          plansList = apiData.plans;
          count = plansList.length;
        } else if (Array.isArray(apiData)) {
          // Format: [...]
          plansList = apiData;
          count = plansList.length;
        } else if (Array.isArray(plansResponse)) {
          // Direct array response
          plansList = plansResponse;
          count = plansList.length;
        }

        console.log('[Dashboard] Plans count:', count);
        setStats(prev => ({ ...prev, plans: count }));
      } else {
        console.error('[Dashboard] Plans failed:', plansRes.reason);
      }

      // Process simulations - API returns array directly
      if (simulationsRes.status === 'fulfilled') {
        const simulationsData = simulationsRes.value;
        // Handle case where response is an array directly
        const simulationsList = Array.isArray(simulationsData) ? simulationsData : (simulationsData?.data || simulationsData?.simulations || []);
        const count = Array.isArray(simulationsData) ? simulationsData.length : (simulationsData?.total || simulationsData?.count || simulationsList.length);
        console.log('[Dashboard] Simulations count:', count);
        setStats(prev => ({ ...prev, simulations: count }));
      } else {
        console.error('[Dashboard] Simulations failed:', simulationsRes.reason);
      }

    } catch (err) {
      console.error('[Dashboard] Failed to fetch dashboard data:', err);
      setError(err.response?.data?.error?.message || 'Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
  };

  // Show loading while fetching organization or dashboard data
  if (orgLoading || isLoading) {
    return <Loader fullPage text="Loading dashboard..." />;
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#DC2626] rounded-xl flex items-center justify-center shadow-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  API Token Manager
                </h1>
                <p className="text-xs text-gray-500">
                  SaaS Pricing Calculator
                </p>
              </div>
            </div>

            {/* User Info & Logout */}
            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-semibold text-gray-900">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-xs text-gray-500">{user?.email}</p>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-[#DC2626] to-[#B91C1C] rounded-2xl shadow-lg p-6 mb-8 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-2">
                Welcome back, {user?.firstName}!
              </h2>
              <p className="text-white/80">
                Your dashboard is ready. Start managing your API tokens and pricing.
              </p>
            </div>
            <div className="hidden md:block">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className={`grid gap-6 mb-8 ${role === 'viewer' ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'}`}>
          {/* Projects Card */}
          <Link to="/projects" className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">Projects</p>
                <p className="text-3xl font-bold text-gray-900">{stats.projects}</p>
              </div>
              <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-[#DC2626]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-gray-400">{stats.projects === 0 ? 'No projects yet' : 'View projects'}</span>
            </div>
          </Link>

          {/* Features Card */}
          <Link to="/features" className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">Features</p>
                <p className="text-3xl font-bold text-gray-900">{stats.features}</p>
              </div>
              <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-gray-400">{stats.features === 0 ? 'No features yet' : 'View features'}</span>
            </div>
          </Link>

          {/* Plans Card - Only for non-viewer roles */}
          {role !== 'viewer' && (
          <Link to="/plans" className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">Plans</p>
                <p className="text-3xl font-bold text-gray-900">{stats.plans}</p>
              </div>
              <div className="w-12 h-12 bg-yellow-50 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-gray-400">{stats.plans === 0 ? 'No plans yet' : 'View plans'}</span>
            </div>
          </Link>
          )}

          {/* Simulations Card */}
          <Link to="/simulations" className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">Simulations</p>
                <p className="text-3xl font-bold text-gray-900">{stats.simulations}</p>
              </div>
              <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-gray-400">{stats.simulations === 0 ? 'No simulations yet' : 'View simulations'}</span>
            </div>
          </Link>
        </div>

        {/* Current Plan Section - Only show if organization has a subscription */}
        {hasSubscription && planDisplayName && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Current Plan</h3>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(subscription?.status)}`}>
                {subscription?.status?.charAt(0).toUpperCase() + subscription?.status?.slice(1)}
              </span>
            </div>

            {/* Plan Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              {/* Plan Name */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#DC2626]/10 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-[#DC2626]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Plan</p>
                  <p className="text-base font-semibold text-gray-900">{planDisplayName}</p>
                </div>
              </div>

              {/* Billing Interval */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Billing</p>
                  <p className="text-base font-semibold text-gray-900">
                    {subscription?.billingCycle === 'yearly' ? 'Yearly' : 'Monthly'}
                  </p>
                </div>
              </div>

              {/* Started Date (for active) */}
              {subscription?.status === 'active' && subscription?.currentPeriodStart && (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-4 4M3 5v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Started</p>
                    <p className="text-base font-semibold text-gray-900">
                      {new Date(subscription.currentPeriodStart).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              )}

              {/* Trial End (for trial) */}
              {subscription?.status === 'trial' && subscription?.trialEndsAt && (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-yellow-50 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Trial Ends</p>
                    <p className="text-base font-semibold text-gray-900">
                      {new Date(subscription.trialEndsAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              )}

              {/* Renews Date (for active) */}
              {subscription?.status === 'active' && subscription?.currentPeriodEnd && (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Renews</p>
                    <p className="text-base font-semibold text-gray-900">
                      {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Plan Limits Section */}
            {subscription?.planId?.limits && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Plan Includes</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
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
                      <span className="font-semibold text-gray-900">{subscription.planId.limits.maxApiCalls ? subscription.planId.limits.maxApiCalls.toLocaleString() : 'Unlimited'}</span> API calls
                    </span>
                  </div>

                  {/* Tokens/Credits Limit */}
                  <div className="flex items-center gap-3 bg-gray-50 rounded-lg px-4 py-3">
                    <svg className="w-5 h-5 text-pink-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                    </svg>
                    <span className="text-gray-700">
                      <span className="font-semibold text-gray-900">{(subscription.planId.credits?.includedCredits || subscription.planId.limits.maxTokens || 0).toLocaleString()}</span> tokens included
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Getting Started - Only for non-viewer roles */}
        {role !== 'viewer' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">
            Getting Started
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Step 1 */}
            <button
              onClick={() => navigate('/providers')}
              className="group border border-gray-200 rounded-xl p-5 hover:border-[#DC2626] hover:shadow-md transition-all text-left"
            >
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-[#DC2626] transition-colors">
                  <span className="text-[#DC2626] font-bold group-hover:text-white">1</span>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">
                    Configure AI Providers
                  </h4>
                  <p className="text-sm text-gray-600">
                    Add AI providers (OpenAI, Anthropic, etc.) and configure their models and pricing.
                  </p>
                </div>
              </div>
            </button>

            {/* Step 2 */}
            <button
              onClick={() => navigate('/features')}
              className="group border border-gray-200 rounded-xl p-5 hover:border-[#DC2626] hover:shadow-md transition-all text-left"
            >
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-[#DC2626] transition-colors">
                  <span className="text-[#DC2626] font-bold group-hover:text-white">2</span>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">
                    Define Features
                  </h4>
                  <p className="text-sm text-gray-600">
                    Map your SaaS features to AI models and estimate token consumption.
                  </p>
                </div>
              </div>
            </button>

            {/* Step 3 */}
            <button
              onClick={() => navigate('/plans')}
              className="group border border-gray-200 rounded-xl p-5 hover:border-[#DC2626] hover:shadow-md transition-all text-left"
            >
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-[#DC2626] transition-colors">
                  <span className="text-[#DC2626] font-bold group-hover:text-white">3</span>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">
                    Build Subscription Plans
                  </h4>
                  <p className="text-sm text-gray-600">
                    Create subscription plans and calculate profitability based on your costs.
                  </p>
                </div>
              </div>
            </button>
          </div>
        </div>
        )}

        {/* Quick Actions - Only for non-viewer roles */}
        {role !== 'viewer' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">
            Quick Actions
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <button
              onClick={() => navigate('/projects')}
              className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-xl hover:bg-red-50 hover:text-[#DC2626] transition-colors text-left"
            >
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm">
                <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <span className="font-medium text-gray-700">New Project</span>
            </button>

            <button
              onClick={() => navigate('/providers')}
              className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-xl hover:bg-red-50 hover:text-[#DC2626] transition-colors text-left"
            >
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm">
                <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <span className="font-medium text-gray-700">Manage Providers</span>
            </button>

            <button
              onClick={() => navigate('/simulations')}
              className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-xl hover:bg-red-50 hover:text-[#DC2626] transition-colors text-left"
            >
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm">
                <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-5 8a4 4 0 01-4-4V5a2 2 0 012-2h14a2 2 0 012 2v8a4 4 0 01-4 4H7z" />
                </svg>
              </div>
              <span className="font-medium text-gray-700">Pricing Calculator</span>
            </button>

            <button
              onClick={() => navigate('/reports')}
              className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-xl hover:bg-red-50 hover:text-[#DC2626] transition-colors text-left"
            >
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm">
                <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m5 2v-2m5.618-4.574A9 9 0 0012 3a9 9 0 00-8.618 6.426M21 12a9 9 0 01-9 9m9-9H3m9 9a9 9 0 01-9-9" />
                </svg>
              </div>
              <span className="font-medium text-gray-700">View Reports</span>
            </button>
          </div>
        </div>
        )}
      </main>
    </div>
  );
};

export default DashboardPage;
