/**
 * Dashboard Page
 *
 * Main dashboard page after login with Red & White theme.
 * Dynamic data fetching for viewers and default users.
 */

import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';
import projectApi from '../../services/api/project.api.js';
import featureApi from '../../services/api/feature.api.js';
import planApi from '../../services/api/plan.api.js';
import simulationApi from '../../services/api/simulation.api.js';

// Helper to extract numeric value from potentially nested object
const extractNumber = (value) => {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'object') {
    return value.total || value.count || 0;
  }
  return 0;
};

const DashboardPage = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [stats, setStats] = useState({
    projects: 0,
    features: 0,
    plans: 0,
    simulations: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch all data in parallel
      const [projectsRes, featuresRes, plansRes, simulationsRes] = await Promise.allSettled([
        projectApi.getForOrganization?.(user?.organization?._id || user?.organization) || projectApi.getAll?.(),
        featureApi.getAll({ limit: 1 }),
        planApi.getAll({ limit: 1 }),
        simulationApi.getAll?.({ limit: 1 }) || Promise.resolve({ status: 'fulfilled', value: {} })
      ]);

      // Process projects
      if (projectsRes.status === 'fulfilled') {
        const projectsData = projectsRes.value?.data || projectsRes.value || {};
        const projectsList = projectsData.projects || projectsData.data || [];
        setStats(prev => ({
          ...prev,
          projects: projectsData.total || projectsData.count || (Array.isArray(projectsList) ? projectsList.length : 0)
        }));
      }

      // Process features
      if (featuresRes.status === 'fulfilled') {
        const featuresData = featuresRes.value?.data || featuresRes.value || {};
        const featuresList = featuresData.features || featuresData.data || [];
        setStats(prev => ({
          ...prev,
          features: featuresData.total || featuresData.count || (Array.isArray(featuresList) ? featuresList.length : 0)
        }));
      }

      // Process plans
      if (plansRes.status === 'fulfilled') {
        const plansData = plansRes.value?.data || plansRes.value || {};
        const plansList = plansData.plans || plansData.data || [];
        setStats(prev => ({
          ...prev,
          plans: plansData.total || plansData.count || (Array.isArray(plansList) ? plansList.length : 0)
        }));
      }

      // Process simulations
      if (simulationsRes.status === 'fulfilled') {
        const simulationsData = simulationsRes.value?.data || simulationsRes.value || {};
        const simulationsList = simulationsData.simulations || simulationsData.data || [];
        setStats(prev => ({
          ...prev,
          simulations: simulationsData.total || simulationsData.count || (Array.isArray(simulationsList) ? simulationsList.length : 0)
        }));
      }

    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
      setError(err.response?.data?.error?.message || 'Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <div className="text-center">
          <svg className="animate-spin h-10 w-10 text-[#DC2626] mx-auto" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="mt-4 text-gray-500">Loading dashboard...</p>
        </div>
      </div>
    );
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
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
              <span className="text-gray-400">{stats.projects === 0 ? 'No projects yet' : 'Manage projects'}</span>
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

          {/* Plans Card */}
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

          {/* Simulations Card */}
          <Link to="/simulations" className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">Simulations</p>
                <p className="text-3xl font-bold text-gray-900">{stats.simulations}</p>
              </div>
              <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className="text-gray-400">{stats.simulations === 0 ? 'No simulations yet' : 'View simulations'}</span>
            </div>
          </Link>
        </div>

        {/* Getting Started */}
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

        {/* Quick Actions */}
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
      </main>
    </div>
  );
};

export default DashboardPage;