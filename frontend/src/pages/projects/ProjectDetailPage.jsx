/**
 * Project Detail Page
 *
 * Detailed view of a single project with statistics and features.
 * Red & White theme styling.
 */

import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link as RouterLink } from 'react-router-dom';
import Modal from '../../components/common/Modal.jsx';
import Loader from '../../components/common/Loader.jsx';
import projectApi from '../../services/api/project.api.js';
import featureApi from '../../services/api/feature.api.js';
import modelApi from '../../services/api/model.api.js';
import providerApi from '../../services/api/provider.api.js';
import { useOrganization } from '../../context/OrganizationContext.jsx';
import { useProjectCurrency } from '../../hooks/useProjectCurrency.js';
import { getCurrencySymbol, formatCurrencyWithSymbol, getCurrencyLabel } from '../../utils/currency.js';

function ProjectDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentOrganization } = useOrganization();
  const { currency, currencySymbol } = useProjectCurrency();
  const [project, setProject] = useState(null);
  const [stats, setStats] = useState(null);
  const [features, setFeatures] = useState([]);
  const [featuresLoading, setFeaturesLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showFeatureModal, setShowFeatureModal] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const statusDropdownRef = useRef(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    settings: {
      currency: 'USD',
      timezone: 'UTC',
      infrastructureCostPerMonth: 0
    }
  });

  // Feature form state
  const [featureForm, setFeatureForm] = useState({
    name: '',
    description: '',
    category: 'other',
    status: 'active',
    model: '',
    provider: '',
    // Token estimates
    inputTokensPerRequest: 0,
    outputTokensPerRequest: 0,
    calculationMethod: 'fixed',
    dynamicMultiplier: 1,
    // Infrastructure costs
    fixedCostPerRequest: 0,
    overheadPercentage: 0,
    monthlyFixedCost: 0,
    infrastructureType: 'serverless',
    // Limits
    maxRequestsPerUser: '',
    maxTokensPerUser: '',
    maxRequestsPerMonth: '',
    // Settings
    enabled: true,
    requiresAuth: true,
    cacheEnabled: false,
    cacheTTL: 3600
  });

  // Available models and providers (would come from API in real app)
  const [models, setModels] = useState([]);
  const [providers, setProviders] = useState([]);
  const [filteredModels, setFilteredModels] = useState([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [modelsSource, setModelsSource] = useState(null); // 'api', 'database', or 'hybrid'

  useEffect(() => {
    fetchProject();
    fetchFeatures();
  }, [id]);

  // Fetch models and providers when modal opens
  useEffect(() => {
    if (showFeatureModal) {
      const fetchModelsAndProviders = async () => {
        try {
          const [modelsRes, providersRes] = await Promise.all([
            modelApi.getAll({ limit: 200, activeOnly: false }),  // Increased limit to get ALL models
            providerApi.getAll({ limit: 100, activeOnly: false })
          ]);


          if (modelsRes.data) {
            setModels(modelsRes.data);
          } else if (Array.isArray(modelsRes)) {
            setModels(modelsRes);
          }
          if (providersRes.providers) {
            setProviders(providersRes.providers);
          } else if (Array.isArray(providersRes)) {
            setProviders(providersRes);
          }
        } catch (err) {
          console.error('Failed to fetch models/providers:', err);
        }
      };
      fetchModelsAndProviders();
    }
  }, [showFeatureModal]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target)) {
        setShowStatusDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const fetchProject = async () => {
    setIsLoading(true);
    setError('');
    try {
      const [projectData, statsData] = await Promise.all([
        projectApi.getById(id),
        projectApi.getStats(id)
      ]);
      setProject(projectData);
      setStats(statsData);
      setFormData({
        name: projectData.name,
        description: projectData.description || '',
        settings: {
          currency: projectData.settings?.currency || 'USD',
          timezone: projectData.settings?.timezone || 'UTC',
          infrastructureCostPerMonth: projectData.settings?.infrastructureCostPerMonth || 0
        }
      });
    } catch (err) {
      console.error('Failed to fetch project:', err);
      setError(err.response?.data?.error?.message || err.response?.data?.message || 'Failed to load project');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchFeatures = async () => {
    setFeaturesLoading(true);
    try {
      const response = await featureApi.getByProject(id);
      // Response structure: { success: true, data: { features: [...], pagination: {...} } }
      if (response.success && response.data) {
        setFeatures(response.data.features || []);
      } else {
        setFeatures([]);
      }
    } catch (err) {
      console.error('Failed to fetch features:', err);
      setFeatures([]);
    } finally {
      setFeaturesLoading(false);
    }
  };

  const handleUpdateProject = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim()) {
      setError('Project name is required');
      return;
    }

    try {
      const updatedProject = await projectApi.update(id, formData);
      setProject(updatedProject);
      setShowEditModal(false);
      setSuccess('Project updated successfully');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update project');
    }
  };

  const handleDeleteProject = async () => {
    try {
      await projectApi.delete(id);
      navigate('/projects', { state: { message: 'Project deleted successfully' } });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete project');
      setShowDeleteModal(false);
    }
  };

  const handleToggleStatus = async () => {
    try {
      if (project.isActive === false) {
        await projectApi.restore(id);
        setProject({ ...project, isActive: true });
        setSuccess('Project activated successfully');
      } else {
        await projectApi.archive(id);
        setProject({ ...project, isActive: false });
        setSuccess('Project deactivated successfully');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update project status');
    }
  };

  const formatCurrency = (amount) => {
    return formatCurrencyWithSymbol(amount, currency);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <svg className="animate-spin h-10 w-10 text-[#DC2626] mx-auto" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="mt-4 text-gray-500">Loading project...</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center min-h-96">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-[#DC2626]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Project Not Found</h2>
          <p className="text-gray-500 mb-4">The project you're looking for doesn't exist or you don't have access to it.</p>
          <RouterLink
            to="/projects"
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#DC2626] text-white font-medium rounded-lg hover:bg-[#B91C1C] transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Back to Projects</span>
          </RouterLink>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <RouterLink
            to="/projects"
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </RouterLink>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                project.isActive !== false ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
              }`}>
                {project.isActive !== false ? 'Active' : 'Inactive'}
              </span>
            </div>
            <p className="text-sm text-gray-500">{project.description || 'No description'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Status Dropdown */}
          <div className="relative" ref={statusDropdownRef}>
            <button
              onClick={() => setShowStatusDropdown(!showStatusDropdown)}
              className={`inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                project.isActive !== false
                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${project.isActive !== false ? 'bg-green-500' : 'bg-gray-400'}`}></span>
              <span>{project.isActive !== false ? 'Active' : 'Inactive'}</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {showStatusDropdown && (
              <div className="absolute right-0 mt-2 w-40 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                <button
                  onClick={() => {
                    if (project.isActive === false) {
                      handleToggleStatus();
                    }
                    setShowStatusDropdown(false);
                  }}
                  className={`w-full text-left px-4 py-2 text-sm flex items-center gap-2 hover:bg-gray-50 ${
                    project.isActive !== false ? 'bg-gray-50' : ''
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-green-500"></span>
                  Active
                  {project.isActive !== false && (
                    <svg className="w-4 h-4 ml-auto text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
                <button
                  onClick={() => {
                    if (project.isActive !== false) {
                      handleToggleStatus();
                    }
                    setShowStatusDropdown(false);
                  }}
                  className={`w-full text-left px-4 py-2 text-sm flex items-center gap-2 hover:bg-gray-50 ${
                    project.isActive === false ? 'bg-gray-50' : ''
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-gray-400"></span>
                  Inactive
                  {project.isActive === false && (
                    <svg className="w-4 h-4 ml-auto text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              </div>
            )}
          </div>
          <button
            onClick={() => setShowEditModal(true)}
            className="inline-flex items-center gap-2 px-3 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            <span>Edit</span>
          </button>
          <button
            onClick={() => setShowDeleteModal(true)}
            className="inline-flex items-center gap-2 px-3 py-2 text-red-700 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            <span>Delete</span>
          </button>
        </div>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm">{error}</span>
          </div>
          <button onClick={() => setError('')} className="text-red-600 hover:text-red-800">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-sm">{success}</span>
          </div>
          <button onClick={() => setSuccess('')} className="text-green-600 hover:text-green-800">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-gray-500">Total Features</p>
              <p className="text-xl font-bold text-gray-900">{stats?.totalFeatures || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-gray-500">Active Features</p>
              <p className="text-xl font-bold text-gray-900">{stats?.activeFeatures || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-50 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-gray-500">Monthly Cost</p>
              <p className="text-xl font-bold text-gray-900">
                {formatCurrency(project.settings?.infrastructureCostPerMonth || 0, project.settings?.currency)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-gray-500">Created</p>
              <p className="text-xl font-bold text-gray-900">{formatDate(project.createdAt)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Project Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Settings Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Project Settings</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-sm text-gray-500">Currency</span>
              <span className="text-sm font-medium text-gray-900">{project.settings?.currency || 'USD'}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-sm text-gray-500">Timezone</span>
              <span className="text-sm font-medium text-gray-900">{project.settings?.timezone || 'UTC'}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-sm text-gray-500">Infrastructure Cost</span>
              <span className="text-sm font-medium text-gray-900">
                {formatCurrency(project.settings?.infrastructureCostPerMonth || 0, project.settings?.currency)}/mo
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-sm text-gray-500">Status</span>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                project.isActive !== false ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
              }`}>
                {project.isActive !== false ? 'Active' : 'Inactive'}
              </span>
            </div>
            {project.organization && (
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-gray-500">Organization</span>
                <RouterLink
                  to={`/organizations/${project.organization._id || project.organization}`}
                  className="text-sm font-medium text-[#DC2626] hover:underline"
                >
                  {project.organization.name || 'View Organization'}
                </RouterLink>
              </div>
            )}
          </div>
        </div>

        {/* Feature Statistics */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Feature Statistics</h2>
          {stats?.featureStats && stats.featureStats.length > 0 ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {stats.featureStats.map((stat, index) => (
                  <div key={index} className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700 capitalize">{stat._id || 'Unknown'}</span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        stat._id === 'active' ? 'bg-green-100 text-green-700' :
                        stat._id === 'inactive' ? 'bg-gray-100 text-gray-600' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {stat.count} features
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-gray-500">Tokens: </span>
                        <span className="font-medium">{stat.totalTokens?.toLocaleString() || 0}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Cost: </span>
                        <span className="font-medium">{formatCurrency(stat.totalCost || 0)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
              </div>
              <p className="text-gray-500 text-sm">No features added yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Features List Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Features</h2>
          <button
            onClick={() => {
              if (!currentOrganization) {
                setError('No organization selected. Please refresh the page or select an organization.');
                return;
              }
              setError('');
              setShowFeatureModal(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#DC2626] text-white font-medium rounded-lg hover:bg-[#B91C1C] transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>Add Feature</span>
          </button>
        </div>

        {featuresLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader />
          </div>
        ) : features.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Model</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tokens/Req</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {features.map((feature) => (
                  <tr key={feature._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{feature.name}</div>
                          {feature.description && (
                            <div className="text-sm text-gray-500 truncate max-w-xs">{feature.description}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                        feature.category === 'chat' ? 'bg-blue-100 text-blue-800' :
                        feature.category === 'completion' ? 'bg-green-100 text-green-800' :
                        feature.category === 'embedding' ? 'bg-purple-100 text-purple-800' :
                        feature.category === 'image' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {feature.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {feature.model?.name || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        feature.status === 'active' ? 'bg-green-100 text-green-800' :
                        feature.status === 'inactive' ? 'bg-gray-100 text-gray-800' :
                        feature.status === 'maintenance' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {feature.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {((feature.tokenEstimates?.inputTokensPerRequest || 0) + (feature.tokenEstimates?.outputTokensPerRequest || 0)).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <RouterLink
                        to={`/features/${feature._id}`}
                        className="text-[#DC2626] hover:text-[#B91C1C] mr-4"
                      >
                        View
                      </RouterLink>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
            </div>
            <p className="text-gray-500 text-sm mb-4">No features in this project yet</p>
            <button
              onClick={() => setShowFeatureModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#DC2626] text-white font-medium rounded-lg hover:bg-[#B91C1C] transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>Add First Feature</span>
            </button>
          </div>
        )}
      </div>

      {/* Edit Project Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setFormData({
            name: project.name,
            description: project.description || '',
            settings: {
              currency: project.settings?.currency || 'USD',
              timezone: project.settings?.timezone || 'UTC',
              infrastructureCostPerMonth: project.settings?.infrastructureCostPerMonth || 0
            }
          });
        }}
        title="Edit Project"
        size="md"
      >
        <form onSubmit={handleUpdateProject} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Project Name<span className="text-red-500">*</span></label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              maxLength={100}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-transparent"
              placeholder="Enter project name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              maxLength={300}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-transparent resize-none"
              placeholder="Brief description of the project"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Currency
              </label>
              <select
                value={formData.settings.currency}
                onChange={(e) => setFormData({
                  ...formData,
                  settings: { ...formData.settings, currency: e.target.value }
                })}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-transparent"
              >
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="INR">INR (₹)</option>
                <option value="CAD">CAD ($)</option>
                <option value="AUD">AUD ($)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Timezone
              </label>
              <select
                value={formData.settings.timezone}
                onChange={(e) => setFormData({
                  ...formData,
                  settings: { ...formData.settings, timezone: e.target.value }
                })}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-transparent"
              >
                <option value="UTC">UTC</option>
                <option value="America/New_York">Eastern Time (ET)</option>
                <option value="America/Chicago">Central Time (CT)</option>
                <option value="America/Denver">Mountain Time (MT)</option>
                <option value="America/Los_Angeles">Pacific Time (PT)</option>
                <option value="Europe/London">London (GMT)</option>
                <option value="Europe/Paris">Paris (CET)</option>
                <option value="Europe/Berlin">Berlin (CET)</option>
                <option value="Asia/Kolkata">India (IST)</option>
                <option value="Asia/Tokyo">Tokyo (JST)</option>
                <option value="Asia/Shanghai">Shanghai (CST)</option>
                <option value="Asia/Singapore">Singapore (SGT)</option>
                <option value="Asia/Dubai">Dubai (GST)</option>
                <option value="Australia/Sydney">Sydney (AEST)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Infrastructure Cost/Month
            </label>
            <input
              type="number"
              value={formData.settings.infrastructureCostPerMonth}
              onChange={(e) => setFormData({
                ...formData,
                settings: { ...formData.settings, infrastructureCostPerMonth: parseFloat(e.target.value) || 0 }
              })}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-transparent"
              placeholder="0.00"
              min="0"
              step="0.01"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => {
                setShowEditModal(false);
                setFormData({
                  name: project.name,
                  description: project.description || '',
                  settings: {
                    currency: project.settings?.currency || 'USD',
                    timezone: project.settings?.timezone || 'UTC',
                    infrastructureCostPerMonth: project.settings?.infrastructureCostPerMonth || 0
                  }
                });
              }}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-[#DC2626] text-white rounded-lg hover:bg-[#B91C1C] transition-colors"
            >
              Save Changes
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Project"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Are you sure you want to delete <strong>{project.name}</strong>? This action cannot be undone and will also delete all features associated with this project.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setShowDeleteModal(false)}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteProject}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Delete Project
            </button>
          </div>
        </div>
      </Modal>

      {/* Add Feature Modal */}
      <Modal
        isOpen={showFeatureModal}
        onClose={() => {
          setShowFeatureModal(false);
          setError('');
          setFeatureForm({
            name: '',
            description: '',
            category: 'other',
            status: 'active',
            model: '',
            provider: '',
            inputTokensPerRequest: 0,
            outputTokensPerRequest: 0,
            calculationMethod: 'fixed',
            dynamicMultiplier: 1,
            fixedCostPerRequest: 0,
            overheadPercentage: 0,
            monthlyFixedCost: 0,
            infrastructureType: 'serverless',
            maxRequestsPerUser: '',
            maxTokensPerUser: '',
            maxRequestsPerMonth: '',
            enabled: true,
            requiresAuth: true,
            cacheEnabled: false,
            cacheTTL: 3600
          });
        }}
        title="Add Feature to Project"
        size="2xl"
      >
        <form onSubmit={async (e) => {
          e.preventDefault();
          setError('');

          if (!currentOrganization) {
            setError('No organization selected. Please select an organization first.');
            return;
          }

          if (!featureForm.name.trim()) {
            setError('Feature name is required');
            return;
          }

          try {
            const featureData = {
              name: featureForm.name.trim(),
              description: featureForm.description.trim() || undefined,
              category: featureForm.category || 'other',
              status: featureForm.status || 'active',
              organization: currentOrganization._id,
              project: id,
              model: featureForm.model || undefined,
              provider: featureForm.provider || undefined,
              tokenEstimates: {
                inputTokensPerRequest: Number(featureForm.inputTokensPerRequest) || 0,
                outputTokensPerRequest: Number(featureForm.outputTokensPerRequest) || 0,
                calculationMethod: featureForm.calculationMethod,
                dynamicMultiplier: Number(featureForm.dynamicMultiplier) || 1
              },
              infrastructureCost: {
                fixedCostPerRequest: Number(featureForm.fixedCostPerRequest) || 0,
                overheadPercentage: Number(featureForm.overheadPercentage) || 0,
                monthlyFixedCost: Number(featureForm.monthlyFixedCost) || 0,
                infrastructureType: featureForm.infrastructureType
              },
              limits: {
                maxRequestsPerUser: featureForm.maxRequestsPerUser ? Number(featureForm.maxRequestsPerUser) : null,
                maxTokensPerUser: featureForm.maxTokensPerUser ? Number(featureForm.maxTokensPerUser) : null,
                maxRequestsPerMonth: featureForm.maxRequestsPerMonth ? Number(featureForm.maxRequestsPerMonth) : null
              },
              settings: {
                enabled: featureForm.enabled,
                requiresAuth: featureForm.requiresAuth,
                cacheEnabled: featureForm.cacheEnabled,
                cacheTTL: Number(featureForm.cacheTTL) || 3600
              }
            };

            await featureApi.create(featureData);
            setSuccess('Feature created successfully');
            setShowFeatureModal(false);
            setFeatureForm({
              name: '',
              description: '',
              category: 'other',
              status: 'active',
              model: '',
              provider: '',
              inputTokensPerRequest: 0,
              outputTokensPerRequest: 0,
              calculationMethod: 'fixed',
              dynamicMultiplier: 1,
              fixedCostPerRequest: 0,
              overheadPercentage: 0,
              monthlyFixedCost: 0,
              infrastructureType: 'serverless',
              maxRequestsPerUser: '',
              maxTokensPerUser: '',
              maxRequestsPerMonth: '',
              enabled: true,
              requiresAuth: true,
              cacheEnabled: false,
              cacheTTL: 3600
            });
            fetchFeatures();
          } catch (err) {
            const errorData = err.response?.data?.error;
            let errorMessage = 'Failed to create feature';
            if (errorData?.details && Array.isArray(errorData.details)) {
              errorMessage = errorData.details.map(e => `${e.field}: ${e.message}`).join(', ');
            } else if (errorData?.message) {
              errorMessage = errorData.message;
            } else if (err.response?.data?.message) {
              errorMessage = err.response.data.message;
            }
            setError(errorMessage);
          }
        }}>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            {/* Error display */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm">{error}</span>
                </div>
                <button type="button" onClick={() => setError('')} className="text-red-600 hover:text-red-800">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}

            {/* Basic Info */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Basic Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Feature Name <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={featureForm.name}
                    onChange={(e) => setFeatureForm({ ...featureForm, name: e.target.value })}
                    maxLength={100}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    placeholder="e.g., Chat Assistant"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select
                    value={featureForm.category}
                    onChange={(e) => setFeatureForm({ ...featureForm, category: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  >
                    <option value="chat">Chat</option>
                    <option value="completion">Completion</option>
                    <option value="embedding">Embedding</option>
                    <option value="image">Image</option>
                    <option value="audio">Audio</option>
                    <option value="video">Video</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={featureForm.description}
                    onChange={(e) => setFeatureForm({ ...featureForm, description: e.target.value })}
                    rows={2}
                    maxLength={500}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                    placeholder="Brief description of this feature"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={featureForm.status}
                    onChange={(e) => setFeatureForm({ ...featureForm, status: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="maintenance">Maintenance</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Model & Provider */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">AI Model & Provider</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Provider</label>
                  <select
                    value={featureForm.provider}
                    onChange={async (e) => {
                      const providerId = e.target.value;

                      if (!providerId) {
                        setFilteredModels([]);
                        setModelsSource(null);
                        setFeatureForm({ ...featureForm, provider: '', model: '' });
                        return;
                      }

                      // Set loading state
                      setIsLoadingModels(true);
                      setFeatureForm({ ...featureForm, provider: providerId, model: '' });
                      setFilteredModels([]);
                      setModelsSource(null);

                      try {
                        // Fetch models from the provider's live API (force refresh to get latest)
                        const response = await providerApi.getDynamicModels(providerId, { forceRefresh: true });
                        const liveModels = response.models || [];

                        // Process models for the dropdown
                        const processedModels = liveModels.map(model => ({
                          ...model,
                          _id: model._id || model.id,
                          displayName: model.displayName || model.name,
                          isLiveModel: !model._id,
                          source: model.source || (model._id ? 'database' : 'api')
                        }));

                        setFilteredModels(processedModels);
                        setModelsSource(response.meta?.source || 'api');
                      } catch (err) {
                        console.error('Failed to fetch live models:', err);
                        // Fallback to database models for this provider
                        const dbModels = models.filter(m =>
                          m.provider?._id === providerId || m.provider === providerId
                        );
                        setFilteredModels(dbModels);
                        setModelsSource('database');
                      } finally {
                        setIsLoadingModels(false);
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  >
                    <option value="">Select Provider</option>
                    {providers.map(provider => (
                      <option key={provider._id} value={provider._id}>
                        {provider.displayName || provider.name}
                      </option>
                    ))}
                  </select>
                  {providers.length === 0 && (
                    <p className="mt-1 text-xs text-amber-600">
                      No providers. <RouterLink to="/providers" className="underline">Create one</RouterLink>
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">AI Model</label>
                  <select
                    value={featureForm.model}
                    onChange={(e) => setFeatureForm({ ...featureForm, model: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                    disabled={!featureForm.provider || isLoadingModels}
                  >
                    <option value="">
                      {isLoadingModels ? 'Loading models from API...' : 'Select Model'}
                    </option>
                    {filteredModels.map(model => (
                      <option key={model._id || model.id} value={model._id || model.id}>
                        {model.displayName || model.name} {model.pricing?.inputPrice ? `(${currencySymbol}${model.pricing.inputPrice}/${currencySymbol}${model.pricing.outputPrice || 0}/1M)` : ''}
                      </option>
                    ))}
                  </select>
                  {isLoadingModels && (
                    <div className="mt-1 flex items-center gap-2 text-xs text-blue-600">
                      <svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Fetching live models from {providers.find(p => p._id === featureForm.provider)?.displayName || 'provider'}...</span>
                    </div>
                  )}
                  {!featureForm.provider && !isLoadingModels && (
                    <p className="mt-1 text-xs text-gray-500">Select a provider first</p>
                  )}
                  {featureForm.provider && !isLoadingModels && filteredModels.length === 0 && (
                    <p className="mt-1 text-xs text-amber-600">
                      No models found for this provider. <RouterLink to="/models" className="underline">Create one</RouterLink>
                    </p>
                  )}
                  {featureForm.provider && !isLoadingModels && filteredModels.length > 0 && (
                    <p className="mt-1 text-xs text-green-600 flex items-center gap-1">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      {filteredModels.length} models loaded
                      {modelsSource === 'api' && ' from live API'}
                      {modelsSource === 'database' && ' from database'}
                      {modelsSource === 'hybrid' && ' (live API + database)'}
                      {modelsSource === 'database_fallback' && ' from database (API unavailable)'}
                    </p>
                  )}
                </div>
              </div>
              {featureForm.model && filteredModels.find(m => m._id === featureForm.model)?.pricing && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <p className="text-xs text-gray-500 mb-2">Model Pricing:</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-gray-50 rounded p-2">
                      <span className="text-xs text-gray-500">Input</span>
                      <p className="text-sm font-semibold">{currencySymbol}{(filteredModels.find(m => m._id === featureForm.model)?.pricing?.inputPrice || 0).toFixed(2)}/1M</p>
                    </div>
                    <div className="bg-gray-50 rounded p-2">
                      <span className="text-xs text-gray-500">Output</span>
                      <p className="text-sm font-semibold">{currencySymbol}{(filteredModels.find(m => m._id === featureForm.model)?.pricing?.outputPrice || 0).toFixed(2)}/1M</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Token Estimates */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Token Estimates</h3>
              <p className="text-xs text-gray-500 mb-3">Estimate how many tokens each API request will consume.</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Input Tokens / Request</label>
                  <input
                    type="number"
                    value={featureForm.inputTokensPerRequest}
                    onChange={(e) => setFeatureForm({ ...featureForm, inputTokensPerRequest: e.target.value })}
                    min="0"
                    placeholder="500"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Output Tokens / Request</label>
                  <input
                    type="number"
                    value={featureForm.outputTokensPerRequest}
                    onChange={(e) => setFeatureForm({ ...featureForm, outputTokensPerRequest: e.target.value })}
                    min="0"
                    placeholder="200"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Calculation Method</label>
                  <select
                    value={featureForm.calculationMethod}
                    onChange={(e) => setFeatureForm({ ...featureForm, calculationMethod: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  >
                    <option value="fixed">Fixed</option>
                    <option value="dynamic">Dynamic</option>
                    <option value="user-based">User Based</option>
                  </select>
                </div>
              </div>
              {featureForm.calculationMethod === 'dynamic' && (
                <div className="mt-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Dynamic Multiplier</label>
                  <input
                    type="number"
                    value={featureForm.dynamicMultiplier}
                    onChange={(e) => setFeatureForm({ ...featureForm, dynamicMultiplier: e.target.value })}
                    min="0.1"
                    step="0.1"
                    className="w-full md:w-1/3 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
              )}
              {featureForm.inputTokensPerRequest > 0 && featureForm.outputTokensPerRequest > 0 && featureForm.model && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <p className="text-xs text-gray-500 mb-2">Estimated Cost per 1000 Requests:</p>
                  <div className="bg-red-50 rounded p-2">
                    <p className="text-lg font-bold text-[#DC2626]">
                      {formatCurrencyWithSymbol(
                        ((filteredModels.find(m => m._id === featureForm.model)?.pricing?.inputPrice || 0) / 1000000) * featureForm.inputTokensPerRequest * 1000 +
                        ((filteredModels.find(m => m._id === featureForm.model)?.pricing?.outputPrice || 0) / 1000000) * featureForm.outputTokensPerRequest * 1000,
                        currency
                      )}
                    </p>
                    <p className="text-xs text-gray-500">
                      {(Number(featureForm.inputTokensPerRequest) + Number(featureForm.outputTokensPerRequest))} tokens/request × 1000 requests
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Infrastructure Costs */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Infrastructure Costs (Optional)</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{getCurrencyLabel('Fixed Cost/Req', currency)}</label>
                  <input
                    type="number"
                    value={featureForm.fixedCostPerRequest}
                    onChange={(e) => setFeatureForm({ ...featureForm, fixedCostPerRequest: e.target.value })}
                    min="0"
                    step="0.00001"
                    placeholder="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Overhead (%)</label>
                  <input
                    type="number"
                    value={featureForm.overheadPercentage}
                    onChange={(e) => setFeatureForm({ ...featureForm, overheadPercentage: e.target.value })}
                    min="0"
                    max="100"
                    placeholder="10"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{getCurrencyLabel('Monthly Fixed', currency)}</label>
                  <input
                    type="number"
                    value={featureForm.monthlyFixedCost}
                    onChange={(e) => setFeatureForm({ ...featureForm, monthlyFixedCost: e.target.value })}
                    min="0"
                    step="0.01"
                    placeholder="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Infra Type</label>
                  <select
                    value={featureForm.infrastructureType}
                    onChange={(e) => setFeatureForm({ ...featureForm, infrastructureType: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  >
                    <option value="serverless">Serverless</option>
                    <option value="dedicated">Dedicated</option>
                    <option value="hybrid">Hybrid</option>
                    <option value="shared">Shared</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Usage Limits */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Usage Limits (Optional)</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Requests/User</label>
                  <input
                    type="number"
                    value={featureForm.maxRequestsPerUser}
                    onChange={(e) => setFeatureForm({ ...featureForm, maxRequestsPerUser: e.target.value })}
                    min="0"
                    placeholder="Unlimited"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Tokens/User</label>
                  <input
                    type="number"
                    value={featureForm.maxTokensPerUser}
                    onChange={(e) => setFeatureForm({ ...featureForm, maxTokensPerUser: e.target.value })}
                    min="0"
                    placeholder="Unlimited"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Requests/Month</label>
                  <input
                    type="number"
                    value={featureForm.maxRequestsPerMonth}
                    onChange={(e) => setFeatureForm({ ...featureForm, maxRequestsPerMonth: e.target.value })}
                    min="0"
                    placeholder="Unlimited"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
              </div>
            </div>

            {/* Settings */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Settings</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={featureForm.enabled}
                    onChange={(e) => setFeatureForm({ ...featureForm, enabled: e.target.checked })}
                    className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                  />
                  <span className="text-sm text-gray-700">Feature Enabled</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={featureForm.requiresAuth}
                    onChange={(e) => setFeatureForm({ ...featureForm, requiresAuth: e.target.checked })}
                    className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                  />
                  <span className="text-sm text-gray-700">Requires Authentication</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={featureForm.cacheEnabled}
                    onChange={(e) => setFeatureForm({ ...featureForm, cacheEnabled: e.target.checked })}
                    className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                  />
                  <span className="text-sm text-gray-700">Enable Response Caching</span>
                </label>
                {featureForm.cacheEnabled && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Cache TTL (seconds)</label>
                    <input
                      type="number"
                      value={featureForm.cacheTTL}
                      onChange={(e) => setFeatureForm({ ...featureForm, cacheTTL: e.target.value })}
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 mt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={() => {
                setShowFeatureModal(false);
                setError('');
                setFeatureForm({
                  name: '',
                  description: '',
                  category: 'other',
                  status: 'active',
                  model: '',
                  provider: '',
                  inputTokensPerRequest: 0,
                  outputTokensPerRequest: 0,
                  calculationMethod: 'fixed',
                  dynamicMultiplier: 1,
                  fixedCostPerRequest: 0,
                  overheadPercentage: 0,
                  monthlyFixedCost: 0,
                  infrastructureType: 'serverless',
                  maxRequestsPerUser: '',
                  maxTokensPerUser: '',
                  maxRequestsPerMonth: '',
                  enabled: true,
                  requiresAuth: true,
                  cacheEnabled: false,
                  cacheTTL: 3600
                });
              }}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-[#DC2626] text-white rounded-lg hover:bg-[#B91C1C] transition-colors"
            >
              Create Feature
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default ProjectDetailPage;