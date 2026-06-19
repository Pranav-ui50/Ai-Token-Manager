/**
 * Organization API Service
 *
 * API calls for organization management.
 */

import api from './axios.js';

const organizationApi = {
  /**
   * Create a new organization
   * @param {Object} data - Organization data
   * @returns {Promise} Created organization
   */
  create: async (data) => {
    const response = await api.post('/organizations', data);
    return response.data.data;
  },

  /**
   * Get current user's organizations
   * @returns {Promise} Array of organizations
   */
  getMyOrganizations: async () => {
    const response = await api.get('/organizations/me');
    return response.data.data;
  },

  /**
   * Get organization by ID
   * @param {string} id - Organization ID
   * @returns {Promise} Organization
   */
  getById: async (id) => {
    const response = await api.get(`/organizations/${id}`);
    return response.data.data;
  },

  /**
   * Update organization
   * @param {string} id - Organization ID
   * @param {Object} data - Update data
   * @returns {Promise} Updated organization
   */
  update: async (id, data) => {
    const response = await api.put(`/organizations/${id}`, data);
    return response.data.data;
  },

  /**
   * Delete organization
   * @param {string} id - Organization ID
   * @returns {Promise}
   */
  delete: async (id) => {
    const response = await api.delete(`/organizations/${id}`);
    return response.data;
  },

  /**
   * Invite member to organization
   * @param {string} orgId - Organization ID
   * @param {Object} data - Invitation data
   * @returns {Promise} Invitation result
   */
  inviteMember: async (orgId, data) => {
    const response = await api.post(`/organizations/${orgId}/invite`, data);
    return response.data.data;
  },

  /**
   * Add member directly to organization (create user account)
   * @param {string} orgId - Organization ID
   * @param {Object} data - Member data (email, password, firstName, lastName, roleId)
   * @returns {Promise} Created member result
   */
  addMember: async (orgId, data) => {
    const response = await api.post(`/organizations/${orgId}/members`, data);
    return response.data.data;
  },

  /**
   * Accept invitation
   * @param {string} token - Invitation token
   * @param {string} email - Invitee email
   * @returns {Promise}
   */
  acceptInvitation: async (token, email) => {
    const response = await api.post(`/organizations/invite/${token}/accept?email=${encodeURIComponent(email)}`);
    return response.data.data;
  },

  /**
   * Get pending invitations
   * @param {string} orgId - Organization ID
   * @returns {Promise} Array of invitations
   */
  getPendingInvitations: async (orgId) => {
    const response = await api.get(`/organizations/${orgId}/invitations`);
    return response.data.data;
  },

  /**
   * Cancel invitation
   * @param {string} orgId - Organization ID
   * @param {string} invitationId - Invitation ID
   * @returns {Promise}
   */
  cancelInvitation: async (orgId, invitationId) => {
    const response = await api.delete(`/organizations/${orgId}/invitations/${invitationId}`);
    return response.data;
  },

  /**
   * Remove member from organization
   * @param {string} orgId - Organization ID
   * @param {string} memberId - Member ID
   * @returns {Promise}
   */
  removeMember: async (orgId, memberId) => {
    const response = await api.delete(`/organizations/${orgId}/members/${memberId}`);
    return response.data;
  },

  /**
   * Update member role
   * @param {string} orgId - Organization ID
   * @param {string} memberId - Member ID
   * @param {string} roleId - New role ID
   * @returns {Promise}
   */
  updateMemberRole: async (orgId, memberId, roleId) => {
    const response = await api.put(`/organizations/${orgId}/members/${memberId}/role`, { roleId });
    return response.data;
  },

  /**
   * Update member status
   * @param {string} orgId - Organization ID
   * @param {string} memberId - Member ID
   * @param {string} status - New status ('active' or 'inactive')
   * @returns {Promise}
   */
  updateMemberStatus: async (orgId, memberId, status) => {
    const response = await api.put(`/organizations/${orgId}/members/${memberId}/status`, { status });
    return response.data;
  },

  /**
   * Transfer ownership
   * @param {string} orgId - Organization ID
   * @param {string} newOwnerId - New owner ID
   * @returns {Promise}
   */
  transferOwnership: async (orgId, newOwnerId) => {
    const response = await api.put(`/organizations/${orgId}/transfer-ownership`, { newOwnerId });
    return response.data;
  },

  /**
   * Leave organization
   * @param {string} orgId - Organization ID
   * @returns {Promise}
   */
  leaveOrganization: async (orgId) => {
    const response = await api.post(`/organizations/${orgId}/leave`);
    return response.data;
  }
};

export default organizationApi;