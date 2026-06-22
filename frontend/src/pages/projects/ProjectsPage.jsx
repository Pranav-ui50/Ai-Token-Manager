/**
 * Projects Page
 *
 * Manage projects within an organization.
 * Red & White theme styling.
 */

import { useState, useEffect } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useOrganization } from '../../context/OrganizationContext.jsx';
import usePermissions from '../../hooks/usePermissions.js';
import Modal from '../../components/common/Modal.jsx';
import Loader from '../../components/common/Loader.jsx';
import projectApi from '../../services/api/project.api.js';
import { showToast } from '../../utils/toasts.js';

function ProjectsPage() {
  const { currentOrganization, isLoading: orgLoading } = useOrganization();
  const { role } = usePermissions();
  const isViewer = role === 'viewer';
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [projectToDelete, setProjectToDelete] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');

  // Status colors for project cards
  const STATUS_COLORS = {
    active: 'bg-green-100 text-green-700',
    inactive: 'bg-gray-100 text-gray-600',
    disabled: 'bg-red-100 text-red-700'
  };

  // Get status display for project
  const getProjectStatus = (project) => {
    // Check status field first (new system)
    if (project.status === 'disabled') {
      return { label: 'Disabled', color: STATUS_COLORS.disabled, reason: project.disabledReason, note: project.disabledNote };
    }
    if (project.status === 'inactive') {
      return { label: 'Inactive', color: STATUS_COLORS.inactive };
    }
    // Fall back to isActive field (legacy)
    if (project.isActive === false) {
      return { label: 'Inactive', color: STATUS_COLORS.inactive };
    }
    return { label: 'Active', color: STATUS_COLORS.active };
  };

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

  useEffect(() => {
    if (currentOrganization) {
      fetchProjects();
    }
  }, [currentOrganization]);

  const fetchProjects = async () => {
    setIsLoading(true);
    try {
      // Fetch all projects (no filter) - stats will use all projects
      const data = await projectApi.getForOrganization(currentOrganization._id);
      setProjects(data || []);
    } catch (err) {
      console.error('Failed to fetch projects:', err);
      showToast.error(err.response?.data?.error?.message || err.response?.data?.message || 'Failed to load projects');
    } finally {
      setIsLoading(false);
    }
  };

  // Filter projects by status and search query
  const filteredProjects = projects.filter(project => {
    // Get the effective status
    const status = project.status || (project.isActive === false ? 'inactive' : 'active');

    // Status filter
    if (statusFilter === 'active' && status !== 'active') return false;
    if (statusFilter === 'inactive' && status !== 'inactive') return false;
    if (statusFilter === 'disabled' && status !== 'disabled') return false;

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      return (
        project.name?.toLowerCase().includes(query) ||
        project.description?.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const handleCreateProject = async (e) => {
    e.preventDefault();

    if (!currentOrganization) {
      showToast.error('No organization selected. Please select an organization first.');
      return;
    }

    if (!formData.name.trim()) {
      showToast.error('Project name is required');
      return;
    }

    try {
      const newProject = await projectApi.create({
        organizationId: currentOrganization._id,
        ...formData
      });
      setProjects(prev => [newProject, ...prev]);
      setShowCreateModal(false);
      resetForm();
      showToast.projectCreated();
    } catch (err) {
      showToast.error(err.response?.data?.error?.message || err.response?.data?.message || 'Failed to create project');
    }
  };

  const handleUpdateProject = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      showToast.error('Project name is required');
      return;
    }

    try {
      const updatedProject = await projectApi.update(selectedProject._id, formData);
      setProjects(prev => prev.map(p =>
        p._id === selectedProject._id ? updatedProject : p
      ));
      setShowEditModal(false);
      setSelectedProject(null);
      resetForm();
      showToast.projectUpdated();
    } catch (err) {
      showToast.error(err.response?.data?.error?.message || err.response?.data?.message || 'Failed to update project');
    }
  };

  // Handle delete click - open modal
  const handleDeleteClick = (project) => {
    setProjectToDelete(project);
    setShowDeleteModal(true);
  };

  // Confirm delete
  const confirmDelete = async () => {
    if (!projectToDelete) return;

    try {
      await projectApi.delete(projectToDelete._id);
      setProjects(prev => prev.filter(p => p._id !== projectToDelete._id));
      setShowDeleteModal(false);
      setProjectToDelete(null);
      showToast.projectDeleted();
    } catch (err) {
      showToast.error(err.response?.data?.error?.message || err.response?.data?.message || 'Failed to delete project');
    }
  };

  // Cancel delete
  const cancelDelete = () => {
    setShowDeleteModal(false);
    setProjectToDelete(null);
  };

  const handleToggleStatus = async (project) => {
    try {
      if (project.isActive === false) {
        // Activate inactive project
        await projectApi.restore(project._id);
        setProjects(prev => prev.map(p =>
          p._id === project._id ? { ...p, isActive: true } : p
        ));
        showToast.success('Project activated successfully');
      } else {
        // Deactivate active project
        await projectApi.archive(project._id);
        setProjects(prev => prev.map(p =>
          p._id === project._id ? { ...p, isActive: false } : p
        ));
        showToast.success('Project deactivated successfully');
      }
    } catch (err) {
      showToast.error(err.response?.data?.error?.message || err.response?.data?.message || 'Failed to update project status');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      settings: {
        currency: 'USD',
        timezone: 'UTC',
        infrastructureCostPerMonth: 0
      }
    });
  };

  const openEditModal = (project) => {
    setSelectedProject(project);
    setFormData({
      name: project.name,
      description: project.description || '',
      settings: {
        currency: project.settings?.currency || 'USD',
        timezone: project.settings?.timezone || 'UTC',
        infrastructureCostPerMonth: project.settings?.infrastructureCostPerMonth || 0
      }
    });
    setShowEditModal(true);
  };

  const formatCurrency = (amount, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency
    }).format(amount);
  };

  // Currency symbols map
  const getCurrencySymbol = (currency) => {
    const symbols = {
      USD: '$',
      EUR: '€',
      GBP: '£',
      INR: '₹',
      CAD: 'C$',
      AUD: 'A$'
    };
    return symbols[currency] || '$';
  };

  // Get padding class based on currency symbol length
  const getCurrencyPadding = (currency) => {
    const symbol = getCurrencySymbol(currency);
    // Longer symbols need more padding
    return symbol.length > 1 ? 'pl-10' : 'pl-7';
  };

  if (orgLoading) {
    return <Loader fullPage text="Loading..." />;
  }

  if (!currentOrganization) {
    return (
      <div className="flex flex-col items-center justify-center min-h-96">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-[#DC2626]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">No Organization Selected</h2>
          <p className="text-gray-500 mb-4">Please select or create an organization to manage projects.</p>
          <a
            href="/organizations"
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#DC2626] text-white font-medium rounded-lg hover:bg-[#B91C1C] transition-colors"
          >
            <span>Go to Organizations</span>
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
          <p className="text-sm text-gray-500">Manage projects within {currentOrganization.name}</p>
        </div>
        {!isViewer && (
        <button
          onClick={() => {
            resetForm();
            setShowCreateModal(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#DC2626] text-white font-medium rounded-lg hover:bg-[#B91C1C] transition-colors shadow-sm"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>New Project</span>
        </button>
        )}
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="flex-1">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#DC2626] focus:ring-2 focus:ring-[#DC2626]/20"
            />
          </div>
        </div>
        {/* Status Filter */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Status:</span>
          <div className="flex rounded-lg overflow-hidden border border-gray-200">
            <button
              onClick={() => setStatusFilter('active')}
              className={`px-3 py-2 text-sm font-medium transition-colors ${
                statusFilter === 'active'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              Active
            </button>
            <button
              onClick={() => setStatusFilter('inactive')}
              className={`px-3 py-2 text-sm font-medium transition-colors ${
                statusFilter === 'inactive'
                  ? 'bg-gray-100 text-gray-700'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              Inactive
            </button>
            <button
              onClick={() => setStatusFilter('disabled')}
              className={`px-3 py-2 text-sm font-medium transition-colors ${
                statusFilter === 'disabled'
                  ? 'bg-red-100 text-red-700'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              Disabled
            </button>
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-2 text-sm font-medium transition-colors ${
                statusFilter === 'all'
                  ? 'bg-[#DC2626] text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              All
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-gray-500">Total Projects</p>
              <p className="text-xl font-bold text-gray-900">{projects.length}</p>
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
              <p className="text-xs text-gray-500">Active</p>
              <p className="text-xl font-bold text-gray-900">{projects.filter(p => (p.status || (p.isActive === false ? 'inactive' : 'active')) === 'active').length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-gray-500">Inactive</p>
              <p className="text-xl font-bold text-gray-900">{projects.filter(p => (p.status || (p.isActive === false ? 'inactive' : 'active')) === 'inactive').length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-red-600" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11H7v-2h10v2z" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-gray-500">Disabled</p>
              <p className="text-xl font-bold text-gray-900">{projects.filter(p => p.status === 'disabled').length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-gray-500">Total Features</p>
              <p className="text-xl font-bold text-gray-900">{projects.reduce((sum, p) => sum + (p.featureCount || 0), 0)}</p>
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
                {formatCurrency(projects.reduce((sum, p) => sum + (p.settings?.infrastructureCostPerMonth || 0), 0), projects[0]?.settings?.currency || 'USD')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Projects Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader />
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-[#DC2626]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {searchQuery || statusFilter !== 'active' ? 'No projects found' : 'No projects yet'}
            </h3>
            <p className="text-gray-500 max-w-md mx-auto mb-4">
              {searchQuery || statusFilter !== 'active'
                ? 'Try adjusting your search or filter criteria.'
                : isViewer
                  ? 'No projects have been created yet.'
                  : 'Create your first project to start organizing features and tracking costs.'}
            </p>
            {!searchQuery && statusFilter === 'active' && !isViewer && (
              <button
                onClick={() => {
                  resetForm();
                  setShowCreateModal(true);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#DC2626] text-white font-medium rounded-lg hover:bg-[#B91C1C] transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span>Create Project</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project) => (
            <div
              key={project._id}
              className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:border-red-200 transition-colors cursor-pointer"
              onClick={() => navigate(`/projects/${project._id}`)}
            >
              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-1 hover:text-[#DC2626] transition-colors">{project.name}</h3>
                    <p className="text-sm text-gray-500 line-clamp-2">
                      {project.description || 'No description'}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getProjectStatus(project).color}`}>
                      {getProjectStatus(project).label}
                    </span>
                    {project.status === 'disabled' && project.disabledNote && (
                      <span className="text-xs text-red-600 text-right">
                        {project.disabledNote}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                  <div className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                    </svg>
                    <span>{project.featureCount || 0} features</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{formatCurrency(project.settings?.infrastructureCostPerMonth || 0, project.settings?.currency)}/mo</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/projects/${project._id}`);
                    }}
                    className="text-[#DC2626] hover:text-[#B91C1C] p-2 rounded-lg hover:bg-red-50 transition-colors"
                    title="View project"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </button>
                  {!isViewer && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleStatus(project);
                      }}
                      className={`p-2 rounded-lg transition-colors ${
                        project.isActive === false
                          ? 'text-green-600 hover:text-green-700 hover:bg-green-50'
                          : 'text-gray-500 hover:text-red-600 hover:bg-red-50'
                      }`}
                      title={project.isActive === false ? 'Activate project' : 'Deactivate project'}
                    >
                      {project.isActive === false ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      )}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditModal(project);
                      }}
                      className="text-gray-500 hover:text-[#DC2626] p-2 rounded-lg hover:bg-red-50 transition-colors"
                      title="Edit project"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteClick(project);
                      }}
                      className="text-gray-500 hover:text-red-600 p-2 rounded-lg hover:bg-red-50 transition-colors"
                      title="Delete project"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Project Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          resetForm();
        }}
        title="Create New Project"
        size="md"
        closeOnBackdropClick={false}
      >
        <form onSubmit={handleCreateProject} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Project Name<span className="text-red-500">*</span></label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              maxLength={100}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#DC2626] focus:ring-2 focus:ring-[#DC2626]/20"
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
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#DC2626] focus:ring-2 focus:ring-[#DC2626]/20 resize-none"
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
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#DC2626] focus:ring-2 focus:ring-[#DC2626]/20"
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
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#DC2626] focus:ring-2 focus:ring-[#DC2626]/20"
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
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                {getCurrencySymbol(formData.settings.currency)}
              </span>
              <input
                type="text"
                inputMode="decimal"
                value={formData.settings.infrastructureCostPerMonth}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^0-9.-]/g, '');
                  setFormData({
                    ...formData,
                    settings: { ...formData.settings, infrastructureCostPerMonth: parseFloat(value) || 0 }
                  });
                }}
                className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#DC2626] focus:ring-2 focus:ring-[#DC2626]/20 ${getCurrencyPadding(formData.settings.currency)}`}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => {
                setShowCreateModal(false);
                resetForm();
              }}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-[#DC2626] text-white rounded-lg hover:bg-[#B91C1C] transition-colors"
            >
              Create Project
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Project Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedProject(null);
          resetForm();
        }}
        title="Edit Project"
        size="md"
        closeOnBackdropClick={false}
      >
        <form onSubmit={handleUpdateProject} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Project Name<span className="text-red-500">*</span></label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              maxLength={100}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#DC2626] focus:ring-2 focus:ring-[#DC2626]/20"
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
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#DC2626] focus:ring-2 focus:ring-[#DC2626]/20 resize-none"
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
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#DC2626] focus:ring-2 focus:ring-[#DC2626]/20"
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
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#DC2626] focus:ring-2 focus:ring-[#DC2626]/20"
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
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                {getCurrencySymbol(formData.settings.currency)}
              </span>
              <input
                type="text"
                inputMode="decimal"
                value={formData.settings.infrastructureCostPerMonth}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^0-9.-]/g, '');
                  setFormData({
                    ...formData,
                    settings: { ...formData.settings, infrastructureCostPerMonth: parseFloat(value) || 0 }
                  });
                }}
                className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#DC2626] focus:ring-2 focus:ring-[#DC2626]/20 ${getCurrencyPadding(formData.settings.currency)}`}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => {
                setShowEditModal(false);
                setSelectedProject(null);
                resetForm();
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
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={cancelDelete}></div>
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 relative z-10">
            <div className="p-6">
              <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-red-100 rounded-full">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-1.964-1.333-2.732 0L3.082 16.5c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">
                Delete Project
              </h3>
              <p className="text-sm text-gray-500 text-center mb-6">
                Are you sure you want to delete <span className="font-medium text-gray-700">"{projectToDelete?.name}"</span>? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={cancelDelete}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-[#DC2626] rounded-lg hover:bg-[#B91C1C] transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProjectsPage;