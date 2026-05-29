/**
 * Authentication Middleware
 *
 * Protects routes by verifying JWT tokens.
 */

import { verifyAccessToken } from '../utils/jwt.js';
import { AppError } from './error.middleware.js';
import User from '../models/User.js';
import Role from '../models/Role.js';

/**
 * Protect routes - requires authentication
 */
export const protect = async (req, res, next) => {
  try {
    // Get token from header
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      throw new AppError('Not authorized to access this route', 401, 'UNAUTHORIZED');
    }

    // Verify token
    const decoded = verifyAccessToken(token);
    if (!decoded) {
      throw new AppError('Invalid or expired token', 401, 'INVALID_TOKEN');
    }

    // Check if user still exists
    const user = await User.findById(decoded.userId).populate('role');
    if (!user) {
      throw new AppError('User no longer exists', 401, 'USER_NOT_FOUND');
    }

    // Check if user is active
    if (!user.isActive) {
      throw new AppError('User account has been deactivated', 401, 'ACCOUNT_DEACTIVATED');
    }

    // Check if password was changed after token was issued
    const passwordChangedAt = user.passwordChangedAt;
    if (passwordChangedAt) {
      const JWTTimestamp = decoded.iat;
      if (user.changedPasswordAfter(JWTTimestamp)) {
        throw new AppError('Password was recently changed. Please log in again.', 401, 'PASSWORD_CHANGED');
      }
    }

    // Add user to request
    req.user = {
      id: user._id.toString(),
      userId: user._id.toString(), // Keep for backward compatibility
      email: user.email,
      role: user.role,
      organization: user.organization?._id?.toString() || null,
      permissions: user.role?.permissions || []
    };

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Optional authentication - doesn't require but sets user if present
 */
export const optionalAuth = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (token) {
      const decoded = verifyAccessToken(token);
      if (decoded) {
        const user = await User.findById(decoded.userId).populate('role');
        if (user && user.isActive) {
          req.user = {
            id: user._id.toString(),
            userId: user._id.toString(), // Keep for backward compatibility
            email: user.email,
            role: user.role,
            organization: user.organization?._id?.toString() || null,
            permissions: user.role?.permissions || []
          };
        }
      }
    }

    next();
  } catch (error) {
    // Continue without user
    next();
  }
};

/**
 * Restrict to specific roles
 * @param {...string} roles - Allowed roles
 */
export const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Not authorized to access this route', 401, 'UNAUTHORIZED'));
    }

    if (!roles.includes(req.user.role?.name)) {
      return next(new AppError('Not authorized to perform this action', 403, 'FORBIDDEN'));
    }

    next();
  };
};

/**
 * Restrict to specific permissions
 * @param {...string} permissions - Required permissions
 */
export const requirePermissions = (...permissions) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Not authorized to access this route', 401, 'UNAUTHORIZED'));
    }

    const userPermissions = req.user.permissions || [];
    const hasAllPermissions = permissions.every((permission) => userPermissions.includes(permission));

    if (!hasAllPermissions) {
      return next(new AppError('Not authorized to perform this action', 403, 'FORBIDDEN'));
    }

    next();
  };
};

/**
 * Restrict to at least one permission
 * @param {...string} permissions - Required permissions (any one)
 */
export const requireAnyPermission = (...permissions) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Not authorized to access this route', 401, 'UNAUTHORIZED'));
    }

    const userPermissions = req.user.permissions || [];
    const hasAnyPermission = permissions.some((permission) => userPermissions.includes(permission));

    if (!hasAnyPermission) {
      return next(new AppError('Not authorized to perform this action', 403, 'FORBIDDEN'));
    }

    next();
  };
};

/**
 * Check if user belongs to organization
 * @param {string} paramName - Parameter name for organization ID
 */
export const checkOrganization = (paramName = 'organizationId') => {
  return (req, res, next) => {
    const organizationId = req.params[paramName] || req.body.organizationId;

    if (!req.user) {
      return next(new AppError('Not authorized to access this route', 401, 'UNAUTHORIZED'));
    }

    // Super admin can access any organization
    if (req.user.role?.name === 'super_admin') {
      return next();
    }

    // Check if user belongs to the organization
    if (organizationId && req.user.organization !== organizationId) {
      return next(new AppError('Not authorized to access this organization', 403, 'FORBIDDEN'));
    }

    next();
  };
};

export default {
  protect,
  optionalAuth,
  restrictTo,
  requirePermissions,
  requireAnyPermission,
  checkOrganization
};