/**
 * Role Controller
 *
 * HTTP handlers for role endpoints.
 */

import Role from '../models/Role.js';
import { AppError } from '../middlewares/error.middleware.js';

class RoleController {
  /**
   * Get all roles
   */
  async getAll(req, res, next) {
    try {
      const roles = await Role.find({ isActive: true })
        .sort({ level: 1 })
        .select('name displayName description level permissions');

      res.json({
        success: true,
        data: roles
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get organization-specific roles
   */
  async getOrganizationRoles(req, res, next) {
    try {
      const roles = await Role.find({
        name: { $in: ['org_owner', 'finance_admin', 'product_manager', 'developer', 'viewer'] },
        isActive: true
      })
        .sort({ level: 1 })
        .select('name displayName description level permissions');

      res.json({
        success: true,
        data: roles
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get role by ID
   */
  async getById(req, res, next) {
    try {
      const role = await Role.findById(req.params.id);

      if (!role) {
        throw new AppError('Role not found', 404, 'NOT_FOUND');
      }

      res.json({
        success: true,
        data: role
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new RoleController();