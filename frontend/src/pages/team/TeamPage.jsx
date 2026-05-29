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

const ROLE_OPTIONS = [
  { value: 'org_owner', label: 'Organization Owner', description: 'Full access to all features including billing', permissions: ['All permissions'] },
  { value: 'finance_admin', label: 'Finance Admin', description: 'Manage billing, invoices, and pricing', permissions: ['View billing', 'Manage subscription', 'View invoices', 'Manage pricing'] },
  { value: 'product_manager', label: 'Product Manager', description: 'Manage features, plans, and models', permissions: ['Create features', 'Edit features', 'Manage plans', 'View analytics'] },
  { value: 'developer', label: 'Developer', description: 'Manage API keys and integrations', permissions: ['Create API keys', 'Manage webhooks', 'View integrations', 'View usage'] },
  { value: 'viewer', label: 'Viewer', description: 'Read-only access to view data', permissions: ['View dashboard', 'View reports', 'View analytics'] }
];

const STATUS_COLORS = {
  active: 'bg-green-100 text-green-700',
  pending: 'bg-yellow-100 text-yellow-700',
  inactive: 'bg-gray-100 text-gray-700'
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
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modal states
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showEditRoleModal, setShowEditRoleModal] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [showTransferOwnershipModal, setShowTransferOwnershipModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);

  // Form states
  const [inviteForm, setInviteForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    roleId: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      setRoles(rolesData || []);
    } catch (err) {
      console.error('Failed to fetch roles:', err);
    }
  };

  const fetchMembers = async () => {
    try {
      setLoading(true);
      setError('');
      const org = await organizationApi.getById(organizationId);
      setMembers(org.members || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load team members');
    } finally {
      setLoading(false);
    }
  };

  const handleInviteMember = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validation
    if (!inviteForm.firstName.trim()) {
      setError('First name is required');
      return;
    }
    if (!inviteForm.lastName.trim()) {
      setError('Last name is required');
      return;
    }
    if (!inviteForm.email.trim()) {
      setError('Email ID is required');
      return;
    }
    if (!inviteForm.password) {
      setError('Password is required');
      return;
    }
    if (inviteForm.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (!inviteForm.roleId) {
      setError('Please select a role');
      return;
    }

    setIsSubmitting(true);
    try {
      await organizationApi.addMember(organizationId, inviteForm);
      setSuccess(`Team member ${inviteForm.firstName} ${inviteForm.lastName} added successfully`);
      setShowInviteModal(false);
      setInviteForm({ firstName: '', lastName: '', email: '', password: '', roleId: '' });
      await fetchMembers();
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error?.message || 'Failed to add team member');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateRole = async (memberId, newRole) => {
    setError('');
    setSuccess('');

    setIsSubmitting(true);
    try {
      await organizationApi.updateMemberRole(organizationId, memberId, newRole);
      setSuccess('Member role updated successfully');
      setShowEditRoleModal(false);
      setSelectedMember(null);
      await fetchMembers();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update role');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveMember = async (member) => {
    if (!confirm(`Are you sure you want to remove ${member.user?.firstName || member.email} from the team?`)) {
      return;
    }

    try {
      // Use user ID (member.user._id if populated, or member.user if it's just an ID)
      const userId = member.user?._id || member.user;
      await organizationApi.removeMember(organizationId, userId);
      setSuccess('Member removed successfully');
      await fetchMembers();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to remove member');
    }
  };

  const handleTransferOwnership = async (newOwnerId) => {
    setError('');
    setSuccess('');

    if (!confirm('Are you sure you want to transfer ownership? This action cannot be undone.')) {
      return;
    }

    setIsSubmitting(true);
    try {
      await organizationApi.transferOwnership(organizationId, newOwnerId);
      setSuccess('Ownership transferred successfully');
      setShowTransferOwnershipModal(false);
      setSelectedMember(null);
      await fetchMembers();
      await refreshOrganization();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to transfer ownership');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelInvitation = async (invitationId) => {
    if (!confirm('Are you sure you want to cancel this invitation?')) {
      return;
    }

    try {
      await organizationApi.cancelInvitation(organizationId, invitationId);
      setSuccess('Invitation cancelled');
      await fetchMembers();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to cancel invitation');
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
      <div className="p-6">
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#DC2626]"></div>
        </div>
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

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-gray-500">Total Members</p>
              <p className="text-xl font-bold text-gray-900">{members.filter(m => m.status !== 'pending').length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-gray-500">Active</p>
              <p className="text-xl font-bold text-gray-900">{members.filter(m => m.status === 'active').length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-50 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-gray-500">Pending Invites</p>
              <p className="text-xl font-bold text-gray-900">{members.filter(m => m.status === 'pending').length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-[#DC2626]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.948 11.948 0 0012 2.944a11.948 11.948 0 01-8.488 4.34 3 3 0 002.994 3.178 3 3 0 002.946 3.33c.527-.055 1.034-.166 1.527-.354" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-gray-500">Roles</p>
              <p className="text-xl font-bold text-gray-900">{ROLE_OPTIONS.length}</p>
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
                selectedMember?.role?.name === role.value || selectedMember?.role === role.value
                  ? 'border-[#DC2626] bg-red-50'
                  : 'border-gray-100 hover:border-gray-200'
              }`}
              onClick={() => setShowPermissionsModal(true)}
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
                  return (
                    <tr key={member._id || member.user?._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-[#DC2626] to-[#B91C1C] rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-sm font-bold text-white">
                              {(member.user?.firstName || member.email || 'U').charAt(0).toUpperCase()}
                            </span>
                          </div>
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
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium capitalize ${STATUS_COLORS[member.status] || STATUS_COLORS.active}`}>
                          {member.status || 'active'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {member.joinedAt ? formatDate(member.joinedAt) : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2">
                          {member.status === 'pending' ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCancelInvitation(member._id || member.invitationId)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              Cancel
                            </Button>
                          ) : (
                            <>
                              {canManageMembers() && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedMember(member);
                                      setShowEditRoleModal(true);
                                    }}
                                    title="Change Role"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                  </Button>
                                  {member.role?.name !== 'org_owner' && member.role !== 'org_owner' && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        setSelectedMember(member);
                                        setShowTransferOwnershipModal(true);
                                      }}
                                      title="Transfer Ownership"
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                      </svg>
                                    </Button>
                                  )}
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleRemoveMember(member)}
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                    title="Remove Member"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                  </Button>
                                </>
                              )}
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
        }}
        title="Add Team Member"
        size="md"
      >
        <form onSubmit={handleInviteMember} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">First Name<span className="text-red-500">*</span></label>
              <input
                type="text"
                value={inviteForm.firstName}
                onChange={(e) => setInviteForm(prev => ({ ...prev, firstName: e.target.value }))}
                maxLength={100}
                placeholder="John"
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Last Name<span className="text-red-500">*</span></label>
              <input
                type="text"
                value={inviteForm.lastName}
                onChange={(e) => setInviteForm(prev => ({ ...prev, lastName: e.target.value }))}
                maxLength={100}
                placeholder="Doe"
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email ID<span className="text-red-500">*</span></label>
            <input
              type="email"
              value={inviteForm.email}
              onChange={(e) => setInviteForm(prev => ({ ...prev, email: e.target.value }))}
              maxLength={100}
              placeholder="member@example.com"
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password<span className="text-red-500">*</span></label>
            <input
              type="password"
              value={inviteForm.password}
              onChange={(e) => setInviteForm(prev => ({ ...prev, password: e.target.value }))}
              maxLength={100}
              placeholder="Enter a password (min 8 characters)"
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none"
              required
            />
            <p className="mt-1 text-xs text-gray-500">
              This password will be sent to the user via email
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role<span className="text-red-500">*</span></label>
            <select
              value={inviteForm.roleId}
              onChange={(e) => setInviteForm(prev => ({ ...prev, roleId: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none"
              required
            >
              <option value="">Select a role</option>
              {roles.map((role) => (
                <option key={role._id} value={role._id}>
                  {role.displayName || role.name}
                </option>
              ))}
            </select>
            {inviteForm.roleId && (
              <p className="mt-2 text-xs text-gray-500">
                {ROLE_OPTIONS.find(r => r.value === roles.find(r => r._id === inviteForm.roleId)?.name)?.description}
              </p>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setShowInviteModal(false);
                setInviteForm({ firstName: '', lastName: '', email: '', password: '', roleId: '' });
              }}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? 'Adding...' : 'Add Member'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Role Modal */}
      <Modal
        isOpen={showEditRoleModal}
        onClose={() => {
          setShowEditRoleModal(false);
          setSelectedMember(null);
        }}
        title="Change Member Role"
        size="md"
      >
        {selectedMember && (
          <div className="p-6 space-y-4">
            <p className="text-sm text-gray-600">
              Change role for <span className="font-medium text-gray-900">{selectedMember.user?.firstName} {selectedMember.user?.lastName}</span> ({selectedMember.email})
            </p>

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

            <Button
              variant="secondary"
              onClick={() => {
                setShowEditRoleModal(false);
                setSelectedMember(null);
              }}
              className="w-full mt-4"
            >
              Close
            </Button>
          </div>
        )}
      </Modal>

      {/* Permissions Modal */}
      <Modal
        isOpen={showPermissionsModal}
        onClose={() => setShowPermissionsModal(false)}
        title="Role Permissions"
        size="lg"
      >
        <div className="p-6">
          <div className="space-y-6">
            {ROLE_OPTIONS.map((role) => (
              <div key={role.value} className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-2">{role.label}</h3>
                <p className="text-sm text-gray-500 mb-3">{role.description}</p>
                <div className="flex flex-wrap gap-2">
                  {role.permissions.map((permission, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700"
                    >
                      {permission}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end mt-6">
            <Button variant="secondary" onClick={() => setShowPermissionsModal(false)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>

      {/* Transfer Ownership Modal */}
      <Modal
        isOpen={showTransferOwnershipModal}
        onClose={() => {
          setShowTransferOwnershipModal(false);
          setSelectedMember(null);
        }}
        title="Transfer Ownership"
        size="md"
      >
        {selectedMember && (
          <div className="p-6 space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex">
                <svg className="w-5 h-5 text-yellow-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div className="ml-3">
                  <p className="text-sm text-yellow-700">
                    This action will transfer full ownership of the organization to <strong>{selectedMember.user?.firstName} {selectedMember.user?.lastName}</strong> ({selectedMember.email}).
                  </p>
                  <p className="text-sm text-yellow-700 mt-2">
                    You will become an Organization Owner with the same level of access as other owners.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-2">New owner will gain:</p>
              <ul className="text-sm text-gray-600 space-y-1">
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Full administrative access
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Billing management privileges
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Ability to add/remove members
                </li>
              </ul>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowTransferOwnershipModal(false);
                  setSelectedMember(null);
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={() => handleTransferOwnership(selectedMember.user?._id || selectedMember.user)}
                disabled={isSubmitting}
                className="flex-1"
              >
                {isSubmitting ? 'Transferring...' : 'Transfer Ownership'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default TeamPage;