/**
 * Organization Controller
 *
 * HTTP handlers for organization endpoints.
 */

import organizationService from '../services/organization.service.js';
import auditService from '../services/audit.service.js';
import limitService from '../services/limit.service.js';
import { AppError } from '../middlewares/error.middleware.js';

class OrganizationController {
  /**
   * Create a new organization
   */
  async create(req, res, next) {
    try {
      const organization = await organizationService.create(req.body, req.user.id);

      // Log organization creation
      await auditService.logSuccess({
        organization: organization._id,
        user: req.user.id,
        action: 'organization_created',
        resourceType: 'organization',
        resourceId: organization._id,
        resourceName: organization.name,
        description: `Organization "${organization.name}" created`,
        context: {
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          requestMethod: req.method,
          requestPath: req.path
        }
      });

      res.status(201).json({
        success: true,
        data: organization
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get organization by ID
   */
  async getById(req, res, next) {
    try {
      // Prevent caching to ensure fresh data
      res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
      res.set('Surrogate-Control', 'no-store');

      const organization = await organizationService.getById(
        req.params.id,
        req.user.id
      );

      res.json({
        success: true,
        data: organization
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get organizations for current user
   */
  async getMyOrganizations(req, res, next) {
    try {
      const organizations = await organizationService.getForUser(req.user.id);

      res.json({
        success: true,
        data: organizations
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update organization
   */
  async update(req, res, next) {
    try {
      const organization = await organizationService.update(
        req.params.id,
        req.body,
        req.user.id
      );

      // Log organization update
      await auditService.logSuccess({
        organization: organization._id,
        user: req.user.id,
        action: 'organization_updated',
        resourceType: 'organization',
        resourceId: organization._id,
        resourceName: organization.name,
        description: `Organization "${organization.name}" updated`,
        context: {
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          requestMethod: req.method,
          requestPath: req.path
        }
      });

      res.json({
        success: true,
        data: organization
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete organization
   */
  async delete(req, res, next) {
    try {
      const org = await organizationService.getById(req.params.id, req.user.id);
      await organizationService.delete(req.params.id, req.user.id);

      // Log organization deletion
      await auditService.logSuccess({
        organization: req.params.id,
        user: req.user.id,
        action: 'delete',
        resourceType: 'organization',
        resourceId: req.params.id,
        resourceName: org?.name,
        description: `Organization "${org?.name}" deleted`,
        context: {
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          requestMethod: req.method,
          requestPath: req.path
        }
      });

      res.json({
        success: true,
        message: 'Organization deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Invite member to organization
   */
  async inviteMember(req, res, next) {
    try {
      // Check team member limit before inviting
      await limitService.validateLimit(req.params.id, 'teamMembers', 1);

      const result = await organizationService.inviteMember(
        req.params.id,
        req.body,
        req.user.id
      );

      res.status(201).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Add member directly to organization
   */
  async addMember(req, res, next) {
    try {
      // Check team member limit before adding
      await limitService.validateLimit(req.params.id, 'teamMembers', 1);

      const result = await organizationService.addMember(
        req.params.id,
        req.body,
        req.user.id
      );

      // Log member addition
      await auditService.logSuccess({
        organization: req.params.id,
        user: req.user.id || req.user.userId,
        action: 'user_invited',
        resourceType: 'user',
        resourceId: result._id,
        resourceName: `${result.firstName} ${result.lastName}`,
        description: `Member "${result.email}" added to organization`,
        context: {
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          requestMethod: req.method,
          requestPath: req.path
        }
      });

      res.status(201).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Accept invitation
   */
  async acceptInvitation(req, res, next) {
    try {
      const result = await organizationService.acceptInvitation(
        req.params.token,
        req.query.email,
        req.user?.id
      );

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get pending invitations
   */
  async getPendingInvitations(req, res, next) {
    try {
      const invitations = await organizationService.getPendingInvitations(
        req.params.id,
        req.user.id
      );

      res.json({
        success: true,
        data: invitations
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Cancel invitation
   */
  async cancelInvitation(req, res, next) {
    try {
      await organizationService.cancelInvitation(
        req.params.id,
        req.params.invitationId,
        req.user.id
      );

      res.json({
        success: true,
        message: 'Invitation cancelled successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Remove member from organization
   */
  async removeMember(req, res, next) {
    try {
      await organizationService.removeMember(
        req.params.id,
        req.params.memberId,
        req.user.id
      );

      // Log member removal
      await auditService.logSuccess({
        organization: req.params.id,
        user: req.user.id,
        action: 'user_removed',
        resourceType: 'user',
        resourceId: req.params.memberId,
        description: `Member removed from organization`,
        context: {
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          requestMethod: req.method,
          requestPath: req.path
        }
      });

      res.json({
        success: true,
        message: 'Member removed successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update member role
   */
  async updateMemberRole(req, res, next) {
    try {
      await organizationService.updateMemberRole(
        req.params.id,
        req.params.memberId,
        req.body.roleId,
        req.user.id
      );

      // Log role change
      await auditService.logSuccess({
        organization: req.params.id,
        user: req.user.id,
        action: 'role_changed',
        resourceType: 'user',
        resourceId: req.params.memberId,
        description: `Member role updated to ${req.body.roleId}`,
        context: {
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          requestMethod: req.method,
          requestPath: req.path
        }
      });

      res.json({
        success: true,
        message: 'Member role updated successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update member status
   */
  async updateMemberStatus(req, res, next) {
    try {
      await organizationService.updateMemberStatus(
        req.params.id,
        req.params.memberId,
        req.body.status,
        req.user.id
      );

      // Log status change
      await auditService.logSuccess({
        organization: req.params.id,
        user: req.user.id,
        action: 'member_status_changed',
        resourceType: 'user',
        resourceId: req.params.memberId,
        description: `Member status updated to ${req.body.status}`,
        context: {
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          requestMethod: req.method,
          requestPath: req.path
        }
      });

      res.json({
        success: true,
        message: 'Member status updated successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Transfer ownership
   */
  async transferOwnership(req, res, next) {
    try {
      await organizationService.transferOwnership(
        req.params.id,
        req.body.newOwnerId,
        req.user.id
      );

      res.json({
        success: true,
        message: 'Ownership transferred successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Leave organization
   */
  async leaveOrganization(req, res, next) {
    try {
      await organizationService.leaveOrganization(
        req.params.id,
        req.user.id
      );

      res.json({
        success: true,
        message: 'You have left the organization'
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new OrganizationController();