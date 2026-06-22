/**
 * Members Tab Component
 *
 * Displays organization members and handles invitations.
 */

import { useState, useEffect } from 'react';
import { useOrganization } from '../../context/OrganizationContext.jsx';
import Button from '../common/Button.jsx';
import Modal from '../common/Modal.jsx';
import Select from '../common/Select.jsx';
import Input from '../common/Input.jsx';
import Avatar from '../common/Avatar.jsx';
import roleApi from '../../services/api/role.api.js';
import { showToast } from '../../utils/toasts.js';

function MembersTab({ organization, organizationId }) {
  const { addMember, removeMember, updateMemberRole, leaveOrganization, getOrganization, clearError } = useOrganization();
  const [members, setMembers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Current user info
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const currentUserId = currentUser._id || currentUser.id;
  const currentUserRole = currentUser.role?.name || currentUser.role || '';

  // Check if current user is owner - handle both populated and unpopulated owner
  const ownerId = organization.owner?._id || organization.owner;
  const isOwner = ownerId?.toString() === currentUserId?.toString();

  // Check if current user is super_admin (can manage all organizations)
  const isSuperAdmin = currentUserRole === 'super_admin';

  // Check if current user can manage members (owner or super_admin)
  const canManage = isOwner || isSuperAdmin;

  // Check if member is the owner
  const isMemberOwner = (member) => {
    const memberId = member.user?._id || member.user;
    const orgOwnerId = organization.owner?._id || organization.owner;
    return memberId?.toString() === orgOwnerId?.toString();
  };

  // Check if member is current user
  const isCurrentUser = (member) => {
    const memberId = member.user?._id || member.user;
    return memberId?.toString() === currentUserId?.toString();
  };

  useEffect(() => {
    if (organization.members) {
      setMembers(organization.members);
    }
  }, [organization.members]);

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    try {
      const rolesData = await roleApi.getOrganizationRoles();
      setRoles(rolesData.map(role => ({
        value: role._id,
        label: role.displayName
      })));
    } catch (err) {
      console.error('Failed to fetch roles:', err);
    }
  };

  // Invite form state
  const [inviteForm, setInviteForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    roleId: ''
  });
  const [inviteErrors, setInviteErrors] = useState({});

  const validateInviteForm = () => {
    const errors = {};
    if (!inviteForm.firstName) {
      errors.firstName = 'First name is required';
    } else if (inviteForm.firstName.length > 50) {
      errors.firstName = 'First name cannot exceed 50 characters';
    }
    if (!inviteForm.lastName) {
      errors.lastName = 'Last name is required';
    } else if (inviteForm.lastName.length > 50) {
      errors.lastName = 'Last name cannot exceed 50 characters';
    }
    if (!inviteForm.email) {
      errors.email = 'Email is required';
    } else if (!/^\S+@\S+\.\S+$/.test(inviteForm.email)) {
      errors.email = 'Please enter a valid email';
    }
    if (!inviteForm.password) {
      errors.password = 'Password is required';
    } else if (inviteForm.password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    }
    if (!inviteForm.roleId) {
      errors.roleId = 'Role is required';
    }
    setInviteErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!validateInviteForm()) return;

    setIsLoading(true);

    try {
      await addMember(organizationId, inviteForm);
      // Clear form and close modal on success
      setShowInviteModal(false);
      setInviteForm({ firstName: '', lastName: '', email: '', password: '', roleId: '' });
      setInviteErrors({});
      showToast.memberAdded();
      // Refresh organization data to show new member
      if (getOrganization) {
        getOrganization(organizationId);
      }
    } catch (err) {
      // Get error details from response
      const errorData = err.response?.data?.error || err.response?.data || {};
      const errorCode = errorData.code;
      const errorMessage = errorData.message;

      // Show user-friendly error messages based on error code
      if (errorCode === 'ALREADY_MEMBER') {
        showToast.error('This user is already a member of this organization.');
      } else if (errorCode === 'INVITATION_EXISTS') {
        showToast.error('An invitation has already been sent to this email address.');
      } else if (errorMessage) {
        showToast.error(errorMessage);
      } else {
        showToast.error('Failed to add member. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRoleChange = async (e) => {
    e.preventDefault();
    if (!selectedMember) return;

    setIsLoading(true);

    try {
      await updateMemberRole(organizationId, selectedMember.user._id, selectedMember.newRole);
      setShowRoleModal(false);

      // Check if the updated member is the current user
      const updatedUserId = selectedMember.user._id || selectedMember.user;
      if (updatedUserId?.toString() === currentUserId?.toString()) {
        showToast.success('Role updated successfully. You will be logged out...');
        // The backend will invalidate the session, user will be redirected to login
        setTimeout(() => {
          window.location.href = '/login';
        }, 1500);
      } else {
        const memberName = selectedMember.user.firstName || selectedMember.user.email;
        showToast.success(`Role updated successfully. ${memberName} will be logged out and need to log in again to see their new permissions.`);
        setSelectedMember(null);
      }
    } catch (err) {
      showToast.error(err.response?.data?.message || 'Failed to update role');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveMember = async (memberId) => {
    if (!window.confirm('Are you sure you want to remove this member?')) return;

    setIsLoading(true);
    try {
      await removeMember(organizationId, memberId);
      showToast.memberRemoved();
    } catch (err) {
      showToast.error(err.response?.data?.message || 'Failed to remove member');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLeave = async () => {
    setIsLoading(true);
    try {
      await leaveOrganization(organizationId);
      showToast.leftOrganization();
      window.location.href = '/organizations';
    } catch (err) {
      showToast.error(err.response?.data?.message || 'Failed to leave organization');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">Members</h3>
        <Button onClick={() => {
          clearError?.();
          setShowInviteModal(true);
        }}>
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Member
        </Button>
      </div>

      {/* Members list */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Member
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Joined
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {members.map((member) => (
              <tr key={member.user?._id || member._id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <Avatar
                      src={member.user?.avatar}
                      name={`${member.user?.firstName} ${member.user?.lastName}`}
                      size="sm"
                    />
                    <div className="ml-3">
                      <div className="text-sm font-medium text-gray-900">
                        {member.user?.firstName} {member.user?.lastName}
                      </div>
                      <div className="text-sm text-gray-500">
                        {member.user?.email}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                    {member.role?.displayName || member.role?.name}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(member.joinedAt).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex items-center justify-end gap-1">
                    {/* Organization Owner member - show owner badge */}
                    {isMemberOwner(member) && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-700 bg-amber-50 rounded-full border border-amber-200">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                        Owner
                      </span>
                    )}
                    {/* Non-owner members - show action buttons */}
                    {!isMemberOwner(member) && (
                      <>
                        <button
                          onClick={() => {
                            setSelectedMember(member);
                            setShowRoleModal(true);
                          }}
                          className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit Role"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleRemoveMember(member.user._id || member.user)}
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
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Member Modal */}
      <Modal
        isOpen={showInviteModal}
        onClose={() => {
          setShowInviteModal(false);
          setInviteForm({ firstName: '', lastName: '', email: '', password: '', roleId: '' });
          setInviteErrors({});
          clearError?.();
        }}
        title="Add Team Member"
        closeOnBackdropClick={false}
      >
        <form onSubmit={handleInvite} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-gray-700">First Name<span className="text-red-500">*</span></label>
                <span className="text-xs text-gray-400">{inviteForm.firstName.length}/50</span>
              </div>
              <input
                type="text"
                name="firstName"
                value={inviteForm.firstName}
                onChange={(e) => setInviteForm(prev => ({ ...prev, firstName: e.target.value }))}
                maxLength={50}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 ${inviteErrors.firstName ? 'border-red-500' : 'border-gray-200'}`}
                placeholder="John"
              />
              {inviteErrors.firstName && <p className="mt-1 text-xs text-red-500">{inviteErrors.firstName}</p>}
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-gray-700">Last Name<span className="text-red-500">*</span></label>
                <span className="text-xs text-gray-400">{inviteForm.lastName.length}/50</span>
              </div>
              <input
                type="text"
                name="lastName"
                value={inviteForm.lastName}
                onChange={(e) => setInviteForm(prev => ({ ...prev, lastName: e.target.value }))}
                maxLength={50}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 ${inviteErrors.lastName ? 'border-red-500' : 'border-gray-200'}`}
                placeholder="Doe"
              />
              {inviteErrors.lastName && <p className="mt-1 text-xs text-red-500">{inviteErrors.lastName}</p>}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-gray-700">Email ID<span className="text-red-500">*</span></label>
              <span className="text-xs text-gray-400">{inviteForm.email.length}/255</span>
            </div>
            <input
              type="email"
              name="email"
              value={inviteForm.email}
              onChange={(e) => setInviteForm(prev => ({ ...prev, email: e.target.value }))}
              maxLength={255}
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 ${inviteErrors.email ? 'border-red-500' : 'border-gray-200'}`}
              placeholder="colleague@example.com"
            />
            {inviteErrors.email && <p className="mt-1 text-xs text-red-500">{inviteErrors.email}</p>}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-gray-700">Password<span className="text-red-500">*</span></label>
              <span className="text-xs text-gray-400">{inviteForm.password.length}/100</span>
            </div>
            <input
              type="text"
              name="password"
              value={inviteForm.password}
              onChange={(e) => setInviteForm(prev => ({ ...prev, password: e.target.value }))}
              maxLength={100}
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 ${inviteErrors.password ? 'border-red-500' : 'border-gray-200'}`}
              placeholder="Admin@123"
            />
            {inviteErrors.password && <p className="mt-1 text-xs text-red-500">{inviteErrors.password}</p>}
            <p className="mt-1 text-xs text-gray-500">Password will be sent to the user via email</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role<span className="text-red-500">*</span></label>
            <select
              name="roleId"
              value={inviteForm.roleId}
              onChange={(e) => setInviteForm(prev => ({ ...prev, roleId: e.target.value }))}
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 ${inviteErrors.roleId ? 'border-red-500' : 'border-gray-200'}`}
            >
              <option value="">Select a role</option>
              {roles.map(role => (
                <option key={role.value} value={role.value}>{role.label}</option>
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
                clearError?.();
              }}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={isLoading}>
              Add Member
            </Button>
          </div>
        </form>
      </Modal>

      {/* Change Role Modal */}
      <Modal
        isOpen={showRoleModal}
        onClose={() => {
          setShowRoleModal(false);
          setSelectedMember(null);
        }}
        title="Change Member Role"
        closeOnBackdropClick={false}
      >
        <form onSubmit={handleRoleChange} className="space-y-4">
          <p className="text-sm text-gray-600">
            Change role for <strong>{selectedMember?.user?.firstName} {selectedMember?.user?.lastName}</strong>
          </p>

          <Select
            label="New Role"
            name="newRole"
            value={selectedMember?.newRole || ''}
            onChange={(e) => setSelectedMember(prev => ({ ...prev, newRole: e.target.value }))}
            options={roles}
            placeholder="Select a role"
            required
          />

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setShowRoleModal(false);
                setSelectedMember(null);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={isLoading}>
              Update Role
            </Button>
          </div>
        </form>
      </Modal>

      {/* Leave Organization Modal */}
      <Modal
        isOpen={showLeaveModal}
        onClose={() => setShowLeaveModal(false)}
        title="Leave Organization"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Are you sure you want to leave <strong>{organization.name}</strong>?
          </p>
          <p className="text-sm text-gray-500">
            You will lose access to all projects and data in this organization.
          </p>

          <div className="flex justify-end space-x-3 pt-4">
            <Button type="button" variant="secondary" onClick={() => setShowLeaveModal(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleLeave} isLoading={isLoading}>
              Leave Organization
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default MembersTab;