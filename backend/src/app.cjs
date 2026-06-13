/**
 * CommonJS Entry Point for Passenger (Shared Hosting)
 *
 * This file is the entry point that Passenger/lsnode will load.
 * It uses CommonJS require() to load dependencies and dynamic import()
 * to load the ES module application.
 */

'use strict';

// Load environment variables first (CommonJS syntax)
require('dotenv').config();

// Set production environment
process.env.NODE_ENV = process.env.NODE_ENV || 'production';

console.log('='.repeat(60));
console.log('API Token Manager - Backend Server Starting');
console.log('='.repeat(60));
console.log('Node.js Version:', process.version);
console.log('Environment:', process.env.NODE_ENV);
console.log('Port:', process.env.PORT || 5000);
console.log('MongoDB URI:', process.env.MONGODB_URI ? 'Configured' : 'Not configured');
console.log('Redis URL:', process.env.REDIS_URL || 'Not configured');
console.log('Skip Redis:', process.env.SKIP_REDIS || 'false');
console.log('='.repeat(60));

// Handle unexpected errors BEFORE loading the app
process.on('uncaughtException', (error) => {
  console.error('');
  console.error('='.repeat(60));
  console.error('[CRASH] Uncaught Exception:');
  console.error('[CRASH] Error:', error.message);
  console.error('[CRASH] Stack:', error.stack);
  console.error('='.repeat(60));
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('');
  console.error('='.repeat(60));
  console.error('[CRASH] Unhandled Rejection:');
  console.error('[CRASH] Reason:', reason);
  console.error('[CRASH] Stack:', reason?.stack || 'No stack trace');
  console.error('='.repeat(60));
  process.exit(1);
});

// Function to start the application
async function startServer() {
  try {
    console.log('[Startup] Loading ES module application...');
    console.log('[Startup] Current directory:', process.cwd());
    console.log('[Startup] __dirname:', __dirname);

    // Dynamic import of the ES module
    await import('./app.js');

    console.log('[Startup] Application started successfully');
    console.log('[Startup] Server is now running and accepting connections');
  } catch (error) {
    console.error('');
    console.error('='.repeat(60));
    console.error('[CRASH] Failed to start server:');
    console.error('[CRASH] Error:', error.message);
    console.error('[CRASH] Name:', error.name);
    console.error('[CRASH] Stack:', error.stack);
    console.error('='.repeat(60));

    // Log additional error details
    if (error.code) {
      console.error('[CRASH] Error code:', error.code);
    }
    if (error.errors) {
      console.error('[CRASH] Validation errors:', JSON.stringify(error.errors, null, 2));
    }

    // Exit with error code
    process.exit(1);
  }
}

// Start the server
startServer();