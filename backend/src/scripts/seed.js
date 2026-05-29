/**
 * Database Seed Script
 *
 * Run this script to seed the database with initial data.
 * Usage: npm run seed
 *
 * This script creates:
 * - 6 default roles (SUPER_ADMIN, ORG_OWNER, FINANCE_ADMIN, PRODUCT_MANAGER, DEVELOPER, VIEWER)
 * - 6 demo users (one for each role)
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import config from '../config/index.js';
import { seedDatabase } from '../config/seeder.js';
import logger from '../config/logger.js';

/**
 * Connect to database
 */
const connectDB = async () => {
  try {
    const mongoUri = config.mongodb.uri;

    if (!mongoUri) {
      logger.error('MONGODB_URI is not defined in environment variables');
      logger.error('Please create a .env file in the backend directory with:');
      logger.error('MONGODB_URI=mongodb://localhost:27017/api-token-manager');
      logger.error('');
      logger.error('Or for MongoDB Atlas:');
      logger.error('MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database');
      process.exit(1);
    }

    const conn = await mongoose.connect(mongoUri, config.mongodb.options);
    logger.info(`MongoDB Connected: ${conn.connection.host}`);
    logger.info(`Database: ${conn.connection.name}`);
    return conn;
  } catch (error) {
    logger.error('MongoDB connection error:', error.message);
    process.exit(1);
  }
};

/**
 * Disconnect from database
 */
const disconnectDB = async () => {
  try {
    await mongoose.disconnect();
    logger.info('MongoDB Disconnected');
  } catch (error) {
    logger.error('MongoDB disconnection error:', error);
  }
};

/**
 * Print credentials table
 */
const printCredentialsTable = () => {
  logger.info('');
  logger.info('╔══════════════════════════════════════════════════════════════════════════════╗');
  logger.info('║                          DEMO USER CREDENTIALS                              ║');
  logger.info('╠══════════════════════════════════════════════════════════════════════════════╣');
  logger.info('║ ROLE              │ EMAIL                              │ PASSWORD          ║');
  logger.info('╠══════════════════════════════════════════════════════════════════════════════╣');
  logger.info('║ SUPER_ADMIN       │ superadmin@apitokenmanager.com    │ SuperAdmin@123    ║');
  logger.info('║ ORG_OWNER         │ orgowner@apitokenmanager.com      │ OrgOwner@123      ║');
  logger.info('║ FINANCE_ADMIN     │ finance@apitokenmanager.com      │ Finance@123       ║');
  logger.info('║ PRODUCT_MANAGER   │ product@apitokenmanager.com      │ Product@123       ║');
  logger.info('║ DEVELOPER         │ developer@apitokenmanager.com    │ Developer@123     ║');
  logger.info('║ VIEWER            │ viewer@apitokenmanager.com       │ Viewer@123        ║');
  logger.info('╚══════════════════════════════════════════════════════════════════════════════╝');
  logger.info('');
};

/**
 * Main seed function
 */
const runSeed = async () => {
  try {
    logger.info('========================================');
    logger.info('     STARTING DATABASE SEEDING         ');
    logger.info('========================================');
    logger.info('');

    // Connect to database
    await connectDB();

    // Run seeding
    await seedDatabase();

    logger.info('');
    logger.info('========================================');
    logger.info('     DATABASE SEEDING COMPLETE         ');
    logger.info('========================================');

    // Print credentials table
    printCredentialsTable();

    // Disconnect from database
    await disconnectDB();

    process.exit(0);
  } catch (error) {
    logger.error('Seeding failed:', error);
    process.exit(1);
  }
};

// Run the seed script
runSeed();