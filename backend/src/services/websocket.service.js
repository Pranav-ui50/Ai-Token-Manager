/**
 * WebSocket Service
 *
 * Real-time WebSocket server for live updates, notifications, and monitoring.
 */

import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import logger from '../config/logger.js';
import config from '../config/index.js';

class WebSocketService {
  constructor() {
    this.io = null;
    this.connectedUsers = new Map(); // userId -> Set of socketIds
    this.organizationRooms = new Map(); // organizationId -> Set of socketIds
    this.userSockets = new Map(); // socketId -> { userId, organizationId, roles }
  }

  /**
   * Initialize WebSocket server
   */
  initialize(httpServer) {
    if (this.io) {
      logger.warn('WebSocket server already initialized');
      return;
    }

    this.io = new Server(httpServer, {
      cors: {
        origin: config.cors?.origins?.split(',') || ['http://localhost:3000', 'http://localhost:5173'],
        credentials: true,
        methods: ['GET', 'POST']
      },
      transports: ['websocket', 'polling'],
      pingInterval: 25000,
      pingTimeout: 60000
    });

    // Authentication middleware
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');

        if (!token) {
          return next(new Error('Authentication required'));
        }

        // Verify JWT token
        const decoded = jwt.verify(token, config.jwt.secret);
        socket.userId = decoded.userId || decoded._id;
        socket.organizationId = decoded.organization;
        socket.roles = decoded.roles || [];

        // Join organization room
        if (socket.organizationId) {
          socket.join(`org:${socket.organizationId}`);
        }

        // Join user's personal room
        socket.join(`user:${socket.userId}`);

        // Track connection
        this.trackConnection(socket);

        logger.info(`WebSocket connected: user ${socket.userId}, org ${socket.organizationId}, socket ${socket.id}`);

        next();
      } catch (error) {
        logger.error('WebSocket authentication failed:', error.message);
        next(new Error('Invalid authentication'));
      }
    });

    // Connection handlers
    this.io.on('connection', (socket) => {
      this.handleConnection(socket);
    });

    logger.info('WebSocket server initialized');
  }

  /**
   * Track socket connection
   */
  trackConnection(socket) {
    // Track by user
    if (!this.connectedUsers.has(socket.userId)) {
      this.connectedUsers.set(socket.userId, new Set());
    }
    this.connectedUsers.get(socket.userId).add(socket.id);

    // Track by organization
    if (socket.organizationId) {
      if (!this.organizationRooms.has(socket.organizationId)) {
        this.organizationRooms.set(socket.organizationId, new Set());
      }
      this.organizationRooms.get(socket.organizationId).add(socket.id);
    }

    // Track socket details
    this.userSockets.set(socket.id, {
      userId: socket.userId,
      organizationId: socket.organizationId,
      roles: socket.roles,
      connectedAt: new Date()
    });
  }

  /**
   * Handle socket connection
   */
  handleConnection(socket) {
    // Handle disconnection
    socket.on('disconnect', (reason) => {
      this.handleDisconnect(socket, reason);
    });

    // Handle errors
    socket.on('error', (error) => {
      logger.error(`WebSocket error for ${socket.userId}:`, error.message);
    });

    // Handle custom events
    socket.on('subscribe:feature', (featureId) => {
      socket.join(`feature:${featureId}`);
      logger.debug(`User ${socket.userId} subscribed to feature ${featureId}`);
    });

    socket.on('unsubscribe:feature', (featureId) => {
      socket.leave(`feature:${featureId}`);
    });

    socket.on('subscribe:project', (projectId) => {
      socket.join(`project:${projectId}`);
    });

    socket.on('unsubscribe:project', (projectId) => {
      socket.leave(`project:${projectId}`);
    });

    // Handle heartbeat
    socket.on('heartbeat', () => {
      socket.emit('heartbeat:ack');
    });
  }

  /**
   * Handle socket disconnect
   */
  handleDisconnect(socket, reason) {
    // Remove from user tracking
    if (this.connectedUsers.has(socket.userId)) {
      this.connectedUsers.get(socket.userId).delete(socket.id);
      if (this.connectedUsers.get(socket.userId).size === 0) {
        this.connectedUsers.delete(socket.userId);
      }
    }

    // Remove from organization tracking
    if (socket.organizationId && this.organizationRooms.has(socket.organizationId)) {
      this.organizationRooms.get(socket.organizationId).delete(socket.id);
      if (this.organizationRooms.get(socket.organizationId).size === 0) {
        this.organizationRooms.delete(socket.organizationId);
      }
    }

    // Remove socket details
    this.userSockets.delete(socket.id);

    logger.info(`WebSocket disconnected: user ${socket.userId}, socket ${socket.id}, reason: ${reason}`);
  }

  /**
   * Check if user is online
   */
  isUserOnline(userId) {
    return this.connectedUsers.has(userId) && this.connectedUsers.get(userId).size > 0;
  }

  /**
   * Get connected users in organization
   */
  getOrganizationUsers(organizationId) {
    const socketIds = this.organizationRooms.get(organizationId);
    if (!socketIds) return [];

    const users = new Map();
    for (const socketId of socketIds) {
      const details = this.userSockets.get(socketId);
      if (details && !users.has(details.userId)) {
        users.set(details.userId, {
          userId: details.userId,
          roles: details.roles,
          connectedAt: details.connectedAt
        });
      }
    }

    return Array.from(users.values());
  }

  /**
   * Emit to specific user
   */
  emitToUser(userId, event, data) {
    this.io.to(`user:${userId}`).emit(event, data);
  }

  /**
   * Emit to organization
   */
  emitToOrganization(organizationId, event, data) {
    this.io.to(`org:${organizationId}`).emit(event, data);
  }

  /**
   * Emit to feature subscribers
   */
  emitToFeature(featureId, event, data) {
    this.io.to(`feature:${featureId}`).emit(event, data);
  }

  /**
   * Emit to project subscribers
   */
  emitToProject(projectId, event, data) {
    this.io.to(`project:${projectId}`).emit(event, data);
  }

  /**
   * Broadcast to all connected clients
   */
  broadcast(event, data) {
    this.io.emit(event, data);
  }

  /**
   * Emit usage update
   */
  emitUsageUpdate(organizationId, usageData) {
    this.emitToOrganization(organizationId, 'usage:update', {
      type: 'usage',
      data: usageData,
      timestamp: new Date()
    });
  }

  /**
   * Emit notification
   */
  emitNotification(userId, notification) {
    this.emitToUser(userId, 'notification:new', {
      type: 'notification',
      data: notification,
      timestamp: new Date()
    });
  }

  /**
   * Emit billing event
   */
  emitBillingEvent(organizationId, event, data) {
    this.emitToOrganization(organizationId, 'billing:event', {
      event,
      data,
      timestamp: new Date()
    });
  }

  /**
   * Emit alert
   */
  emitAlert(organizationId, alert) {
    this.emitToOrganization(organizationId, 'alert:new', {
      type: 'alert',
      data: alert,
      timestamp: new Date()
    });
  }

  /**
   * Emit token consumption update
   */
  emitTokenConsumption(organizationId, consumption) {
    this.emitToOrganization(organizationId, 'token:consumption', {
      type: 'token',
      data: consumption,
      timestamp: new Date()
    });
  }

  /**
   * Get connection statistics
   */
  getStats() {
    return {
      totalConnections: this.userSockets.size,
      totalUsers: this.connectedUsers.size,
      totalOrganizations: this.organizationRooms.size,
      connectionsByOrganization: Object.fromEntries(
        Array.from(this.organizationRooms.entries()).map(([orgId, sockets]) => [orgId, sockets.size])
      ),
      memoryUsage: process.memoryUsage()
    };
  }

  /**
   * Close WebSocket server
   */
  async close() {
    if (this.io) {
      return new Promise((resolve) => {
        this.io.close(() => {
          logger.info('WebSocket server closed');
          resolve();
        });
      });
    }
  }
}

// Export singleton instance
const websocketService = new WebSocketService();
export default websocketService;