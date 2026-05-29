/**
 * Organization Routes
 *
 * Routes for organization management.
 */

import express from 'express';
import organizationController from '../controllers/organization.controller.js';
import { protect, restrictTo, checkOrganization } from '../middlewares/auth.middleware.js';
import {
  validateCreate,
  validateUpdate,
  validateOrgId,
  validateInvite,
  validateAcceptInvite,
  validateMemberOperation,
  validateTransferOwnership,
  validateUpdateRole,
  validateAddMember
} from '../validators/organization.validator.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

/**
 * @route   POST /api/organizations
 * @desc    Create a new organization
 * @access  Private
 */
router.post(
  '/',
  validateCreate,
  organizationController.create
);

/**
 * @route   GET /api/organizations/me
 * @desc    Get current user's organizations
 * @access  Private
 */
router.get(
  '/me',
  organizationController.getMyOrganizations
);

/**
 * @route   GET /api/organizations/:id
 * @desc    Get organization by ID
 * @access  Private (Organization members only)
 */
router.get(
  '/:id',
  validateOrgId,
  checkOrganization('id'),
  organizationController.getById
);

/**
 * @route   PUT /api/organizations/:id
 * @desc    Update organization
 * @access  Private (Owner only)
 */
router.put(
  '/:id',
  validateUpdate,
  checkOrganization('id'),
  organizationController.update
);

/**
 * @route   DELETE /api/organizations/:id
 * @desc    Delete organization
 * @access  Private (Owner only)
 */
router.delete(
  '/:id',
  validateOrgId,
  checkOrganization('id'),
  organizationController.delete
);

/**
 * @route   POST /api/organizations/:id/invite
 * @desc    Invite member to organization
 * @access  Private (Owner only)
 */
router.post(
  '/:id/invite',
  validateInvite,
  checkOrganization('id'),
  organizationController.inviteMember
);

/**
 * @route   POST /api/organizations/:id/members
 * @desc    Add member directly to organization (create user account)
 * @access  Private (Owner and Finance Admin only)
 */
router.post(
  '/:id/members',
  validateAddMember,
  checkOrganization('id'),
  organizationController.addMember
);

/**
 * @route   POST /api/organizations/invite/:token/accept
 * @desc    Accept invitation
 * @access  Private
 */
router.post(
  '/invite/:token/accept',
  validateAcceptInvite,
  organizationController.acceptInvitation
);

/**
 * @route   GET /api/organizations/:id/invitations
 * @desc    Get pending invitations
 * @access  Private (Organization members)
 */
router.get(
  '/:id/invitations',
  validateOrgId,
  checkOrganization('id'),
  organizationController.getPendingInvitations
);

/**
 * @route   DELETE /api/organizations/:id/invitations/:invitationId
 * @desc    Cancel invitation
 * @access  Private (Owner only)
 */
router.delete(
  '/:id/invitations/:invitationId',
  validateOrgId,
  checkOrganization('id'),
  organizationController.cancelInvitation
);

/**
 * @route   DELETE /api/organizations/:id/members/:memberId
 * @desc    Remove member from organization
 * @access  Private (Owner only)
 */
router.delete(
  '/:id/members/:memberId',
  validateMemberOperation,
  checkOrganization('id'),
  organizationController.removeMember
);

/**
 * @route   PUT /api/organizations/:id/members/:memberId/role
 * @desc    Update member role
 * @access  Private (Owner only)
 */
router.put(
  '/:id/members/:memberId/role',
  validateUpdateRole,
  checkOrganization('id'),
  organizationController.updateMemberRole
);

/**
 * @route   PUT /api/organizations/:id/transfer-ownership
 * @desc    Transfer ownership to another member
 * @access  Private (Owner only)
 */
router.put(
  '/:id/transfer-ownership',
  validateTransferOwnership,
  checkOrganization('id'),
  organizationController.transferOwnership
);

/**
 * @route   POST /api/organizations/:id/leave
 * @desc    Leave organization
 * @access  Private (Members)
 */
router.post(
  '/:id/leave',
  validateOrgId,
  checkOrganization('id'),
  organizationController.leaveOrganization
);

export default router;