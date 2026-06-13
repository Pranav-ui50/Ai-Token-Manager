/**
 * Production Entry Point for cPanel/Passenger
 *
 * This file is used when cPanel/Passenger runs 'node server.js'
 * It delegates to the CommonJS entry point.
 */

'use strict';

// Delegate to the CommonJS entry point
require('./src/index.cjs');