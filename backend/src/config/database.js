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
    const conn = await mongoose.connect(config.mongodb.uri, config.mongodb.options);

    logger.info(`MongoDB Connected: ${conn.connection.host}`);

    // Handle connection events
    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
    });

    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB reconnected');
    });

    // Seed database with initial data
    try {
      await seedDatabase();
    } catch (seedError) {
      logger.warn('Database seeding failed (this may be expected for existing databases):', seedError.message);
    }

  } catch (error) {
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