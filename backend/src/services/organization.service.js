/**
 * Organization Service
 *
 * Handles all organization-related business logic.
 */

import Organization from '../models/Organization.js';
import Project from '../models/Project.js';
import Invitation from '../models/Invitation.js';
import User from '../models/User.js';
import Role from '../models/Role.js';
import { AppError } from '../middlewares/error.middleware.js';
import logger from '../config/logger.js';
import emailService from './email.service.js';

class OrganizationService {
  /**
   * Create a new organization
   * @param {Object} data - Organization data
   * @param {string} userId - Owner user ID
   * @returns {Object} Created organization
   */
  async create(data, userId) {
    const { name, description } = data;

    // Check if user already has an organization with the same name
    const existingOrg = await Organization.findOne({
      name: { $regex: new RegExp(`^${name}$`, 'i') },
      owner: userId
    });

    if (existingOrg) {
      throw new AppError(
        'You already have an organization with this name',
        409,
        'DUPLICATE_ERROR'
      );
    }

    // Get org_owner role
    const ownerRole = await Role.findOne({ name: 'org_owner' });

    // Create organization
    const organization = await Organization.create({
      name,
      description,
      owner: userId,
      members: [{
        user: userId,
        role: ownerRole._id,
        joinedAt: new Date()
      }]
    });

    // Update user's organization
    await User.findByIdAndUpdate(userId, {
      organization: organization._id
    });

    logger.info(`Organization created: ${organization.name} by user ${userId}`);

    return organization;
  }

  /**
   * Get organization by ID
   * @param {string} organizationId - Organization ID
   * @param {string} userId - User ID
   * @returns {Object} Organization
   */
  async getById(organizationId, userId) {
    const organization = await Organization.findById(organizationId)
      .populate('owner', 'firstName lastName email')
      .populate('members.user', 'firstName lastName email avatar')
      .populate('members.role', 'name displayName');

    if (!organization) {
      throw new AppError('Organization not found', 404, 'NOT_FOUND');
    }

    // Check if user is member
    if (!organization.isMember(userId)) {
      throw new AppError('Access denied', 403, 'FORBIDDEN');
    }

    return organization;
  }

  /**
   * Get organizations for user
   * @param {string} userId - User ID
   * @returns {Array} Organizations
   */
  async getForUser(userId) {
    const organizations = await Organization.find({
      'members.user': userId,
      isActive: true
    })
      .populate('owner', 'firstName lastName email avatar')
      .sort({ createdAt: -1 });

    return organizations;
  }

  /**
   * Update organization
   * @param {string} organizationId - Organization ID
   * @param {Object} data - Update data
   * @param {string} userId - User ID
   * @returns {Object} Updated organization
   */
  async update(organizationId, data, userId) {
    const organization = await Organization.findById(organizationId);

    if (!organization) {
      throw new AppError('Organization not found', 404, 'NOT_FOUND');
    }

    // Check if user is owner
    if (!organization.isOwner(userId)) {
      throw new AppError('Only the organization owner can update settings', 403, 'FORBIDDEN');
    }

    // Update fields
    const allowedUpdates = ['name', 'description', 'logo', 'settings'];
    allowedUpdates.forEach(field => {
      if (data[field] !== undefined) {
        organization[field] = data[field];
      }
    });

    await organization.save();

    logger.info(`Organization updated: ${organization._id}`);

    return organization;
  }

  /**
   * Delete organization
   * @param {string} organizationId - Organization ID
   * @param {string} userId - User ID
   * @returns {Object} Success message
   */
  async delete(organizationId, userId) {
    const organization = await Organization.findById(organizationId);

    if (!organization) {
      throw new AppError('Organization not found', 404, 'NOT_FOUND');
    }

    // Check if user is owner
    if (!organization.isOwner(userId)) {
      throw new AppError('Only the organization owner can delete the organization', 403, 'FORBIDDEN');
    }

    // Soft delete
    organization.isActive = false;
    await organization.save();

    // Remove organization from users
    await User.updateMany(
      { organization: organizationId },
      { $unset: { organization: 1 } }
    );

    logger.info(`Organization deleted: ${organization._id}`);

    return { message: 'Organization deleted successfully' };
  }

  /**
   * Invite member to organization
   * @param {string} organizationId - Organization ID
   * @param {Object} data - Invitation data
   * @param {string} userId - Inviter user ID
   * @returns {Object} Invitation result
   */
  async inviteMember(organizationId, data, userId) {
    const { email, roleId, message } = data;

    const organization = await Organization.findById(organizationId);

    if (!organization) {
      throw new AppError('Organization not found', 404, 'NOT_FOUND');
    }

    // Check if user is owner or has management permission
    const member = organization.members.find(m => m.user.toString() === userId);
    if (!member) {
      throw new AppError('Access denied', 403, 'FORBIDDEN');
    }

    // Get member's role
    const memberRole = await Role.findById(member.role);
    if (!memberRole) {
      throw new AppError('Access denied', 403, 'FORBIDDEN');
    }

    // Only org_owner and finance_admin can invite members
    const allowedRoles = ['org_owner', 'finance_admin'];
    if (!allowedRoles.includes(memberRole.name)) {
      throw new AppError('Only organization owners and finance admins can invite members', 403, 'FORBIDDEN');
    }

    // Check if user is already a member
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser && organization.isMember(existingUser._id)) {
      throw new AppError('User is already a member of this organization', 409, 'ALREADY_MEMBER');
    }

    // Check for pending invitation
    const existingInvitation = await Invitation.findOne({
      organization: organizationId,
      email: email.toLowerCase(),
      status: 'pending'
    });

    if (existingInvitation) {
      throw new AppError('An invitation is already pending for this email', 409, 'INVITATION_EXISTS');
    }

    // Verify role exists
    const role = await Role.findById(roleId);
    if (!role) {
      throw new AppError('Role not found', 404, 'ROLE_NOT_FOUND');
    }

    // Create invitation
    const { invitation, plainToken } = await Invitation.createInvitation({
      organizationId,
      email,
      roleId,
      invitedBy: userId,
      message
    });

    logger.info(`Invitation created: ${email} to organization ${organizationId}`);

    // Get inviter info
    const inviter = await User.findById(userId);
    const inviterName = inviter ? `${inviter.firstName} ${inviter.lastName}`.trim() || inviter.email : 'Someone';

    // Create invitation URL
    const inviteUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/invite/${plainToken}?email=${encodeURIComponent(email)}`;

    // Send invitation email
    try {
      await emailService.sendInvitationEmail({
        email,
        organizationName: organization.name,
        inviterName,
        invitationUrl: inviteUrl
      });
      logger.info(`Invitation email sent to ${email}`);
    } catch (emailError) {
      logger.error(`Failed to send invitation email: ${emailError.message}`);
      // Continue even if email fails - invitation is still created
    }

    return {
      message: 'Invitation sent successfully',
      invitation: {
        id: invitation._id,
        email: invitation.email,
        role: role.displayName,
        expiresAt: invitation.expiresAt
      }
    };
  }

  /**
   * Add member directly to organization (create user account)
   * @param {string} organizationId - Organization ID
   * @param {Object} data - Member data (email, password, firstName, lastName, roleId)
   * @param {string} userId - Inviter user ID
   * @returns {Object} Created member result
   */
  async addMember(organizationId, data, userId) {
    const { email, password, firstName, lastName, roleId } = data;

    const organization = await Organization.findById(organizationId);

    if (!organization) {
      throw new AppError('Organization not found', 404, 'NOT_FOUND');
    }

    // Check if user is owner or has management permission
    const member = organization.members.find(m => m.user.toString() === userId);
    if (!member) {
      throw new AppError('Access denied', 403, 'FORBIDDEN');
    }

    // Get member's role
    const memberRole = await Role.findById(member.role);
    if (!memberRole) {
      throw new AppError('Access denied', 403, 'FORBIDDEN');
    }

    // Only org_owner and finance_admin can add members
    const allowedRoles = ['org_owner', 'finance_admin'];
    if (!allowedRoles.includes(memberRole.name)) {
      throw new AppError('Only organization owners and finance admins can add members', 403, 'FORBIDDEN');
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      // Check if already a member of this organization
      if (organization.isMember(existingUser._id)) {
        throw new AppError('User is already a member of this organization', 409, 'ALREADY_MEMBER');
      }
      // User exists but not in this organization - add them
      organization.addMember(existingUser._id, roleId, userId);
      await organization.save();

      // Update user's organization
      await User.findByIdAndUpdate(existingUser._id, {
        organization: organization._id
      });

      logger.info(`Existing user ${existingUser._id} added to organization ${organizationId}`);

      return {
        message: 'Member added successfully',
        user: {
          id: existingUser._id,
          email: existingUser.email,
          firstName: existingUser.firstName,
          lastName: existingUser.lastName
        }
      };
    }

    // Verify role exists
    const role = await Role.findById(roleId);
    if (!role) {
      throw new AppError('Role not found', 404, 'ROLE_NOT_FOUND');
    }

    // Create new user
    const newUser = await User.create({
      email: email.toLowerCase(),
      password,
      firstName,
      lastName,
      role: roleId,
      organization: organizationId,
      isVerified: true // Auto-verify since added by admin
    });

    // Add user to organization
    organization.addMember(newUser._id, roleId, userId);
    await organization.save();

    logger.info(`New user created and added to organization: ${newUser.email} to ${organizationId}`);

    // Get inviter info
    const inviter = await User.findById(userId);
    const inviterName = inviter ? `${inviter.firstName} ${inviter.lastName}`.trim() || inviter.email : 'Someone';

    // Send credentials email
    const loginUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/login`;

    try {
      await emailService.sendTeamMemberCredentialsEmail({
        email: newUser.email,
        password,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        organizationName: organization.name,
        inviterName,
        loginUrl
      });
      logger.info(`Credentials email sent to ${newUser.email}`);
    } catch (emailError) {
      logger.error(`Failed to send credentials email: ${emailError.message}`);
      // Continue even if email fails - user is still created
    }

    return {
      message: 'Member added successfully',
      user: {
        id: newUser._id,
        email: newUser.email,
        firstName: newUser.firstName,
        lastName: newUser.lastName
      }
    };
  }

  /**
   * Accept invitation
   * @param {string} token - Invitation token
   * @param {string} email - Invitee email
   * @param {string} userId - User ID (if logged in)
   * @returns {Object} Result
   */
  async acceptInvitation(token, email, userId) {
    // Verify invitation
    const invitation = await Invitation.verifyToken(token, email);

    if (!invitation) {
      throw new AppError('Invalid or expired invitation', 400, 'INVALID_INVITATION');
    }

    // Get or create user
    let user;
    if (userId) {
      user = await User.findById(userId);
    } else {
      user = await User.findOne({ email: email.toLowerCase() });
    }

    if (!user) {
      // User needs to register first
      throw new AppError('Please register to accept this invitation', 400, 'REGISTRATION_REQUIRED');
    }

    // Add member to organization
    const organization = await Organization.findById(invitation.organization._id);
    const added = organization.addMember(user._id, invitation.role._id, invitation.invitedBy);

    if (!added) {
      throw new AppError('Failed to add member to organization', 500, 'MEMBER_ADD_FAILED');
    }

    await organization.save();

    // Update user's organization
    await User.findByIdAndUpdate(user._id, {
      organization: organization._id
    });

    // Mark invitation as accepted
    await invitation.accept();

    logger.info(`Invitation accepted: ${email} joined organization ${organization._id}`);

    return {
      message: 'Invitation accepted successfully',
      organization: {
        id: organization._id,
        name: organization.name
      }
    };
  }

  /**
   * Get pending invitations
   * @param {string} organizationId - Organization ID
   * @param {string} userId - User ID
   * @returns {Array} Invitations
   */
  async getPendingInvitations(organizationId, userId) {
    const organization = await Organization.findById(organizationId);

    if (!organization) {
      throw new AppError('Organization not found', 404, 'NOT_FOUND');
    }

    if (!organization.isMember(userId)) {
      throw new AppError('Access denied', 403, 'FORBIDDEN');
    }

    const invitations = await Invitation.findPendingByOrganization(organizationId);

    return invitations;
  }

  /**
   * Cancel invitation
   * @param {string} organizationId - Organization ID
   * @param {string} invitationId - Invitation ID
   * @param {string} userId - User ID
   * @returns {Object} Result
   */
  async cancelInvitation(organizationId, invitationId, userId) {
    const organization = await Organization.findById(organizationId);

    if (!organization) {
      throw new AppError('Organization not found', 404, 'NOT_FOUND');
    }

    if (!organization.isOwner(userId)) {
      throw new AppError('Only the organization owner can cancel invitations', 403, 'FORBIDDEN');
    }

    const invitation = await Invitation.findById(invitationId);

    if (!invitation || invitation.organization.toString() !== organizationId) {
      throw new AppError('Invitation not found', 404, 'NOT_FOUND');
    }

    invitation.status = 'cancelled';
    await invitation.save();

    logger.info(`Invitation cancelled: ${invitation.email}`);

    return { message: 'Invitation cancelled successfully' };
  }

  /**
   * Remove member from organization
   * @param {string} organizationId - Organization ID
   * @param {string} memberId - Member user ID
   * @param {string} userId - Requester user ID
   * @returns {Object} Result
   */
  async removeMember(organizationId, memberId, userId) {
    const organization = await Organization.findById(organizationId);

    if (!organization) {
      throw new AppError('Organization not found', 404, 'NOT_FOUND');
    }

    // Cannot remove owner
    if (memberId === organization.owner.toString()) {
      throw new AppError('Cannot remove the organization owner', 400, 'CANNOT_REMOVE_OWNER');
    }

    // Only owner can remove members
    if (!organization.isOwner(userId)) {
      throw new AppError('Only the organization owner can remove members', 403, 'FORBIDDEN');
    }

    // Remove member
    const removed = organization.removeMember(memberId);

    if (!removed) {
      throw new AppError('Member not found in organization', 404, 'MEMBER_NOT_FOUND');
    }

    await organization.save();

    // Update user's organization
    await User.findByIdAndUpdate(memberId, {
      $unset: { organization: 1 }
    });

    logger.info(`Member removed: ${memberId} from organization ${organizationId}`);

    return { message: 'Member removed successfully' };
  }

  /**
   * Update member role
   * @param {string} organizationId - Organization ID
   * @param {string} memberId - Member user ID
   * @param {string} roleId - New role ID
   * @param {string} userId - Requester user ID
   * @returns {Object} Result
   */
  async updateMemberRole(organizationId, memberId, roleId, userId) {
    const organization = await Organization.findById(organizationId);

    if (!organization) {
      throw new AppError('Organization not found', 404, 'NOT_FOUND');
    }

    // Only owner can update roles
    if (!organization.isOwner(userId)) {
      throw new AppError('Only the organization owner can update member roles', 403, 'FORBIDDEN');
    }

    // Cannot change owner's role
    if (memberId === organization.owner.toString()) {
      throw new AppError('Cannot change the organization owner role', 400, 'CANNOT_CHANGE_OWNER_ROLE');
    }

    // Verify role exists
    const role = await Role.findById(roleId);
    if (!role) {
      throw new AppError('Role not found', 404, 'ROLE_NOT_FOUND');
    }

    // Update role
    const updated = organization.updateMemberRole(memberId, roleId);

    if (!updated) {
      throw new AppError('Member not found in organization', 404, 'MEMBER_NOT_FOUND');
    }

    await organization.save();

    logger.info(`Member role updated: ${memberId} to ${role.name} in organization ${organizationId}`);

    return { message: 'Member role updated successfully' };
  }

  /**
   * Transfer ownership
   * @param {string} organizationId - Organization ID
   * @param {string} newOwnerId - New owner user ID
   * @param {string} userId - Current owner user ID
   * @returns {Object} Result
   */
  async transferOwnership(organizationId, newOwnerId, userId) {
    const organization = await Organization.findById(organizationId);

    if (!organization) {
      throw new AppError('Organization not found', 404, 'NOT_FOUND');
    }

    // Only owner can transfer ownership
    if (!organization.isOwner(userId)) {
      throw new AppError('Only the organization owner can transfer ownership', 403, 'FORBIDDEN');
    }

    // Check if new owner is a member
    if (!organization.isMember(newOwnerId)) {
      throw new AppError('New owner must be a member of the organization', 400, 'NOT_A_MEMBER');
    }

    // Get org_owner role
    const ownerRole = await Role.findOne({ name: 'org_owner' });

    // Update owner
    const oldOwnerRole = organization.getMemberRole(userId);

    // Remove old owner from members
    organization.removeMember(newOwnerId);

    // Update owner
    organization.owner = newOwnerId;

    // Add old owner as member with their previous role
    organization.members.push({
      user: userId,
      role: oldOwnerRole
    });

    // Add new owner with owner role
    organization.members.push({
      user: newOwnerId,
      role: ownerRole._id
    });

    await organization.save();

    logger.info(`Ownership transferred: ${organizationId} from ${userId} to ${newOwnerId}`);

    return { message: 'Ownership transferred successfully' };
  }

  /**
   * Leave organization
   * @param {string} organizationId - Organization ID
   * @param {string} userId - User ID
   * @returns {Object} Result
   */
  async leaveOrganization(organizationId, userId) {
    const organization = await Organization.findById(organizationId);

    if (!organization) {
      throw new AppError('Organization not found', 404, 'NOT_FOUND');
    }

    // Owner cannot leave
    if (organization.isOwner(userId)) {
      throw new AppError('Organization owner cannot leave. Transfer ownership first.', 400, 'OWNER_CANNOT_LEAVE');
    }

    // Remove member
    const removed = organization.removeMember(userId);

    if (!removed) {
      throw new AppError('You are not a member of this organization', 400, 'NOT_A_MEMBER');
    }

    await organization.save();

    // Update user's organization
    await User.findByIdAndUpdate(userId, {
      $unset: { organization: 1 }
    });

    logger.info(`User left organization: ${userId} from ${organizationId}`);

    return { message: 'You have left the organization' };
  }
}

export default new OrganizationService();