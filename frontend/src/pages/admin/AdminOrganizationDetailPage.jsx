/**
 * Admin Organization Detail Page
 *
 * Super admin page for viewing and managing a single organization.
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Loader from '../../components/common/Loader.jsx';
import adminApi from '../../services/api/admin.api.js';
import { getCurrencySymbol } from '../../utils/currency.js';

function AdminOrganizationDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [organization, setOrganization] = useState(null);
  const [projects, setProjects] = useState([]);
  const [features, setFeatures] = useState([]);
  const [stats, setStats] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  // Fetch organization details
  useEffect(() => {
    const fetchOrganization = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await adminApi.getOrganizationById(id);
        setOrganization(response.organization);
        setProjects(response.projects || []);
        setFeatures(response.features || []);
        setStats(response.stats || {});
      } catch (err) {
        console.error('Failed to fetch organization:', err);
        setError(err.response?.data?.error?.message || 'Failed to load organization');
      } finally {
        setIsLoading(false);
      }
    };

    if (id) {
      fetchOrganization();
    }
  }, [id]);

  // Update organization status
  const handleUpdateStatus = async (newStatus) => {
    try {
      await adminApi.updateOrganizationStatus(id, newStatus);
      setOrganization(prev => ({
        ...prev,
        subscription: { ...prev.subscription, status: newStatus },
        isActive: newStatus !== 'suspended'
      }));
    } catch (err) {
      console.error('Failed to update status:', err);
      setError(err.response?.data?.error?.message || 'Failed to update status');
    }
  };

  // Update organization plan
  const handleUpdatePlan = async (newPlan) => {
    try {
      await adminApi.updateOrganizationPlan(id, newPlan);
      setOrganization(prev => ({
        ...prev,
        subscription: { ...prev.subscription, plan: newPlan }
      }));
    } catch (err) {
      console.error('Failed to update plan:', err);
      setError(err.response?.data?.error?.message || 'Failed to update plan');
    }
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount, currency = 'INR') => {
    if (!amount && amount !== 0) return `${getCurrencySymbol(currency)}0.00`;
    const symbol = getCurrencySymbol(currency);
    return `${symbol}${amount.toFixed(2)}`;
  };

  const formatNumber = (num) => {
    if (!num) return '0';
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const getStatusBadge = (status) => {
    const colors = {
      active: 'bg-green-100 text-green-700',
      trial: 'bg-yellow-100 text-yellow-700',
      pending_payment: 'bg-blue-100 text-blue-700',
      past_due: 'bg-orange-100 text-orange-700',
      expired: 'bg-red-100 text-red-700',
      cancelled: 'bg-gray-100 text-gray-700'
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  const getPlanBadge = (plan) => {
    const colors = {
      starter: 'bg-blue-100 text-blue-700',
      professional: 'bg-purple-100 text-purple-700',
      business: 'bg-amber-100 text-amber-700'
    };
    return colors[plan] || 'bg-gray-100 text-gray-700';
  };

  // Available plans (excluding free and enterprise)
  const AVAILABLE_PLANS = [
    { value: 'starter', label: 'Starter' },
    { value: 'professional', label: 'Professional' },
    { value: 'business', label: 'Business' }
  ];

  // Subscription status options matching Organization schema
  const SUBSCRIPTION_STATUSES = [
    { value: 'trial', label: 'Trial' },
    { value: 'active', label: 'Active' },
    { value: 'pending_payment', label: 'Pending Payment' },
    { value: 'past_due', label: 'Past Due' },
    { value: 'expired', label: 'Expired' },
    { value: 'cancelled', label: 'Cancelled' }
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Loader />
      </div>
    );
  }

  if (error && !organization) {
    return (
      <div className="text-center py-12">
        <svg className="mx-auto h-12 w-12 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900">Error loading organization</h3>
        <p className="mt-1 text-sm text-gray-500">{error}</p>
        <button
          onClick={() => navigate('/admin/organizations')}
          className="mt-4 px-4 py-2 bg-[#DC2626] text-white rounded-lg hover:bg-[#B91C1C]"
        >
          Back to Organizations
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            to="/admin/organizations"
            className="text-gray-500 hover:text-gray-700"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{organization?.name}</h1>
            <p className="text-sm text-gray-500">{organization?.slug}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={organization?.subscription?.status || 'trial'}
            onChange={(e) => handleUpdateStatus(e.target.value)}
            className={`px-3 py-2 rounded-lg border border-gray-200 ${getStatusBadge(organization?.subscription?.status)}`}
          >
            {SUBSCRIPTION_STATUSES.map(status => (
              <option key={status.value} value={status.value}>{status.label}</option>
            ))}
          </select>
          <select
            value={organization?.subscription?.plan || 'starter'}
            onChange={(e) => handleUpdatePlan(e.target.value)}
            className={`px-3 py-2 rounded-lg border border-gray-200 ${getPlanBadge(organization?.subscription?.plan)}`}
          >
            {AVAILABLE_PLANS.map(plan => (
              <option key={plan.value} value={plan.value}>{plan.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-sm text-gray-500">Members</p>
          <p className="text-2xl font-bold text-gray-900">{stats.totalMembers || organization?.members?.length || 0}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-sm text-gray-500">Projects</p>
          <p className="text-2xl font-bold text-gray-900">{stats.totalProjects || projects.length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-sm text-gray-500">Features</p>
          <p className="text-2xl font-bold text-gray-900">{stats.totalFeatures || features.length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-sm text-gray-500">Tokens Used</p>
          <p className="text-2xl font-bold text-gray-900">{formatNumber(stats.totalTokens || 0)}</p>
        </div>
      </div>

      {/* Additional Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-sm text-gray-500">Total Requests</p>
          <p className="text-xl font-bold text-gray-900">{formatNumber(stats.totalRequests || 0)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-sm text-gray-500">Total Cost</p>
          <p className="text-xl font-bold text-gray-900">{formatCurrency(stats.totalCost || 0)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-sm text-gray-500">Created</p>
          <p className="text-xl font-bold text-gray-900">{formatDate(organization?.createdAt)}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-8">
          {['overview', 'members', 'projects', 'features'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-4 px-1 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-[#DC2626] text-[#DC2626]'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Organization Info */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Organization Details</h2>
            <dl className="space-y-3">
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Name</dt>
                <dd className="text-sm font-medium text-gray-900">{organization?.name}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Slug</dt>
                <dd className="text-sm font-medium text-gray-900">{organization?.slug}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Description</dt>
                <dd className="text-sm font-medium text-gray-900">{organization?.description || 'N/A'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Industry</dt>
                <dd className="text-sm font-medium text-gray-900">{organization?.industry || 'N/A'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Website</dt>
                <dd className="text-sm font-medium text-gray-900">{organization?.website || 'N/A'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Plan</dt>
                <dd>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${getPlanBadge(organization?.subscription?.plan)}`}>
                    {organization?.subscription?.plan || 'starter'}
                  </span>
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Status</dt>
                <dd>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusBadge(organization?.subscription?.status)}`}>
                    {organization?.subscription?.status || 'active'}
                  </span>
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Created</dt>
                <dd className="text-sm font-medium text-gray-900">{formatDate(organization?.createdAt)}</dd>
              </div>
            </dl>
          </div>

          {/* Owner Info */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Owner</h2>
            {organization?.owner ? (
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-[#DC2626] to-[#B91C1C] rounded-full flex items-center justify-center">
                  <span className="text-lg font-bold text-white">
                    {organization.owner.firstName?.charAt(0) || 'O'}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-gray-900">
                    {organization.owner.firstName} {organization.owner.lastName}
                  </p>
                  <p className="text-sm text-gray-500">{organization.owner.email}</p>
                  <p className="text-xs text-gray-400">Member since {formatDate(organization.owner.createdAt)}</p>
                </div>
              </div>
            ) : (
              <p className="text-gray-500">No owner assigned</p>
            )}
          </div>
        </div>
      )}

      {activeTab === 'members' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Member</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Joined</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {organization?.members?.length > 0 ? (
                organization.members.map((member, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center mr-3">
                          <span className="text-sm font-medium text-gray-600">
                            {member.user?.firstName?.charAt(0) || '?'}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {member.user?.firstName} {member.user?.lastName}
                          </p>
                          <p className="text-xs text-gray-500">{member.user?.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs rounded bg-blue-100 text-blue-700">
                        {member.role?.name || 'Member'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(member.joinedAt)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="3" className="px-6 py-4 text-center text-gray-500">
                    No members found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'projects' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Project</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {projects.length > 0 ? (
                projects.map((project) => (
                  <tr key={project._id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{project.name}</p>
                        <p className="text-xs text-gray-500">{project.slug}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded ${
                        project.status === 'active' ? 'bg-green-100 text-green-700' :
                        project.status === 'inactive' ? 'bg-gray-100 text-gray-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {project.status || 'active'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(project.createdAt)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="3" className="px-6 py-4 text-center text-gray-500">
                    No projects found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'features' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Feature</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Model</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tokens</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cost</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {features.length > 0 ? (
                features.map((feature) => (
                  <tr key={feature._id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{feature.name}</p>
                        <p className="text-xs text-gray-500">{feature.category}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {feature.model?.displayName || feature.model?.name || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded ${
                        feature.status === 'active' ? 'bg-green-100 text-green-700' :
                        feature.status === 'inactive' ? 'bg-gray-100 text-gray-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {feature.status || 'active'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatNumber(feature.stats?.totalTokens || 0)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatCurrency(feature.stats?.totalCost || 0)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="px-6 py-4 text-center text-gray-500">
                    No features found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default AdminOrganizationDetailPage;