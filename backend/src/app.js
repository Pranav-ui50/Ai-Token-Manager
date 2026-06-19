/**
 * Application Entry Point
 *
 * This is the main entry file for the Express server.
 * It initializes the application and starts the server.
 */

import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import path from 'path';
import { fileURLToPath } from 'url';

import config from './config/index.js';
import logger from './config/logger.js';
import connectDB from './config/database.js';
import connectRedis from './config/redis.js';
import swaggerSpec from './config/swagger.js';
import { initializeSocket } from './config/socket.js';
import { errorHandler, notFound } from './middlewares/error.middleware.js';
import routes from './routes/index.js';
import { initializeJobs, shutdownJobs } from './jobs/index.js';
import realtimeService from './services/realtime.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Express app
const app = express();

// Create HTTP server for Socket.IO
const server = createServer(app);

// ===========================================
// Security Middleware
// ===========================================

// Set security HTTP headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' } // Allow images to be loaded cross-origin
}));

// Configure CORS
const corsOptions = {
  origin: config.nodeEnv === 'development'
    ? true // Allow all origins in development
    : config.cors.origin, // Use specific origins in production
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: config.cors.allowedHeaders,
  credentials: true
};

app.use(cors(corsOptions));

// ===========================================
// Rate Limiting
// ===========================================

const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests, please try again later.'
    }
  },
  standardHeaders: true,
  legacyHeaders: false
});

app.use('/api', limiter);

// ===========================================
// Request Parsing
// ===========================================

// Parse JSON request body
app.use(express.json({ limit: '10mb' }));

// Parse URL-encoded request body
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ===========================================
// Static Files - Serve uploaded files
// ===========================================

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ===========================================
// Request Logging
// ===========================================

if (config.nodeEnv !== 'test') {
  app.use(
    morgan('combined', {
      stream: {
        write: (message) => logger.info(message.trim())
      }
    })
  );
}

// ===========================================
// Health Check Endpoint
// ===========================================

app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv
  });
});

// ===========================================
// API Documentation (Swagger)
// ===========================================

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'API Token Manager Documentation'
}));

// Serve swagger.json for external tools
app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// ===========================================
// API Routes
// ===========================================

app.use('/api', routes);

// ===========================================
// Error Handling
// ===========================================

// Handle 404 errors
app.use(notFound);

// Global error handler
app.use(errorHandler);

// ===========================================
// Start Server
// ===========================================

const PORT = config.port;

const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();

    // Connect to Redis (optional)
    try {
      await connectRedis();
      logger.info('Redis connected successfully');
    } catch (redisError) {
      logger.warn('Redis connection failed, continuing without cache:', redisError.message);
    }

    // Initialize Socket.IO for real-time features
    const io = initializeSocket(server);
    logger.info('Socket.IO initialized for real-time features');

    // Initialize real-time monitoring service
    realtimeService.initialize();
    logger.info('Real-time monitoring service initialized');

    // Initialize job queues (requires Redis)
    try {
      await initializeJobs();
    } catch (jobError) {
      logger.warn('Job initialization failed, continuing without background jobs:', jobError.message);
    }

    // Start Express server
    server.listen(PORT, () => {
      logger.info(`Server running in ${config.nodeEnv} mode on port ${PORT}`);
      logger.info(`Health check: http://localhost:${PORT}/health`);
      logger.info(`API Base URL: http://localhost:${PORT}/api`);
      logger.info(`API Documentation: http://localhost:${PORT}/api-docs`);
      logger.info(`WebSocket: ws://localhost:${PORT}`);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (err) => {
      logger.error('Unhandled Rejection:', err);
      server.close(() => process.exit(1));
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (err) => {
      logger.error('Uncaught Exception:', err);
      process.exit(1);
    });

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      logger.info('SIGTERM received, shutting down gracefully');
      realtimeService.shutdown();
      await shutdownJobs();
      server.close(() => {
        logger.info('Process terminated');
        process.exit(0);
      });
    });

    // Graceful shutdown on SIGINT (Ctrl+C)
    process.on('SIGINT', async () => {
      logger.info('SIGINT received, shutting down gracefully');
      realtimeService.shutdown();
      await shutdownJobs();
      server.close(() => {
        logger.info('Process terminated');
        process.exit(0);
      });
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export default app;
