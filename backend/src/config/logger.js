/**
 * Winston Logger Configuration
 *
 * Centralized logging configuration using Winston.
 * Logs are written to console and files based on environment.
 */

import winston from 'winston';

const { combine, timestamp, printf, colorize, errors } = winston.format;

// Custom log format
const logFormat = printf(({ level, message, timestamp, stack }) => {
  return `${timestamp} [${level}]: ${stack || message}`;
});

// Get log level from environment (avoid circular dependency)
const logLevel = process.env.LOG_LEVEL || process.env.NODE_ENV === 'production' ? 'info' : 'debug';
const nodeEnv = process.env.NODE_ENV || 'development';

// Create logger instance
const logger = winston.createLogger({
  level: logLevel,
  format: combine(
    errors({ stack: true }),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    logFormat
  ),
  transports: [
    // Console transport
    new winston.transports.Console({
      format: combine(colorize(), logFormat)
    })
  ]
});

// Add file transports in production
if (nodeEnv === 'production') {
  logger.add(
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  );

  logger.add(
    new winston.transports.File({
      filename: 'logs/combined.log',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  );
}

export default logger;