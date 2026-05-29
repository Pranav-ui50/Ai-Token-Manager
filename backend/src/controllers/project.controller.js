/**
 * Project Controller
 *
 * Handles project-related HTTP requests.
 */

import projectService from '../services/project.service.js';
import { AppError } from '../middlewares/error.middleware.js';
import logger from '../config/logger.js';

class ProjectController {
  /**
   * Create a new project
   * @route POST /api/projects
   */
  async create(req, res, next) {
    try {
      logger.info(`[ProjectController] create called by user: ${req.user?.id}`);
      const { organizationId, name, description, settings } = req.body;
      const userId = req.user.id || req.user.userId;

      logger.info(`[ProjectController] Creating project: ${name} for org: ${organizationId}`);

      const project = await projectService.create({
        organizationId,
        name,
        description,
        settings
      }, userId);

      logger.info(`[ProjectController] Project created successfully: ${project._id}`);

      res.status(201).json({
        success: true,
        message: 'Project created successfully',
        data: project
      });
    } catch (error) {
      logger.error(`[ProjectController] Create error: ${error.message}`);
      next(error);
    }
  }

  /**
   * Get project by ID
   * @route GET /api/projects/:id
   */
  async getById(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.userId;

      const project = await projectService.getById(id, userId);

      res.status(200).json({
        success: true,
        data: project
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get projects for organization
   * @route GET /api/projects/organization/:organizationId
   */
  async getForOrganization(req, res, next) {
    try {
      const { organizationId } = req.params;
      const userId = req.user.userId;
      const { status } = req.query;

      const filters = {};
      if (status) {
        filters.status = status;
      }

      const projects = await projectService.getForOrganization(organizationId, userId, filters);

      res.status(200).json({
        success: true,
        count: projects.length,
        data: projects
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update project
   * @route PUT /api/projects/:id
   */
  async update(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.userId;

      const project = await projectService.update(id, req.body, userId);

      res.status(200).json({
        success: true,
        message: 'Project updated successfully',
        data: project
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete project
   * @route DELETE /api/projects/:id
   */
  async delete(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.userId;

      await projectService.delete(id, userId);

      res.status(200).json({
        success: true,
        message: 'Project deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get project statistics
   * @route GET /api/projects/:id/stats
   */
  async getStats(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.userId;

      const stats = await projectService.getStats(id, userId);

      res.status(200).json({
        success: true,
        data: stats
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Archive project
   * @route PUT /api/projects/:id/archive
   */
  async archive(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.userId;

      const project = await projectService.archive(id, true, userId);

      res.status(200).json({
        success: true,
        message: 'Project archived successfully',
        data: project
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Restore project
   * @route PUT /api/projects/:id/restore
   */
  async restore(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.userId;

      const project = await projectService.archive(id, false, userId);

      res.status(200).json({
        success: true,
        message: 'Project restored successfully',
        data: project
      });
    } catch (error) {
      next(error);
    }
  }

  // ==========================================
  // Project Member Management
  // ==========================================

  /**
   * Add member to project
   * @route POST /api/projects/:id/members
   */
  async addMember(req, res, next) {
    try {
      const { id } = req.params;
      const { userId: memberUserId, role = 'viewer' } = req.body;
      const addedBy = req.user.userId;

      const member = await projectService.addMember(id, memberUserId, role, addedBy);

      res.status(201).json({
        success: true,
        message: 'Member added successfully',
        data: member
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Remove member from project
   * @route DELETE /api/projects/:id/members/:memberId
   */
  async removeMember(req, res, next) {
    try {
      const { id, memberId } = req.params;
      const removedBy = req.user.userId;

      await projectService.removeMember(id, memberId, removedBy);

      res.status(200).json({
        success: true,
        message: 'Member removed successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get project members
   * @route GET /api/projects/:id/members
   */
  async getMembers(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.userId;

      const members = await projectService.getMembers(id, userId);

      res.status(200).json({
        success: true,
        data: { members }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update member role
   * @route PUT /api/projects/:id/members/:memberId/role
   */
  async updateMemberRole(req, res, next) {
    try {
      const { id, memberId } = req.params;
      const { role } = req.body;
      const updatedBy = req.user.userId;

      const member = await projectService.updateMemberRole(id, memberId, role, updatedBy);

      res.status(200).json({
        success: true,
        message: 'Member role updated successfully',
        data: member
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new ProjectController();