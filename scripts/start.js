#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

// Cloud Run sets PORT, default to 3000 for local development
const PORT = process.env.PORT || '3000';
const HOST = '0.0.0.0';

console.log('🔧 Environment Information:');
console.log(`  - NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
console.log(`  - PORT: ${PORT}`);
console.log(`  - HOST: ${HOST}`);
console.log(`  - SESSION_SECRET: ${process.env.SESSION_SECRET ? '✓ set' : '✗ not set'}`);
console.log(`  - ADMIN_PASSWORD: ${process.env.ADMIN_PASSWORD ? '✓ set' : '✗ not set'}`);
console.log('');

// Verify required secrets for deployment
if (!process.env.SESSION_SECRET) {
  console.warn('⚠️  WARNING: SESSION_SECRET is not set. Admin authentication will not work.');
}
if (!process.env.ADMIN_PASSWORD) {
  console.warn('⚠️  WARNING: ADMIN_PASSWORD is not set. Admin login will not work.');
}

console.log(`🚀 Starting Next.js production server on ${HOST}:${PORT}...`);

// Use absolute path to next binary
const nextBin = path.join(__dirname, '..', 'node_modules', '.bin', 'next');

// Start Next.js with explicit host and port binding
const child = spawn(nextBin, ['start', '-H', HOST, '-p', PORT], {
  stdio: 'inherit',
  env: { 
    ...process.env,
    // Ensure PORT is explicitly set in child process
    PORT: PORT,
    HOST: HOST
  }
});

child.on('error', (error) => {
  console.error('❌ Failed to start Next.js server:', error);
  process.exit(1);
});

child.on('exit', (code, signal) => {
  if (code !== null && code !== 0) {
    console.error(`❌ Next.js server exited with code ${code}`);
    process.exit(code);
  }
  if (signal) {
    console.log(`📛 Next.js server killed with signal ${signal}`);
    process.exit(1);
  }
});

// Handle graceful shutdown for Cloud Run
process.on('SIGTERM', () => {
  console.log('📛 SIGTERM received, shutting down gracefully...');
  child.kill('SIGTERM');
  setTimeout(() => {
    console.error('❌ Forced shutdown after timeout');
    process.exit(1);
  }, 30000); // 30 second timeout
});

process.on('SIGINT', () => {
  console.log('📛 SIGINT received, shutting down gracefully...');
  child.kill('SIGINT');
  setTimeout(() => {
    console.error('❌ Forced shutdown after timeout');
    process.exit(1);
  }, 30000);
});

// Log when server is ready
setTimeout(() => {
  console.log(`✅ Server should be listening on http://${HOST}:${PORT}`);
  console.log(`✅ Health check endpoint: http://${HOST}:${PORT}/`);
}, 3000);
