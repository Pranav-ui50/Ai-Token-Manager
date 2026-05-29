/**
 * Auth Middleware Tests
 *
 * Tests for authentication and authorization middleware.
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import jwt from 'jsonwebtoken';

// Mock dependencies
jest.mock('../../../src/models/User.js');
jest.mock('../../../src/models/Role.js');
jest.mock('../../../src/models/Organization.js');
jest.mock('../../../src/config/index.js', () => ({
  jwt: {
    secret: 'test-secret-key-for-testing',
    expiresIn: '15m'
  }
}));

import User from '../../../src/models/User.js';
import Role from '../../../src/models/Role.js';
import Organization from '../../../src/models/Organization.js';
import { protect, requirePermissions, checkOrganization } from '../../../src/middlewares/auth.middleware.js';

describe('Auth Middleware', () => {
  let mockReq;
  let mockRes;
  let mockNext;

  beforeEach(() => {
    mockReq = {
      headers: {},
      user: null
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };
    mockNext = jest.fn();

    jest.clearAllMocks();
  });

  describe('protect', () => {
    it('should return 401 if no token provided', async () => {
      await protect(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          code: 'UNAUTHORIZED'
        })
      }));
    });

    it('should return 401 if token is invalid', async () => {
      mockReq.headers.authorization = 'Bearer invalid-token';

      await protect(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
    });

    it('should set req.user if token is valid', async () => {
      const token = jwt.sign(
        { id: 'user123', email: 'test@example.com', role: 'role123', organization: 'org123' },
        'test-secret-key-for-testing',
        { expiresIn: '1h' }
      );

      mockReq.headers.authorization = `Bearer ${token}`;

      User.findById = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue({
          _id: 'user123',
          email: 'test@example.com',
          role: { _id: 'role123', name: 'test_role', permissions: ['view_projects'] },
          organization: 'org123',
          isActive: true
        })
      });

      await protect(mockReq, mockRes, mockNext);

      expect(mockReq.user).toBeDefined();
      expect(mockReq.user.id).toBe('user123');
    });

    it('should return 401 if user is inactive', async () => {
      const token = jwt.sign(
        { id: 'user123', email: 'test@example.com' },
        'test-secret-key-for-testing',
        { expiresIn: '1h' }
      );

      mockReq.headers.authorization = `Bearer ${token}`;

      User.findById = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        populate: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue({
          _id: 'user123',
          email: 'test@example.com',
          isActive: false
        })
      });

      await protect(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
    });
  });

  describe('requirePermissions', () => {
    it('should call next if user has required permission', async () => {
      mockReq.user = {
        id: 'user123',
        role: {
          permissions: ['view_projects', 'manage_projects']
        }
      };

      const middleware = requirePermissions('view_projects');
      await middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should return 403 if user lacks permission', async () => {
      mockReq.user = {
        id: 'user123',
        role: {
          permissions: ['view_projects']
        }
      };

      const middleware = requirePermissions('manage_projects');
      await middleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
    });

    it('should handle array of permissions (OR logic)', async () => {
      mockReq.user = {
        id: 'user123',
        role: {
          permissions: ['view_projects']
        }
      };

      const middleware = requirePermissions(['manage_projects', 'view_projects']);
      await middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('checkOrganization', () => {
    it('should call next if user belongs to organization', async () => {
      mockReq.user = {
        id: 'user123',
        organization: 'org123',
        roles: []
      };
      mockReq.params = { organizationId: 'org123' };

      const middleware = checkOrganization('organizationId');
      await middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should return 403 if user does not belong to organization', async () => {
      mockReq.user = {
        id: 'user123',
        organization: 'org123'
      };
      mockReq.params = { organizationId: 'org456' };

      const middleware = checkOrganization('organizationId');
      await middleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
    });
  });
});