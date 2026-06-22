/**
 * Developer Dashboard
 *
 * Technical overview for DEVELOPER role with real API data.
 * Red & White theme styling.
 */

import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';
import { useOrganization } from '../../context/OrganizationContext.jsx';
import integrationApi from '../../services/api/integration.api.js';
import webhookApi from '../../services/api/webhook.api.js';
import analyticsApi from '../../services/api/analytics.api.js';
import Loader from '../../components/common/Loader.jsx';

// Helper to extract numeric value from potentially nested object
const extractNumber = (value) => {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'object') {
    return value.total || value.count || value.active || 0;
  }
  return 0;
};

function DeveloperDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const [stats, setStats] = useState({
    activeIntegrations: 0,
    totalWebhooks: 0,
    requestsToday: 0,
    errorRate: 0
  });
  const [integrations, setIntegrations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (currentOrganization) {
      fetchDashboardData();
    }
  }, [currentOrganization]);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch all data in parallel
      const [integrationsRes, webhooksRes, analyticsRes] = await Promise.allSettled([
        integrationApi.getForOrganization(),
        webhookApi.getForOrganization(),
        analyticsApi.getDashboard()
      ]);

      // Process integrations
      if (integrationsRes.status === 'fulfilled') {
        const intData = integrationsRes.value?.data || integrationsRes.value || {};
        const intList = intData.integrations || intData.data || intData || [];
        const intArray = Array.isArray(intList) ? intList : [];
        setIntegrations(intArray.slice(0, 6));

        // Count active/connected integrations
        const connectedCount = intArray.filter(i =>
          i.status === 'active' ||
          i.status === 'connected' ||
          i.isActive === true ||
          i.isActive === 'true'
        ).length;

        setStats(prev => ({
          ...prev,
          activeIntegrations: connectedCount || intArray.length
        }));

        console.log('[Dashboard] Integrations loaded:', intArray.length, 'Active:', connectedCount);
      } else {
        console.error('[Dashboard] Integrations fetch failed:', integrationsRes.reason);
      }

      // Process webhooks
      if (webhooksRes.status === 'fulfilled') {
        const webhookData = webhooksRes.value?.data || webhooksRes.value || {};
        const webhookList = webhookData.webhooks || webhookData.data || webhookData || [];
        const webhookArray = Array.isArray(webhookList) ? webhookList : [];

        setStats(prev => ({
          ...prev,
          totalWebhooks: webhookArray.length
        }));

        console.log('[Dashboard] Webhooks loaded:', webhookArray.length);
      } else {
        console.error('[Dashboard] Webhooks fetch failed:', webhooksRes.reason);
      }

      // Process analytics
      if (analyticsRes.status === 'fulfilled') {
        const analyticsData = analyticsRes.value?.data || analyticsRes.value || {};
        const summary = analyticsData?.summary || {};

        // Extract requests today from various possible data structures
        const requestsToday = extractNumber(
          summary.requestsToday ||
          summary.todayRequests ||
          summary.requestCount?.today ||
          analyticsData?.requestsToday ||
          analyticsData?.todayRequests ||
          0
        );

        // Extract error rate
        const errorRate = summary.errorRate ||
                          summary.errorPercentage ||
                          analyticsData?.errorRate ||
                          0;

        setStats(prev => ({
          ...prev,
          requestsToday: requestsToday,
          errorRate: typeof errorRate === 'number' ? errorRate : 0
        }));

        console.log('[Dashboard] Analytics loaded - Requests:', requestsToday, 'Error Rate:', errorRate);
      } else {
        console.error('[Dashboard] Analytics fetch failed:', analyticsRes.reason);
      }

    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
      setError(err.response?.data?.error?.message || 'Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  const formatNumber = (num) => {
    const numValue = typeof num === 'object' ? extractNumber(num) : num;
    if (!numValue && numValue !== 0) return '0';
    if (numValue >= 1000000) return `${(numValue / 1000000).toFixed(1)}M`;
    if (numValue >= 1000) return `${(numValue / 1000).toFixed(1)}K`;
    return numValue.toString();
  };

  const getStatusColor = (status) => {
    const statusStr = String(status || '').toLowerCase();
    if (statusStr === 'active' || statusStr === 'connected') {
      return 'bg-green-100 text-green-700';
    }
    if (statusStr === 'pending' || statusStr === 'pending_payment') {
      return 'bg-yellow-100 text-yellow-700';
    }
    if (statusStr === 'error' || statusStr === 'failed') {
      return 'bg-red-100 text-red-700';
    }
    return 'bg-gray-100 text-gray-700';
  };

  const getStatusLabel = (status, isActive) => {
    if (status) {
      const statusStr = String(status).toLowerCase();
      if (statusStr === 'active' || statusStr === 'connected') return 'Active';
      if (statusStr === 'pending') return 'Pending';
      if (statusStr === 'error' || statusStr === 'failed') return 'Error';
      return status.charAt(0).toUpperCase() + status.slice(1);
    }
    if (isActive === true || isActive === 'true') return 'Active';
    return 'Inactive';
  };

  // Get integration icon and color based on type/provider
  const getIntegrationStyle = (integration) => {
    const type = String(integration.type || integration.provider || integration.name || '').toLowerCase();

    // Define styles for different integration types
    const styles = {
      stripe: {
        bg: 'bg-gradient-to-br from-purple-500 to-purple-600',
        icon: (
          <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
            <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.514.858 6.09 1.631l.89-5.624C18.252.979 15.694 0 12.548 0 9.14 0 6.38 1.839 6.38 5.014c0 2.9 1.82 4.247 4.576 5.211 2.481.87 3.456 1.476 3.456 2.441 0 .907-.852 1.461-2.354 1.461-1.893 0-4.552-.874-6.288-1.972L4.82 18.47C6.54 19.545 9.506 20.4 12.704 20.4c3.84 0 6.512-1.867 6.512-5.307 0-2.814-1.72-4.277-4.52-5.293l-.72-.654z"/>
          </svg>
        ),
        textColor: 'text-white'
      },
      openai: {
        bg: 'bg-gradient-to-br from-emerald-500 to-teal-600',
        icon: (
          <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
            <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.046 6.046 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.773-4.205 5.989 5.989 0 0 0 3.998-2.9 6.056 6.056 0 0 0-.749-7.074zM13.26 22.43a4.44 4.44 0 0 1-2.87-1.04l.14-.08 4.52-2.61a.75.75 0 0 0 .37-.65v-6.36l1.92 1.11a.14.14 0 0 1 .07.12v5.23a4.44 4.44 0 0 1-4.15 4.21zm-9.16-3.88a4.44 4.44 0 0 1-.53-3.01l.14.08 4.52 2.61a.75.75 0 0 0 .74 0l5.52-3.18v2.22a.14.14 0 0 1-.05.12l-4.57 2.64a4.44 4.44 0 0 1-5.77-1.48zM2.5 9.87a4.44 4.44 0 0 1 2.34-2.5v5.36a.72.72 0 0 0 .37.65l5.52 3.18-1.92 1.11a.14.14 0 0 1-.14 0l-4.57-2.64A4.44 4.44 0 0 1 2.5 9.87zm15.54-.88l-5.52-3.18 1.92-1.11a.14.14 0 0 1 .14 0l4.57 2.64a4.44 4.44 0 0 1-1.11 7.51V9.64a.75.75 0 0 0-.37-.65zm2.34-1.04l-.14-.08-4.52-2.61a.75.75 0 0 0-.74 0l-5.52 3.18V7.04a.14.14 0 0 1 .05-.12l4.57-2.64a4.44 4.44 0 0 1 6.43 5.67z"/>
          </svg>
        ),
        textColor: 'text-white'
      },
      github: {
        bg: 'bg-gradient-to-br from-gray-700 to-gray-900',
        icon: (
          <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
          </svg>
        ),
        textColor: 'text-white'
      },
      slack: {
        bg: 'bg-gradient-to-br from-purple-600 to-pink-500',
        icon: (
          <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
            <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.527 2.527 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521-2.521 2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H8.834V6.313zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.695 8.834a2.528 2.528 0 0 1-2.521 2.521 2.528 2.528 0 0 1-2.521-2.521V2.522A2.528 2.528 0 0 1 15.174 0a2.528 2.528 0 0 1 2.521 2.522v6.312zM15.174 18.956a2.528 2.528 0 0 1 2.521 2.522A2.528 2.528 0 0 1 15.174 24a2.528 2.528 0 0 1-2.521-2.522v-2.522h2.521zM15.174 17.695a2.528 2.528 0 0 1-2.521-2.521 2.528 2.528 0 0 1 2.521-2.521h6.313A2.528 2.528 0 0 1 24 15.174a2.528 2.528 0 0 1-2.522 2.521h-6.304z"/>
          </svg>
        ),
        textColor: 'text-white'
      },
      aws: {
        bg: 'bg-gradient-to-br from-orange-400 to-orange-600',
        icon: (
          <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6.763 10.036c0 .296.032.535.088.71.064.176.144.363.262.563.04.063.056.127.056.183 0 .08-.04.151-.12.207l-.395.263a.286.286 0 0 1-.167.056.259.259 0 0 1-.19-.096 2.04 2.04 0 0 1-.233-.295 5.04 5.04 0 0 1-.2-.395c-.4.47-.9.702-1.5.702-.429 0-.77-.12-1.027-.363-.257-.244-.383-.568-.383-.975 0-.432.152-.782.463-1.05.31-.267.725-.4 1.242-.4.168 0 .344.016.52.04.176.024.364.064.564.112v-.359c0-.375-.072-.639-.216-.783-.144-.144-.399-.216-.763-.216-.167 0-.343.016-.52.056-.175.04-.359.096-.55.167a.623.623 0 0 1-.168.056.24.24 0 0 1-.207-.12.402.402 0 0 1-.072-.207l-.096-.295a.438.438 0 0 1 .064-.216.46.46 0 0 1 .176-.16c.2-.112.44-.2.72-.263a4.09 4.09 0 0 1 .927-.096c.47 0 .838.088 1.11.263.272.176.47.4.59.675.12.275.176.623.176 1.039v1.47h.016zm-1.718.983c.168 0 .335-.032.51-.096a1.06 1.06 0 0 0 .447-.311.877.877 0 0 0 .192-.6v-.247c-.152-.04-.311-.072-.47-.088a3.7 3.7 0 0 0-.47-.024c-.327 0-.566.064-.726.2-.16.136-.232.327-.232.566 0 .224.056.391.176.503.12.112.287.168.511.168l.062-.071zm5.336 1.242a.322.322 0 0 1-.215-.056.462.462 0 0 1-.128-.176l-1.49-4.963a.864.864 0 0 1-.056-.192.233.233 0 0 1 .216-.247h.63c.088 0 .152.016.192.048.04.032.072.088.096.168l1.07 4.19.99-4.19a.36.36 0 0 1 .096-.168.303.303 0 0 1 .2-.048h.527c.088 0 .152.016.192.048.04.032.08.088.096.168l.998 4.19 1.078-4.19a.36.36 0 0 1 .096-.168.303.303 0 0 1 .2-.048h.599a.233.233 0 0 1 .216.247.864.864 0 0 1-.056.192l-1.49 4.963a.462.462 0 0 1-.128.176.322.322 0 0 1-.215.056h-.55a.303.303 0 0 1-.2-.048.36.36 0 0 1-.096-.176l-.982-4.142-.982 4.142a.36.36 0 0 1-.096.176.303.303 0 0 1-.2.048h-.55zm7.06.12a.624.624 0 0 1-.399-.12.75.75 0 0 1-.216-.287l-1.901-4.476c-.04-.096-.064-.16-.064-.2a.24.24 0 0 1 .08-.176.28.28 0 0 1 .192-.08h.591c.12 0 .2.032.248.088.048.056.096.12.128.2l1.342 3.248 1.342-3.248a.46.46 0 0 1 .128-.2c.048-.056.128-.088.248-.088h.59a.28.28 0 0 1 .192.08.24.24 0 0 1 .08.176c0 .04-.024.104-.064.2l-1.9 4.476a.75.75 0 0 1-.216.287.624.624 0 0 1-.399.12h-.575z"/>
          </svg>
        ),
        textColor: 'text-white'
      },
      google: {
        bg: 'bg-gradient-to-br from-blue-500 to-blue-600',
        icon: (
          <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.05H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.95l2.85-2.22.81-.64z"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.05l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
        ),
        textColor: 'text-white'
      }
    };

    // Check if we have a matching style
    for (const [key, style] of Object.entries(styles)) {
      if (type.includes(key)) {
        return style;
      }
    }

    // Default style - use first letter with gradient background
    const colors = [
      'bg-gradient-to-br from-red-500 to-pink-500',
      'bg-gradient-to-br from-blue-500 to-cyan-500',
      'bg-gradient-to-br from-green-500 to-emerald-500',
      'bg-gradient-to-br from-purple-500 to-indigo-500',
      'bg-gradient-to-br from-orange-500 to-amber-500',
      'bg-gradient-to-br from-teal-500 to-cyan-500'
    ];

    const name = integration.name || integration.type || integration.provider || 'Integration';
    const colorIndex = name.charCodeAt(0) % colors.length;

    return {
      bg: colors[colorIndex],
      icon: (
        <span className="text-lg font-bold text-white">
          {name.charAt(0).toUpperCase()}
        </span>
      ),
      textColor: 'text-white'
    };
  };

  const formatDate = (date) => {
    if (!date) return '-';
    try {
      return new Date(date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return '-';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Loader text="Loading dashboard..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
        {error}
        <button onClick={fetchDashboardData} className="ml-4 text-red-800 hover:text-red-900 underline">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Developer Dashboard</h1>
          <p className="text-sm text-gray-500">Integrations, webhooks, and usage analytics</p>
        </div>
        <button
          onClick={fetchDashboardData}
          className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Link to="/integrations" className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-50 rounded-xl flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-xs text-gray-500 truncate">Integrations</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 truncate">{stats.activeIntegrations}</p>
            </div>
          </div>
        </Link>

        <Link to="/webhooks" className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-xs text-gray-500 truncate">Webhooks</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 truncate">{stats.totalWebhooks}</p>
            </div>
          </div>
        </Link>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-5">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-yellow-50 rounded-xl flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-xs text-gray-500 truncate">Requests Today</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 truncate">{formatNumber(stats.requestsToday)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-5">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-50 rounded-xl flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-xs text-gray-500 truncate">Error Rate</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 truncate">{stats.errorRate}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Integrations */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Connected Integrations</h2>
          <button
            onClick={() => navigate('/integrations')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#DC2626] text-white font-medium rounded-lg hover:bg-[#B91C1C] transition-colors text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Integration
          </button>
        </div>
        {integrations.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {integrations.map((integration) => {
              const style = getIntegrationStyle(integration);
              return (
                <div key={integration._id || integration.id} className="group relative overflow-hidden rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-100">
                  {/* Gradient Header */}
                  <div className={`${style.bg} p-4 text-white`}>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center shadow-inner">
                        {style.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-white truncate text-lg">
                          {integration.name || integration.type || integration.provider || 'Integration'}
                        </p>
                        <p className="text-white/80 text-sm capitalize">
                          {integration.type || integration.provider || 'Service'}
                        </p>
                      </div>
                    </div>
                  </div>
                  {/* Content */}
                  <div className="p-4 bg-white">
                    <div className="flex items-center justify-between mb-3">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                        (integration.status === 'active' || integration.status === 'connected' || integration.isActive)
                          ? 'bg-green-100 text-green-700'
                          : integration.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        <span className={`w-2 h-2 rounded-full mr-1.5 ${
                          (integration.status === 'active' || integration.status === 'connected' || integration.isActive)
                            ? 'bg-green-500'
                            : integration.status === 'pending'
                            ? 'bg-yellow-500'
                            : 'bg-gray-400'
                        }`}></span>
                        {getStatusLabel(integration.status, integration.isActive)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-1.5 text-gray-600">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        <span className="font-medium">{formatNumber(integration.requestCount || integration.requests || 0)}</span>
                        <span className="text-gray-400">requests</span>
                      </div>
                      <div className="flex items-center gap-1 text-gray-400 text-xs">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 9h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {formatDate(integration.lastSync || integration.lastSyncedAt || integration.updatedAt)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            No integrations yet. <Link to="/integrations" className="text-[#DC2626] hover:underline">Add one</Link>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <button
            onClick={() => navigate('/integrations')}
            className="p-4 bg-gray-50 rounded-xl hover:bg-red-50 hover:border-red-200 border border-gray-100 transition-all text-left"
          >
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm mb-3">
              <svg className="w-5 h-5 text-[#DC2626]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
              </svg>
            </div>
            <p className="font-medium text-gray-900">Integrations</p>
            <p className="text-xs text-gray-500 mt-1">Manage connections</p>
          </button>

          <button
            onClick={() => navigate('/webhooks')}
            className="p-4 bg-gray-50 rounded-xl hover:bg-red-50 hover:border-red-200 border border-gray-100 transition-all text-left"
          >
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm mb-3">
              <svg className="w-5 h-5 text-[#DC2626]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            </div>
            <p className="font-medium text-gray-900">Webhooks</p>
            <p className="text-xs text-gray-500 mt-1">Configure webhooks</p>
          </button>

          <button
            onClick={() => navigate('/usage')}
            className="p-4 bg-gray-50 rounded-xl hover:bg-red-50 hover:border-red-200 border border-gray-100 transition-all text-left"
          >
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm mb-3">
              <svg className="w-5 h-5 text-[#DC2626]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
              </svg>
            </div>
            <p className="font-medium text-gray-900">Usage Stats</p>
            <p className="text-xs text-gray-500 mt-1">View detailed metrics</p>
          </button>

          <button
            onClick={() => navigate('/audit-logs')}
            className="p-4 bg-gray-50 rounded-xl hover:bg-red-50 hover:border-red-200 border border-gray-100 transition-all text-left"
          >
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm mb-3">
              <svg className="w-5 h-5 text-[#DC2626]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
            </div>
            <p className="font-medium text-gray-900">Audit Logs</p>
            <p className="text-xs text-gray-500 mt-1">View activity logs</p>
          </button>
        </div>
      </div>
    </div>
  );
}

export default DeveloperDashboard;