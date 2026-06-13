/**
 * CommonJS Entry Point for LiteSpeed/lsnode (cPanel Shared Hosting)
 *
 * This is a PURE CommonJS file that bootstraps the ES module application.
 * No ES module syntax (import/export) or top-level await here!
 */

'use strict';

// Load environment variables first
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

// Track startup progress
let startupComplete = false;

// Load the ES module application
console.log('[Startup] Loading ES module application...');
console.log('[Startup] Current directory:', process.cwd());
console.log('[Startup] __dirname:', __dirname);

import('./app.js')
  .then((module) => {
    console.log('[Startup] ES module loaded successfully');
    console.log('[Startup] Application initialized');
    startupComplete = true;
    // The app.js exports the express app and calls startServer() internally
    // We just need to keep the process alive
  })
  .catch((error) => {
    console.error('');
    console.error('='.repeat(60));
    console.error('[CRASH] Failed to load ES module:');
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

    process.exit(1);
  });

// Log startup status every 5 seconds
const startupCheck = setInterval(() => {
  if (startupComplete) {
    clearInterval(startupCheck);
  } else {
    console.log('[Startup] Still loading...');
  }
}, 5000);

// Clear interval on exit
process.on('exit', () => {
  clearInterval(startupCheck);
});