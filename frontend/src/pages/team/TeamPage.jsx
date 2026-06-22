/**
 * Team Members Page
 *
 * Manage team members in an organization with role assignments.
 * Red & White theme styling with full API integration.
 */

import { useState, useEffect } from 'react';
import { useOrganization } from '../../context/OrganizationContext.jsx';
import { useAuth } from '../../hooks/useAuth.js';
import usePermissions from '../../hooks/usePermissions.js';
import organizationApi from '../../services/api/organization.api.js';
import roleApi from '../../services/api/role.api.js';
import Modal from '../../components/common/Modal.jsx';
import Button from '../../components/common/Button.jsx';
import Avatar from '../../components/common/Avatar.jsx';
import Loader from '../../components/common/Loader.jsx';
import { showToast } from '../../utils/toasts.jsx';

const ROLE_OPTIONS = [
  { value: 'org_owner', label: 'Organization Owner', description: 'Full access to all features including billing', permissions: ['All permissions'] },
  { value: 'finance_admin', label: 'Finance Admin', description: 'Manage billing, invoices, and pricing', permissions: ['View billing', 'Manage subscription', 'View invoices', 'Manage pricing'] },
  { value: 'product_manager', label: 'Product Manager', description: 'Manage features, plans, and models', permissions: ['Create features', 'Edit features', 'Manage plans', 'View analytics'] },
  { value: 'developer', label: 'Developer', description: 'Manage API keys and integrations', permissions: ['Create API keys', 'Manage webhooks', 'View integrations', 'View usage'] },
  { value: 'viewer', label: 'Viewer', description: 'Read-only access to view data', permissions: ['View dashboard', 'View reports', 'View analytics'] }
];

const STATUS_COLORS = {
  active: 'bg-green-100 text-green-700',
  inactive: 'bg-gray-100 text-gray-700',
  disabled: 'bg-red-100 text-red-700'
};

const ROLE_COLORS = {
  org_owner: 'bg-purple-100 text-purple-700',
  finance_admin: 'bg-green-100 text-green-700',
  product_manager: 'bg-blue-100 text-blue-700',
  developer: 'bg-yellow-100 text-yellow-700',
  viewer: 'bg-gray-100 text-gray-700'
};

function TeamPage() {
  const { currentOrganization, refreshOrganization } = useOrganization();
  const { user } = useAuth();
  const { canManageTeam, isOwner } = usePermissions();
  const [members, setMembers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showEditRoleModal, setShowEditRoleModal] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [selectedRole, setSelectedRole] = useState(null);

  // Form states
  const [inviteForm, setInviteForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    roleId: ''
  });
  const [inviteErrors, setInviteErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Real-time field validation
  const validateField = (name, value) => {
    let error = '';

    switch (name) {
      case 'firstName':
        if (!value.trim()) {
          error = 'First name is required';
        } else if (value.length > 50) {
          error = 'First name cannot exceed 50 characters';
        } else if (/[<>{}]/.test(value)) {
          error = 'HTML tags are not allowed';
        } else if (!/^[a-zA-Z\s'-]+$/.test(value)) {
          error = 'Only letters, spaces, hyphens and apostrophes allowed';
        }
        break;

      case 'lastName':
        if (!value.trim()) {
          error = 'Last name is required';
        } else if (value.length > 50) {
          error = 'Last name cannot exceed 50 characters';
        } else if (/[<>{}]/.test(value)) {
          error = 'HTML tags are not allowed';
        } else if (!/^[a-zA-Z\s'-]+$/.test(value)) {
          error = 'Only letters, spaces, hyphens and apostrophes allowed';
        }
        break;

      case 'email':
        if (!value.trim()) {
          error = 'Email is required';
        } else if (value.length > 255) {
          error = 'Email cannot exceed 255 characters';
        } else if (/[<>{}]/.test(value)) {
          error = 'HTML tags are not allowed';
        } else if (!/^\S+@\S+\.\S+$/.test(value)) {
          error = 'Please enter a valid email address';
        }
        break;

      case 'password':
        if (!value) {
          error = 'Password is required';
        } else if (value.length < 8) {
          error = 'Password must be at least 8 characters';
        } else if (value.length > 100) {
          error = 'Password cannot exceed 100 characters';
        } else if (!/(?=.*[a-z])/.test(value)) {
          error = 'Password must contain at least one lowercase letter';
        } else if (!/(?=.*[A-Z])/.test(value)) {
          error = 'Password must contain at least one uppercase letter';
        } else if (!/(?=.*\d)/.test(value)) {
          error = 'Password must contain at least one number';
        }
        break;

      case 'roleId':
        if (!value) {
          error = 'Please select a role';
        }
        break;

      default:
        break;
    }

    setInviteErrors(prev => ({ ...prev, [name]: error }));
    return error;
  };

  const handleFieldChange = (name, value) => {
    setInviteForm(prev => ({ ...prev, [name]: value }));
    // Validate immediately on change
    validateField(name, value);
  };

  const organizationId = currentOrganization?._id || currentOrganization?.id;

  useEffect(() => {
    if (organizationId) {
      fetchMembers();
    }
  }, [organizationId]);

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    try {
      const rolesData = await roleApi.getOrganizationRoles();
      console.log('[TeamPage] Fetched roles:', rolesData);
      setRoles(rolesData || []);
    } catch (err) {
      console.error('Failed to fetch roles:', err);
      showToast.error('Failed to load roles. Please refresh the page.');
    }
  };

  const fetchMembers = async () => {
    try {
      setLoading(true);
      // Add timestamp to prevent browser caching
      const org = await organizationApi.getById(organizationId);
      console.log('[TeamPage] Fetched members:', org.members?.map(m => ({ name: m.user?.firstName, status: m.status, reason: m.disabledReason })));
      setMembers(org.members || []);
    } catch (err) {
      showToast.error(err.response?.data?.message || 'Failed to load team members');
    } finally {
      setLoading(false);
    }
  };

  const validateInviteForm = () => {
    const errors = {};

    // Validate each field
    const firstNameError = validateField('firstName', inviteForm.firstName);
    const lastNameError = validateField('lastName', inviteForm.lastName);
    const emailError = validateField('email', inviteForm.email);
    const passwordError = validateField('password', inviteForm.password);
    const roleIdError = validateField('roleId', inviteForm.roleId);

    if (firstNameError) errors.firstName = firstNameError;
    if (lastNameError) errors.lastName = lastNameError;
    if (emailError) errors.email = emailError;
    if (passwordError) errors.password = passwordError;
    if (roleIdError) errors.roleId = roleIdError;

    return Object.keys(errors).length === 0;
  };

  const handleInviteMember = async (e) => {
    e.preventDefault();
    if (!validateInviteForm()) return;

    // Debug: Log form data being sent
    console.log('[TeamPage] Adding member with data:', {
      organizationId,
      ...inviteForm,
      password: '***' // Hide password in log
    });

    setIsSubmitting(true);
    try {
      await organizationApi.addMember(organizationId, inviteForm);
      showToast.memberAdded();
      setShowInviteModal(false);
      setInviteForm({ firstName: '', lastName: '', email: '', password: '', roleId: '' });
      setInviteErrors({});
      await fetchMembers();
    } catch (err) {
      // Debug: Log full error response
      console.error('[TeamPage] Add member error:', {
        status: err.response?.status,
        data: err.response?.data
      });

      // Check for validation errors with details
      const errorData = err.response?.data;
      let errorMessage = 'Failed to add team member';

      if (errorData?.error?.details && Array.isArray(errorData.error.details)) {
        // Show specific validation error messages
        const validationErrors = errorData.error.details.map(e => e.message).join('. ');
        errorMessage = validationErrors || errorData.error.message || errorMessage;
      } else if (errorData?.error?.message) {
        errorMessage = errorData.error.message;
      } else if (errorData?.message) {
        errorMessage = errorData.message;
      }

      // Check if it's a duplicate member error (409 Conflict)
      if (err.response?.status === 409) {
        showToast.error('This email is already associated with a team member');
      }
      // Check if it's a limit exceeded error
      else if (errorData?.error?.code === 'MEMBER_LIMIT_EXCEEDED' || errorMessage.includes('limit')) {
        showToast.error(errorMessage);
      } else {
        showToast.error(errorMessage);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateRole = async (memberId, roleName) => {
    // Find the role ID from the roles state using the role name
    const roleObj = roles.find(r => r.name === roleName);
    if (!roleObj) {
      showToast.error('Role not found');
      return;
    }

    setIsSubmitting(true);
    try {
      await organizationApi.updateMemberRole(organizationId, memberId, roleObj._id);
      showToast.roleUpdated();
      setShowEditRoleModal(false);
      setSelectedMember(null);
      await fetchMembers();
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to update role';
      showToast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveMember = async (member) => {
    setSelectedMember(member);
    setShowDeleteModal(true);
  };

  const confirmRemoveMember = async () => {
    if (!selectedMember) return;

    setIsSubmitting(true);
    try {
      // Use user ID (member.user._id if populated, or member.user if it's just an ID)
      const userId = selectedMember.user?._id || selectedMember.user;
      await organizationApi.removeMember(organizationId, userId);
      setShowDeleteModal(false);
      setSelectedMember(null);
      showToast.memberRemoved();
      await fetchMembers();
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to remove member';
      showToast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStatus = async (memberId, newStatus) => {
    setIsSubmitting(true);
    try {
      // Call API to update member status
      await organizationApi.updateMemberStatus(organizationId, memberId, newStatus);
      showToast.success(`Member status updated to ${newStatus}`);
      setShowEditRoleModal(false);
      setSelectedMember(null);
      await fetchMembers();
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to update status';
      showToast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRoleBadge = (role) => {
    const roleName = role?.name || role || 'viewer';
    const roleOption = ROLE_OPTIONS.find(r => r.value === roleName);
    return {
      label: roleOption?.label || roleName,
      color: ROLE_COLORS[roleName] || 'bg-gray-100 text-gray-700'
    };
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const canManageMembers = () => {
    // Use the permission hook's canManageTeam function
    // Only org_owner can manage team members
    return canManageTeam();
  };

  const isCurrentUser = (member) => {
    if (!user) return false;
    const memberId = member.user?._id || member.user;
    const userId = user._id || user.id;
    return memberId === userId;
  };

  const getCurrentUserRole = () => {
    if (!user || !currentOrganization?.members) return null;

    const currentMember = currentOrganization.members.find(
      m => (m.user?._id || m.user) === (user._id || user.id)
    );

    if (!currentMember) return null;

    return currentMember.role?.name || currentMember.role;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader text="Loading team members..." />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Team Members</h1>
          <p className="text-sm text-gray-500">Manage your team and their permissions</p>
        </div>
        {canManageMembers() && (
          <Button variant="primary" onClick={() => setShowInviteModal(true)}>
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Member
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Total Members</p>
              <p className="text-2xl font-bold text-gray-900">{members.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Active</p>
              <p className="text-2xl font-bold text-gray-900">{members.filter(m => m.status === 'active' || !m.status).length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Inactive</p>
              <p className="text-2xl font-bold text-gray-900">{members.filter(m => m.status === 'inactive').length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-red-600" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11H7v-2h10v2z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Disabled</p>
              <p className="text-2xl font-bold text-gray-900">{members.filter(m => m.status === 'disabled').length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Roles</p>
              <p className="text-2xl font-bold text-gray-900">{ROLE_OPTIONS.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Role Cards */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Available Roles</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {ROLE_OPTIONS.map((role) => (
            <div
              key={role.value}
              className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                selectedRole?.value === role.value
                  ? 'border-[#DC2626] bg-red-50'
                  : 'border-gray-100 hover:border-gray-200'
              }`}
              onClick={() => {
                setSelectedRole(role);
                setShowPermissionsModal(true);
              }}
            >
              <h3 className="font-medium text-gray-900">{role.label}</h3>
              <p className="text-xs text-gray-500 mt-1">{role.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Members Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Team Members</h2>
        </div>

        {members.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-[#DC2626]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No team members yet</h3>
            <p className="text-gray-500 max-w-md mx-auto mb-4">
              Invite team members to collaborate on your organization.
            </p>
            {canManageMembers() && (
              <Button variant="primary" onClick={() => setShowInviteModal(true)}>
                Add First Member
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Member
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Joined
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {members.map((member) => {
                  const roleBadge = getRoleBadge(member.role);
                  const memberId = member.user?._id || member.user;
                  const ownerId = currentOrganization?.owner?._id || currentOrganization?.owner;
                  const isOwner = memberId?.toString() === ownerId?.toString();

                  return (
                    <tr key={member._id || member.user?._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <Avatar
                            src={member.user?.avatar}
                            name={`${member.user?.firstName || ''} ${member.user?.lastName || ''}`}
                            size="md"
                          />
                          <div>
                            <p className="font-medium text-gray-900">
                              {member.user?.firstName && member.user?.lastName
                                ? `${member.user.firstName} ${member.user.lastName}`
                                : member.email}
                            </p>
                            <p className="text-xs text-gray-500">{member.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${roleBadge.color}`}>
                          {roleBadge.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col gap-1">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize w-fit ${STATUS_COLORS[member.status] || STATUS_COLORS.active}`}>
                            {member.status || 'active'}
                          </span>
                          {member.status === 'disabled' && member.disabledReason && (
                            <div className="flex flex-col">
                              <span className="text-xs text-red-600 font-medium">
                                {member.disabledReason === 'plan_limit' ? 'Plan limit exceeded' : member.disabledReason}
                              </span>
                              {member.disabledNote && (
                                <span className="text-xs text-red-500">
                                  {member.disabledNote}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {member.joinedAt ? formatDate(member.joinedAt) : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Organization Owner - show owner badge with avatar */}
                          {isOwner && (
                            <div className="relative inline-flex items-center gap-2">
                              <div className="relative">
                                <Avatar
                                  src={member.user?.avatar}
                                  name={`${member.user?.firstName || ''} ${member.user?.lastName || ''}`}
                                  size="sm"
                                />
                                <div className="absolute -top-1 -right-1 w-4 h-4 bg-amber-400 rounded-full flex items-center justify-center">
                                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                  </svg>
                                </div>
                              </div>
                              <span className="text-xs font-medium text-amber-700">Owner</span>
                            </div>
                          )}
                          {/* Non-owner members - show action buttons */}
                          {!isOwner && canManageMembers() && (
                            <>
                              {/* Hide edit button for disabled members only */}
                              {member.status !== 'disabled' && (
                                <button
                                  onClick={() => {
                                    setSelectedMember(member);
                                    setShowEditRoleModal(true);
                                  }}
                                  className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                  title="Edit Member"
                                >
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                </button>
                              )}
                              <button
                                onClick={() => handleRemoveMember(member)}
                                className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Remove Member"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Team Member Modal */}
      <Modal
        isOpen={showInviteModal}
        onClose={() => {
          setShowInviteModal(false);
          setInviteForm({ firstName: '', lastName: '', email: '', password: '', roleId: '' });
          setInviteErrors({});
        }}
        title="Add Team Member"
        size="md"
        closeOnBackdropClick={false}
      >
        <form onSubmit={handleInviteMember} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">First Name<span className="text-red-500">*</span></label>
              <input
                type="text"
                name="firstName"
                value={inviteForm.firstName}
                onChange={(e) => handleFieldChange('firstName', e.target.value)}
                maxLength={50}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${inviteErrors.firstName ? 'border-red-500 focus:ring-red-500' : 'border-gray-200 focus:ring-red-500'}`}
                placeholder="John"
              />
              {inviteErrors.firstName && <p className="mt-1 text-xs text-red-500">{inviteErrors.firstName}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Last Name<span className="text-red-500">*</span></label>
              <input
                type="text"
                name="lastName"
                value={inviteForm.lastName}
                onChange={(e) => handleFieldChange('lastName', e.target.value)}
                maxLength={50}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${inviteErrors.lastName ? 'border-red-500 focus:ring-red-500' : 'border-gray-200 focus:ring-red-500'}`}
                placeholder="Doe"
              />
              {inviteErrors.lastName && <p className="mt-1 text-xs text-red-500">{inviteErrors.lastName}</p>}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email ID<span className="text-red-500">*</span></label>
            <input
              type="email"
              name="email"
              value={inviteForm.email}
              onChange={(e) => handleFieldChange('email', e.target.value)}
              maxLength={255}
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${inviteErrors.email ? 'border-red-500 focus:ring-red-500' : 'border-gray-200 focus:ring-red-500'}`}
              placeholder="colleague@example.com"
            />
            {inviteErrors.email && <p className="mt-1 text-xs text-red-500">{inviteErrors.email}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password<span className="text-red-500">*</span></label>
            <input
              type="text"
              name="password"
              value={inviteForm.password}
              onChange={(e) => handleFieldChange('password', e.target.value)}
              maxLength={100}
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${inviteErrors.password ? 'border-red-500 focus:ring-red-500' : 'border-gray-200 focus:ring-red-500'}`}
              placeholder="Admin@123"
            />
            {inviteErrors.password && <p className="mt-1 text-xs text-red-500">{inviteErrors.password}</p>}
            <p className="mt-1 text-xs text-gray-500">Password must have: 8+ chars, 1 uppercase, 1 lowercase, 1 number</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role<span className="text-red-500">*</span></label>
            <select
              name="roleId"
              value={inviteForm.roleId}
              onChange={(e) => handleFieldChange('roleId', e.target.value)}
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${inviteErrors.roleId ? 'border-red-500 focus:ring-red-500' : 'border-gray-200 focus:ring-red-500'}`}
            >
              <option value="">Select a role</option>
              {roles.map((role) => (
                <option key={role._id} value={role._id}>
                  {role.displayName || role.name}
                </option>
              ))}
            </select>
            {inviteErrors.roleId && <p className="mt-1 text-xs text-red-500">{inviteErrors.roleId}</p>}
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setShowInviteModal(false);
                setInviteForm({ firstName: '', lastName: '', email: '', password: '', roleId: '' });
                setInviteErrors({});
              }}
            >
              Cancel
            </Button>
            <Button type="submit" loading={isSubmitting}>
              Add Member
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Member Modal */}
      <Modal
        isOpen={showEditRoleModal}
        onClose={() => {
          setShowEditRoleModal(false);
          setSelectedMember(null);
        }}
        title="Edit Team Member"
        size="md"
        closeOnBackdropClick={false}
      >
        {selectedMember && (
          <div className="p-6 space-y-6">
            {/* Member Info */}
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="w-10 h-10 bg-gradient-to-br from-[#DC2626] to-[#B91C1C] rounded-full flex items-center justify-center">
                <span className="text-sm font-bold text-white">
                  {(selectedMember.user?.firstName || selectedMember.email || 'U').charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <p className="font-medium text-gray-900">{selectedMember.user?.firstName} {selectedMember.user?.lastName}</p>
                <p className="text-xs text-gray-500">{selectedMember.email}</p>
              </div>
            </div>

            {/* Status Toggle */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <div className="flex gap-2">
                <button
                  onClick={() => handleUpdateStatus(selectedMember.user?._id || selectedMember.user, 'active')}
                  disabled={(selectedMember.status === 'active' || !selectedMember.status) || isSubmitting}
                  className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-colors ${
                    (selectedMember.status === 'active' || !selectedMember.status)
                      ? 'border-green-500 bg-green-50 text-green-700'
                      : 'border-gray-200 hover:border-green-500 hover:bg-green-50/50 text-gray-600'
                  } ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="font-medium">Active</span>
                </button>
                <button
                  onClick={() => handleUpdateStatus(selectedMember.user?._id || selectedMember.user, 'inactive')}
                  disabled={selectedMember.status === 'inactive' || isSubmitting}
                  className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-colors ${
                    selectedMember.status === 'inactive'
                      ? 'border-gray-500 bg-gray-100 text-gray-700'
                      : 'border-gray-200 hover:border-gray-400 hover:bg-gray-50 text-gray-600'
                  } ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="font-medium">Inactive</span>
                </button>
              </div>
            </div>

            {/* Role Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
              <div className="space-y-2">
                {ROLE_OPTIONS.map((role) => {
                  const isSelected = (selectedMember.role?.name || selectedMember.role) === role.value;
                  return (
                    <button
                      key={role.value}
                      onClick={() => handleUpdateRole(selectedMember.user?._id || selectedMember.user, role.value)}
                      disabled={isSelected || isSubmitting}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-colors ${
                        isSelected
                          ? 'border-[#DC2626] bg-red-50'
                          : 'border-gray-200 hover:border-[#DC2626] hover:bg-red-50/50'
                      } ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <div className="flex-1 text-left">
                        <p className="font-medium text-gray-900">{role.label}</p>
                        <p className="text-xs text-gray-500">{role.description}</p>
                      </div>
                      {isSelected && (
                        <svg className="w-5 h-5 text-[#DC2626]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <Button
              variant="secondary"
              onClick={() => {
                setShowEditRoleModal(false);
                setSelectedMember(null);
              }}
              className="w-full"
            >
              Close
            </Button>
          </div>
        )}
      </Modal>

      {/* Permissions Modal */}
      <Modal
        isOpen={showPermissionsModal}
        onClose={() => {
          setShowPermissionsModal(false);
          setSelectedRole(null);
        }}
        title={selectedRole ? `${selectedRole.label} Permissions` : 'Role Permissions'}
        size="md"
      >
        <div className="p-6">
          {selectedRole && (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 text-lg">{selectedRole.label}</h3>
                <p className="text-sm text-gray-600 mt-1">{selectedRole.description}</p>
              </div>

              <div>
                <h4 className="font-medium text-gray-700 mb-3">Permissions</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedRole.permissions.map((permission, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-[#DC2626]/10 text-[#DC2626]"
                    >
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {permission}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end mt-6">
            <Button variant="secondary" onClick={() => {
              setShowPermissionsModal(false);
              setSelectedRole(null);
            }}>
              Close
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => { setShowDeleteModal(false); setSelectedMember(null); }}
        title="Remove Team Member"
        size="md"
      >
        <div className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <svg className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <h4 className="font-medium text-red-800">This action cannot be undone</h4>
                <p className="text-sm text-red-700 mt-1">
                  Are you sure you want to remove <span className="font-semibold">{selectedMember?.user?.firstName || selectedMember?.email}</span> from the team? They will lose access to all organization resources.
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => { setShowDeleteModal(false); setSelectedMember(null); }}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={confirmRemoveMember}
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Removing...' : 'Remove Member'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default TeamPage;
