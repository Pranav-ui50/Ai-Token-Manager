/**
 * Session Service
 *
 * Redis-based session management for user sessions.
 * Provides session storage, validation, and management.
 */

import { getRedisClient, isRedisConnected } from '../config/redis.js';
import logger from '../config/logger.js';
import { generateToken, hashToken } from '../utils/jwt.js';
import crypto from 'crypto';

// In-memory session fallback
const memorySessions = new Map();

// Session configuration
const SESSION_CONFIG = {
  prefix: 'session:',
  accessTokenExpiry: 15 * 60, // 15 minutes in seconds
  refreshTokenExpiry: 7 * 24 * 60 * 60, // 7 days in seconds
  maxSessionsPerUser: 5
};

/**
 * Session Service Class
 */
class SessionService {
  constructor() {
    this.prefix = SESSION_CONFIG.prefix;
  }

  /**
   * Generate session key
   * @param {string} sessionId - Session ID
   * @returns {string}
   */
  getSessionKey(sessionId) {
    return `${this.prefix}${sessionId}`;
  }

  /**
   * Generate user sessions key
   * @param {string} userId - User ID
   * @returns {string}
   */
  getUserSessionsKey(userId) {
    return `${this.prefix}user:${userId}`;
  }

  /**
   * Create a new session
   * @param {Object} user - User object
   * @param {Object} options - Session options
   * @returns {Promise<Object>}
   */
  async createSession(user, options = {}) {
    const {
      ipAddress = 'unknown',
      userAgent = 'unknown',
      deviceId = null
    } = options;

    // Generate session ID
    const sessionId = crypto.randomBytes(32).toString('hex');

    // Generate tokens
    const accessToken = generateToken(
      { userId: user._id, sessionId, role: user.role },
      { expiresIn: '15m' }
    );
    const refreshToken = crypto.randomBytes(64).toString('hex');
    const refreshTokenHash = hashToken(refreshToken);

    // Session data
    const sessionData = {
      id: sessionId,
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
      organization: user.organization?.toString() || null,
      ipAddress,
      userAgent,
      deviceId,
      refreshTokenHash,
      createdAt: new Date().toISOString(),
      lastAccessedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + SESSION_CONFIG.refreshTokenExpiry * 1000).toISOString()
    };

    // Store session
    await this.storeSession(sessionId, sessionData);

    // Add to user sessions list
    await this.addToUserSessions(user._id.toString(), sessionId);

    // Enforce max sessions per user
    await this.enforceMaxSessions(user._id.toString());

    logger.info(`Session created for user ${user._id}: ${sessionId}`);

    return {
      sessionId,
      accessToken,
      refreshToken,
      expiresAt: sessionData.expiresAt
    };
  }

  /**
   * Store session in Redis/Memory
   * @param {string} sessionId - Session ID
   * @param {Object} data - Session data
   * @returns {Promise<void>}
   */
  async storeSession(sessionId, data) {
    const key = this.getSessionKey(sessionId);
    const ttl = SESSION_CONFIG.refreshTokenExpiry;

    if (isRedisConnected()) {
      try {
        const client = getRedisClient();
        await client.setEx(key, ttl, JSON.stringify(data));
        return;
      } catch (error) {
        logger.warn('Redis session store error:', error.message);
      }
    }

    // Memory fallback
    memorySessions.set(sessionId, {
      ...data,
      _expiry: Date.now() + (ttl * 1000)
    });
  }

  /**
   * Get session by ID
   * @param {string} sessionId - Session ID
   * @returns {Promise<Object|null>}
   */
  async getSession(sessionId) {
    const key = this.getSessionKey(sessionId);

    if (isRedisConnected()) {
      try {
        const client = getRedisClient();
        const data = await client.get(key);
        if (data) {
          return JSON.parse(data);
        }
        return null;
      } catch (error) {
        logger.warn('Redis session get error:', error.message);
      }
    }

    // Memory fallback
    const session = memorySessions.get(sessionId);
    if (session && session._expiry > Date.now()) {
      return session;
    }
    if (session) {
      memorySessions.delete(sessionId);
    }
    return null;
  }

  /**
   * Update session
   * @param {string} sessionId - Session ID
   * @param {Object} updates - Updates to apply
   * @returns {Promise<boolean>}
   */
  async updateSession(sessionId, updates) {
    const session = await this.getSession(sessionId);
    if (!session) {
      return false;
    }

    const updatedSession = {
      ...session,
      ...updates,
      lastAccessedAt: new Date().toISOString()
    };

    await this.storeSession(sessionId, updatedSession);
    return true;
  }

  /**
   * Delete session
   * @param {string} sessionId - Session ID
   * @returns {Promise<boolean>}
   */
  async deleteSession(sessionId) {
    const session = await this.getSession(sessionId);
    const key = this.getSessionKey(sessionId);

    if (isRedisConnected()) {
      try {
        const client = getRedisClient();
        await client.del(key);

        // Remove from user sessions list
        if (session?.userId) {
          await this.removeFromUserSessions(session.userId, sessionId);
        }

        logger.info(`Session deleted: ${sessionId}`);
        return true;
      } catch (error) {
        logger.warn('Redis session delete error:', error.message);
      }
    }

    // Memory fallback
    if (session?.userId) {
      await this.removeFromUserSessions(session.userId, sessionId);
    }
    memorySessions.delete(sessionId);
    return true;
  }

  /**
   * Add session to user's sessions list
   * @param {string} userId - User ID
   * @param {string} sessionId - Session ID
   * @returns {Promise<void>}
   */
  async addToUserSessions(userId, sessionId) {
    const key = this.getUserSessionsKey(userId);

    if (isRedisConnected()) {
      try {
        const client = getRedisClient();
        await client.lPush(key, sessionId);
        await client.expire(key, SESSION_CONFIG.refreshTokenExpiry);
        return;
      } catch (error) {
        logger.warn('Redis add to user sessions error:', error.message);
      }
    }

    // Memory fallback - not implemented for simplicity
  }

  /**
   * Remove session from user's sessions list
   * @param {string} userId - User ID
   * @param {string} sessionId - Session ID
   * @returns {Promise<void>}
   */
  async removeFromUserSessions(userId, sessionId) {
    const key = this.getUserSessionsKey(userId);

    if (isRedisConnected()) {
      try {
        const client = getRedisClient();
        await client.lRem(key, 0, sessionId);
        return;
      } catch (error) {
        logger.warn('Redis remove from user sessions error:', error.message);
      }
    }
  }

  /**
   * Get all sessions for a user
   * @param {string} userId - User ID
   * @returns {Promise<Array>}
   */
  async getUserSessions(userId) {
    const key = this.getUserSessionsKey(userId);
    const sessions = [];

    if (isRedisConnected()) {
      try {
        const client = getRedisClient();
        const sessionIds = await client.lRange(key, 0, -1);

        for (const sessionId of sessionIds) {
          const session = await this.getSession(sessionId);
          if (session) {
            sessions.push({
              id: session.id,
              ipAddress: session.ipAddress,
              userAgent: session.userAgent,
              deviceId: session.deviceId,
              createdAt: session.createdAt,
              lastAccessedAt: session.lastAccessedAt,
              expiresAt: session.expiresAt,
              current: false // Will be set by caller
            });
          } else {
            // Clean up invalid session reference
            await client.lRem(key, 0, sessionId);
          }
        }
      } catch (error) {
        logger.warn('Redis get user sessions error:', error.message);
      }
    }

    return sessions;
  }

  /**
   * Enforce maximum sessions per user
   * @param {string} userId - User ID
   * @returns {Promise<void>}
   */
  async enforceMaxSessions(userId) {
    const key = this.getUserSessionsKey(userId);

    if (isRedisConnected()) {
      try {
        const client = getRedisClient();
        const sessionCount = await client.lLen(key);

        if (sessionCount > SESSION_CONFIG.maxSessionsPerUser) {
          // Remove oldest sessions
          const sessionsToRemove = sessionCount - SESSION_CONFIG.maxSessionsPerUser;
          for (let i = 0; i < sessionsToRemove; i++) {
            const oldSessionId = await client.rPop(key);
            if (oldSessionId) {
              await this.deleteSession(oldSessionId);
              logger.info(`Removed old session for user ${userId}: ${oldSessionId}`);
            }
          }
        }
      } catch (error) {
        logger.warn('Redis enforce max sessions error:', error.message);
      }
    }
  }

  /**
   * Validate refresh token and get session
   * @param {string} sessionId - Session ID
   * @param {string} refreshToken - Refresh token
   * @returns {Promise<Object|null>}
   */
  async validateRefreshToken(sessionId, refreshToken) {
    const session = await this.getSession(sessionId);
    if (!session) {
      return null;
    }

    const refreshTokenHash = hashToken(refreshToken);
    if (session.refreshTokenHash !== refreshTokenHash) {
      return null;
    }

    // Check expiry
    if (new Date(session.expiresAt) < new Date()) {
      await this.deleteSession(sessionId);
      return null;
    }

    return session;
  }

  /**
   * Refresh access token
   * @param {string} sessionId - Session ID
   * @param {string} refreshToken - Refresh token
   * @param {Object} user - User object
   * @returns {Promise<Object|null>}
   */
  async refreshAccessToken(sessionId, refreshToken, user) {
    const session = await this.validateRefreshToken(sessionId, refreshToken);
    if (!session) {
      return null;
    }

    // Generate new access token
    const accessToken = generateToken(
      { userId: user._id, sessionId, role: user.role },
      { expiresIn: '15m' }
    );

    // Update last accessed
    await this.updateSession(sessionId, {
      lastAccessedAt: new Date().toISOString()
    });

    return {
      accessToken,
      expiresIn: 900 // 15 minutes
    };
  }

  /**
   * Revoke all sessions for a user except current
   * @param {string} userId - User ID
   * @param {string} currentSessionId - Current session ID to keep
   * @returns {Promise<number>}
   */
  async revokeAllOtherSessions(userId, currentSessionId) {
    const sessions = await this.getUserSessions(userId);
    let revokedCount = 0;

    for (const session of sessions) {
      if (session.id !== currentSessionId) {
        await this.deleteSession(session.id);
        revokedCount++;
      }
    }

    logger.info(`Revoked ${revokedCount} sessions for user ${userId}`);
    return revokedCount;
  }

  /**
   * Get active session count
   * @param {string} userId - User ID
   * @returns {Promise<number>}
   */
  async getActiveSessionCount(userId) {
    const sessions = await this.getUserSessions(userId);
    return sessions.length;
  }

  /**
   * Clean up expired sessions (maintenance task)
   * @returns {Promise<number>}
   */
  async cleanupExpiredSessions() {
    let cleaned = 0;

    if (isRedisConnected()) {
      try {
        const client = getRedisClient();
        const keys = await client.keys(`${this.prefix}*`);

        for (const key of keys) {
          // Skip user session lists
          if (key.includes(':user:')) continue;

          const ttl = await client.ttl(key);
          if (ttl === -1) {
            // No expiry set, add one
            await client.expire(key, SESSION_CONFIG.refreshTokenExpiry);
          }
        }
      } catch (error) {
        logger.warn('Redis cleanup error:', error.message);
      }
    }

    // Memory fallback cleanup
    for (const [sessionId, session] of memorySessions.entries()) {
      if (session._expiry < Date.now()) {
        memorySessions.delete(sessionId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.info(`Cleaned up ${cleaned} expired memory sessions`);
    }

    return cleaned;
  }
}

// Export singleton instance
const sessionService = new SessionService();
export default sessionService;
export { SESSION_CONFIG };