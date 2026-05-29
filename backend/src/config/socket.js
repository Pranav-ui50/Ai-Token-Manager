/**
 * Socket.IO Configuration
 *
 * WebSocket server configuration for real-time features.
 */

import { Server } from 'socket.io';
import logger from './logger.js';
import jwt from 'jsonwebtoken';
import config from './index.js';

let io = null;

/**
 * Initialize Socket.IO server
 * @param {Object} server - HTTP server instance
 * @returns {Object} Socket.IO server instance
 */
export const initializeSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: config.nodeEnv === 'development'
        ? '*'
        : config.cors.origin,
      methods: ['GET', 'POST'],
      credentials: true
    },
    // Connection settings
    pingTimeout: 60000,
    pingInterval: 25000,
    // Transport settings
    transports: ['websocket', 'polling'],
    // Allow upgrading from polling to websocket
    allowUpgrades: true,
    // Max connections per client
    maxHttpBufferSize: 1e6 // 1MB
  });

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token ||
                    socket.handshake.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        // Allow anonymous connections for public channels
        socket.user = null;
        socket.organization = null;
        return next();
      }

      // Verify JWT token
      const decoded = jwt.verify(token, config.jwt.secret);
      socket.user = decoded;
      socket.organization = decoded.organization;
      socket.userId = decoded.id;

      logger.debug(`Socket authenticated: ${socket.id} for user ${decoded.id}`);
      next();
    } catch (error) {
      logger.warn(`Socket authentication failed: ${error.message}`);
      // Allow connection but without user context
      socket.user = null;
      socket.organization = null;
      next();
    }
  });

  // Connection handler
  io.on('connection', (socket) => {
    logger.info(`Socket connected: ${socket.id}`);

    // Handle user joining their organization room
    if (socket.organization) {
      socket.join(`org:${socket.organization}`);
      logger.debug(`Socket ${socket.id} joined room org:${socket.organization}`);
    }

    // Handle user-specific room
    if (socket.userId) {
      socket.join(`user:${socket.userId}`);
      logger.debug(`Socket ${socket.id} joined room user:${socket.userId}`);
    }

    // Send connection acknowledgment
    socket.emit('connection:established', {
      socketId: socket.id,
      timestamp: new Date().toISOString()
    });

    // Subscribe to token usage updates
    socket.on('subscribe:token-usage', (data) => {
      handleSubscribeTokenUsage(socket, data);
    });

    // Unsubscribe from token usage updates
    socket.on('unsubscribe:token-usage', (data) => {
      handleUnsubscribeTokenUsage(socket, data);
    });

    // Subscribe to feature updates
    socket.on('subscribe:feature', (data) => {
      handleSubscribeFeature(socket, data);
    });

    // Unsubscribe from feature updates
    socket.on('unsubscribe:feature', (data) => {
      handleUnsubscribeFeature(socket, data);
    });

    // Subscribe to project updates
    socket.on('subscribe:project', (data) => {
      handleSubscribeProject(socket, data);
    });

    // Unsubscribe from project updates
    socket.on('unsubscribe:project', (data) => {
      handleUnsubscribeProject(socket, data);
    });

    // Subscribe to analytics updates
    socket.on('subscribe:analytics', (data) => {
      handleSubscribeAnalytics(socket, data);
    });

    // Unsubscribe from analytics updates
    socket.on('unsubscribe:analytics', (data) => {
      handleUnsubscribeAnalytics(socket, data);
    });

    // Handle ping for keep-alive
    socket.on('ping', () => {
      socket.emit('pong', { timestamp: new Date().toISOString() });
    });

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      logger.info(`Socket disconnected: ${socket.id}, reason: ${reason}`);
    });

    // Handle errors
    socket.on('error', (error) => {
      logger.error(`Socket error for ${socket.id}: ${error.message}`);
    });
  });

  logger.info('Socket.IO server initialized');
  return io;
};

/**
 * Get Socket.IO server instance
 * @returns {Object} Socket.IO server instance
 */
export const getSocketIO = () => {
  if (!io) {
    throw new Error('Socket.IO not initialized. Call initializeSocket first.');
  }
  return io;
};

/**
 * Check if Socket.IO is initialized
 * @returns {boolean}
 */
export const isSocketInitialized = () => io !== null;

// ==========================================
// Room Subscription Handlers
// ==========================================

/**
 * Handle token usage subscription
 */
function handleSubscribeTokenUsage(socket, data) {
  const { featureId, projectId } = data || {};

  if (!socket.organization) {
    return socket.emit('error', { message: 'Authentication required' });
  }

  if (featureId) {
    socket.join(`tokens:feature:${featureId}`);
    logger.debug(`Socket ${socket.id} subscribed to feature tokens: ${featureId}`);
  }

  if (projectId) {
    socket.join(`tokens:project:${projectId}`);
    logger.debug(`Socket ${socket.id} subscribed to project tokens: ${projectId}`);
  }

  // Subscribe to organization-wide token updates
  socket.join(`tokens:org:${socket.organization}`);

  socket.emit('subscribed', {
    channel: 'token-usage',
    featureId,
    projectId,
    organization: socket.organization
  });
}

/**
 * Handle token usage unsubscription
 */
function handleUnsubscribeTokenUsage(socket, data) {
  const { featureId, projectId } = data || {};

  if (featureId) {
    socket.leave(`tokens:feature:${featureId}`);
  }

  if (projectId) {
    socket.leave(`tokens:project:${projectId}`);
  }

  socket.emit('unsubscribed', { channel: 'token-usage', featureId, projectId });
}

/**
 * Handle feature subscription
 */
function handleSubscribeFeature(socket, data) {
  const { featureId } = data || {};

  if (!socket.organization) {
    return socket.emit('error', { message: 'Authentication required' });
  }

  if (featureId) {
    socket.join(`feature:${featureId}`);
    logger.debug(`Socket ${socket.id} subscribed to feature: ${featureId}`);
  }

  // Subscribe to organization features
  socket.join(`features:org:${socket.organization}`);

  socket.emit('subscribed', { channel: 'feature', featureId });
}

/**
 * Handle feature unsubscription
 */
function handleUnsubscribeFeature(socket, data) {
  const { featureId } = data || {};

  if (featureId) {
    socket.leave(`feature:${featureId}`);
  }

  socket.emit('unsubscribed', { channel: 'feature', featureId });
}

/**
 * Handle project subscription
 */
function handleSubscribeProject(socket, data) {
  const { projectId } = data || {};

  if (!socket.organization) {
    return socket.emit('error', { message: 'Authentication required' });
  }

  if (projectId) {
    socket.join(`project:${projectId}`);
    logger.debug(`Socket ${socket.id} subscribed to project: ${projectId}`);
  }

  socket.emit('subscribed', { channel: 'project', projectId });
}

/**
 * Handle project unsubscription
 */
function handleUnsubscribeProject(socket, data) {
  const { projectId } = data || {};

  if (projectId) {
    socket.leave(`project:${projectId}`);
  }

  socket.emit('unsubscribed', { channel: 'project', projectId });
}

/**
 * Handle analytics subscription
 */
function handleSubscribeAnalytics(socket, data) {
  if (!socket.organization) {
    return socket.emit('error', { message: 'Authentication required' });
  }

  // Subscribe to organization analytics
  socket.join(`analytics:org:${socket.organization}`);

  socket.emit('subscribed', { channel: 'analytics', organization: socket.organization });
}

/**
 * Handle analytics unsubscription
 */
function handleUnsubscribeAnalytics(socket, data) {
  socket.leave(`analytics:org:${socket.organization}`);
  socket.emit('unsubscribed', { channel: 'analytics' });
}

export default {
  initializeSocket,
  getSocketIO,
  isSocketInitialized
};