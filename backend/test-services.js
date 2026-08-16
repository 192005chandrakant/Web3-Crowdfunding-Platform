/**
 * Backend Services Integration Test Suite
 * Tests Cloudinary, Pinata, MongoDB, Redis, and Resend
 */

require('dotenv').config();
// Automatically trim leading/trailing whitespace from environment variables
Object.keys(process.env).forEach(key => {
  if (typeof process.env[key] === 'string') {
    process.env[key] = process.env[key].trim();
  }
});
const fs = require('fs');
const path = require('path');

// Service imports
const { uploadImageBuffer } = require('./src/services/cloudinaryService');
const { pinBuffer, pinJson } = require('./src/services/pinataService');
const { sendNotificationEmail } = require('./src/services/emailService');
const { getCached, setCached, invalidate } = require('./src/services/cacheService');
const { connectDatabase } = require('./src/config/db');
const Campaign = require('./src/models/Campaign');
const { notificationEngine } = require('./src/services/notifications/NotificationEngine');
const inAppObserver = require('./src/services/notifications/observers/InAppObserver');
const realtimeSSEObserver = require('./src/services/notifications/observers/RealtimeSSEObserver');
const cacheAuditObserver = require('./src/services/notifications/observers/CacheAuditObserver');

const COLORS = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(color, symbol, message) {
  console.log(`${color}${symbol}${COLORS.reset} ${message}`);
}

function success(message) {
  log(COLORS.green, '✓', message);
}

function error(message) {
  log(COLORS.red, '✗', message);
}

function info(message) {
  log(COLORS.blue, 'ℹ', message);
}

function warn(message) {
  log(COLORS.yellow, '⚠', message);
}

// Test results tracker
const results = {
  mongodb: false,
  redis: false,
  cloudinary: false,
  pinata: false,
  resend: false,
  notificationEngine: false,
};

/**
 * Test 1: MongoDB Connection
 */
async function testMongoDB() {
  info('Testing MongoDB connection...');
  try {
    await connectDatabase(process.env.MONGODB_URI);

    // Try to count campaigns
    const count = await Campaign.countDocuments();
    success(`MongoDB connected! Found ${count} campaigns in database`);
    results.mongodb = true;
    return true;
  } catch (err) {
    error(`MongoDB test failed: ${err.message}`);
    return false;
  }
}

/**
 * Test 2: Upstash Redis Cache
 */
async function testRedis() {
  info('Testing Upstash Redis cache...');
  try {
    const testKey = 'test:integration';
    const testValue = { message: 'Hello from MilestoneChain', timestamp: Date.now() };

    // Set value
    await setCached(testKey, testValue, 60);
    success('Redis: Value set successfully');

    // Get value
    const retrieved = await getCached(testKey);
    if (retrieved && retrieved.message === testValue.message) {
      success('Redis: Value retrieved successfully');
    } else {
      throw new Error('Retrieved value does not match');
    }

    // Invalidate
    await invalidate(testKey);
    success('Redis: Value invalidated successfully');

    results.redis = true;
    return true;
  } catch (err) {
    error(`Redis test failed: ${err.message}`);
    warn('Redis is optional - app will work without it');
    return false;
  }
}

/**
 * Test 3: Cloudinary Image Upload
 */
async function testCloudinary() {
  info('Testing Cloudinary image upload...');
  try {
    // Create a small test image buffer (1x1 PNG)
    const testImageBuffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
      'base64'
    );

    const result = await uploadImageBuffer(testImageBuffer, {
      folder: 'milestonechain/test'
    });

    if (result.url && result.publicId) {
      success(`Cloudinary upload successful! URL: ${result.url.substring(0, 50)}...`);
      results.cloudinary = true;
      return true;
    } else {
      throw new Error('Upload did not return expected fields');
    }
  } catch (err) {
    error(`Cloudinary test failed: ${err.message}`);
    if (err.message.includes('Missing Cloudinary credentials')) {
      warn('Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET in .env');
    }
    return false;
  }
}

/**
 * Test 4: Pinata IPFS Upload
 */
async function testPinata() {
  info('Testing Pinata IPFS upload...');
  try {
    // Test JSON pinning
    const testData = {
      title: 'MilestoneChain Test',
      description: 'Integration test for Pinata IPFS',
      timestamp: new Date().toISOString(),
    };

    const result = await pinJson(testData, 'test-metadata.json');

    if (result.cid) {
      success(`Pinata JSON pinned! CID: ${result.cid}`);
      info(`View at: https://gateway.pinata.cloud/ipfs/${result.cid}`);

      // Test file pinning
      const testFileBuffer = Buffer.from('MilestoneChain Proof Test Document');
      const fileResult = await pinBuffer(testFileBuffer, 'test-proof.txt');

      if (fileResult.cid) {
        success(`Pinata file pinned! CID: ${fileResult.cid}`);
        results.pinata = true;
        return true;
      }
    }

    throw new Error('Pin did not return CID');
  } catch (err) {
    error(`Pinata test failed: ${err.message}`);
    if (err.message.includes('Missing Pinata credentials')) {
      warn('Set PINATA_API_KEY and PINATA_API_SECRET (or PINATA_JWT) in .env');
    }
    return false;
  }
}

/**
 * Test 5: Resend Email
 */
async function testResend() {
  info('Testing Resend email service...');

  if (!process.env.RESEND_API_KEY) {
    warn('RESEND_API_KEY not set - skipping email test');
    warn('Set RESEND_API_KEY in .env to test email notifications');
    return false;
  }

  // Check if test email is provided
  const testEmail = process.env.TEST_EMAIL || process.env.RESEND_FROM_EMAIL;
  if (!testEmail) {
    warn('No test email configured - skipping email test');
    warn('Set TEST_EMAIL=your@email.com in .env to receive test emails');
    return false;
  }

  try {
    const result = await sendNotificationEmail({
      to: testEmail,
      subject: 'MilestoneChain Integration Test',
      html: `
        <h2>✅ Email Service Working!</h2>
        <p>This is a test email from MilestoneChain backend integration tests.</p>
        <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
        <p>If you received this, Resend email integration is configured correctly.</p>
      `
    });

    if (result.id || !result.skipped) {
      success(`Email sent successfully to ${testEmail}`);
      results.resend = true;
      return true;
    } else if (result.skipped) {
      warn('Email service not configured');
      return false;
    }

    throw new Error('Email send did not return expected result');
  } catch (err) {
    error(`Resend test failed: ${err.message}`);
    return false;
  }
}

/**
 * Test 6: Notification Engine (Observer Design Pattern)
 */
async function testNotificationEngine() {
  info('Testing Notification Engine (Observer Design Pattern)...');
  try {
    // Subscribe observers
    notificationEngine.subscribe(inAppObserver)
      .subscribe(realtimeSSEObserver)
      .subscribe(cacheAuditObserver);

    const status = notificationEngine.getStatus();
    if (status.observerCount >= 3) {
      success(`Notification Engine active with ${status.observerCount} registered observer channels!`);

      // Dispatch a synthetic test event
      const result = await notificationEngine.notify({
        walletAddress: '0x000000000000000000000000000000000000dEaD',
        type: 'campaign_update',
        title: 'Observer Pattern Test Event',
        message: 'Testing enterprise multi-channel notification dispatch.',
        sendEmail: false
      });

      if (result.success) {
        success('Notification dispatch broadcasted successfully across all observer channels!');
        results.notificationEngine = true;
        return true;
      }
    }
    throw new Error('Observer check failed to dispatch');
  } catch (err) {
    error(`Notification Engine test failed: ${err.message}`);
    return false;
  }
}

/**
 * Print final report
 */
function printReport() {
  console.log('\n' + '='.repeat(60));
  console.log('  INTEGRATION TEST RESULTS');
  console.log('='.repeat(60));

  const services = [
    { name: 'MongoDB Atlas', key: 'mongodb', critical: true },
    { name: 'Upstash Redis', key: 'redis', critical: false },
    { name: 'Cloudinary', key: 'cloudinary', critical: true },
    { name: 'Pinata IPFS', key: 'pinata', critical: true },
    { name: 'Resend Email', key: 'resend', critical: false },
    { name: 'Observer Notifications', key: 'notificationEngine', critical: true },
  ];

  services.forEach(({ name, key, critical }) => {
    const status = results[key];
    const symbol = status ? '✓' : '✗';
    const color = status ? COLORS.green : (critical ? COLORS.red : COLORS.yellow);
    const label = critical ? '(Critical)' : '(Optional)';

    console.log(`${color}${symbol}${COLORS.reset} ${name.padEnd(20)} ${label.padEnd(12)} ${status ? 'PASS' : 'FAIL'}`);
  });

  console.log('='.repeat(60));

  const passedCount = Object.values(results).filter(Boolean).length;
  const totalCount = Object.keys(results).length;
  const criticalServices = services.filter(s => s.critical);
  const criticalPassed = criticalServices.filter(s => results[s.key]).length;

  if (criticalPassed === criticalServices.length) {
    success(`\nAll critical services operational (${passedCount}/${totalCount} total)`);
    info('\nYour backend is ready to use! 🚀');
  } else {
    error(`\nSome critical services failed (${passedCount}/${totalCount} passed)`);
    warn('\nPlease fix the failed services before deploying.');
  }

  console.log('\n' + '='.repeat(60) + '\n');
}

/**
 * Main test runner
 */
async function runTests() {
  console.log('\n' + '='.repeat(60));
  console.log('  MILESTONECHAIN BACKEND INTEGRATION TESTS');
  console.log('='.repeat(60) + '\n');

  try {
    await testMongoDB();
    await testRedis();
    await testCloudinary();
    await testPinata();
    await testResend();
    await testNotificationEngine();
  } catch (err) {
    error(`Unexpected error: ${err.message}`);
  } finally {
    printReport();
    process.exit(0);
  }
}

// Run tests
runTests().catch(err => {
  error(`Fatal error: ${err.message}`);
  process.exit(1);
});

