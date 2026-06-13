/**
 * MongoDB Database Connection
 *
 * Handles MongoDB connection using Mongoose.
 */

import mongoose from 'mongoose';
import config from './index.js';
import logger from './logger.js';
import { seedDatabase } from './seeder.js';

/**
 * Connect to MongoDB
 * @returns {Promise<void>}
 */
const connectDB = async () => {
  try {
    // Enhanced timeout options for cPanel/shared hosting environments
    const connectionOptions = {
      ...config.mongodb.options,
      serverSelectionTimeoutMS: 5000,  // Fail fast if MongoDB unreachable (5 seconds)
      connectTimeoutMS: 10000,          // Connection timeout (10 seconds)
      socketTimeoutMS: 45000,           // Socket timeout
      heartbeatFrequencyMS: 10000,      // How often to check connection
      maxPoolSize: 50,
      minPoolSize: 5,
    };

    console.log('[Database] Attempting to connect to MongoDB...');
    console.log('[Database] Connection URI:', config.mongodb.uri ? 'Configured' : 'Not configured');
    console.log('[Database] Database Name:', config.mongodb.dbName || 'Not specified');

    const conn = await mongoose.connect(config.mongodb.uri, connectionOptions);

    console.log('[Database] MongoDB Connected successfully!');
    console.log('[Database] Host:', conn.connection.host);
    console.log('[Database] Database:', conn.connection.name);
    logger.info(`MongoDB Connected: ${conn.connection.host}`);

    // Handle connection events
    mongoose.connection.on('disconnected', () => {
      console.log('[Database] MongoDB disconnected');
      logger.warn('MongoDB disconnected');
    });

    mongoose.connection.on('error', (err) => {
      console.error('[Database] MongoDB connection error:', err.message);
      logger.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('reconnected', () => {
      console.log('[Database] MongoDB reconnected');
      logger.info('MongoDB reconnected');
    });

    // Seed database with initial data
    console.log('[Database] Seeding database...');
    try {
      await seedDatabase();
      console.log('[Database] Database seeding completed');
    } catch (seedError) {
      console.error('[Database] Database seeding failed:', seedError.message);
      logger.warn('Database seeding failed (this may be expected for existing databases):', seedError.message);
    }

    console.log('[Database] Connection setup complete');
    return conn;

  } catch (error) {
    console.error('[Database] CRITICAL - Connection failed:', error.message);
    console.error('[Database] Error stack:', error.stack);
    logger.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

/**
 * Disconnect from MongoDB
 * @returns {Promise<void>}
 */
const disconnectDB = async () => {
  try {
    await mongoose.disconnect();
    logger.info('MongoDB disconnected');
  } catch (error) {
    logger.error('MongoDB disconnection error:', error);
    throw error;
  }
};

export { connectDB, disconnectDB };
export default connectDB;