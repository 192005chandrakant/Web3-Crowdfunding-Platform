require('dotenv').config();
const { performance } = require('perf_hooks');
const mongoose = require('mongoose');
const { connectDatabase } = require('./src/config/db');
const { getCached, setCached } = require('./src/services/cacheService');
const { pinJson } = require('./src/services/pinataService');
const Campaign = require('./src/models/Campaign');

async function measureLatency(name, fn) {
  const start = performance.now();
  try {
    await fn();
    const end = performance.now();
    const latency = end - start;
    console.log(`✅ [${name}] Success - Latency: ${latency.toFixed(2)} ms`);
    return { name, latency, success: true };
  } catch (error) {
    const end = performance.now();
    const latency = end - start;
    console.log(`❌ [${name}] Failed - Latency: ${latency.toFixed(2)} ms | Error: ${error.message}`);
    return { name, latency, success: false, error: error.message };
  }
}

async function runEfficiencyBenchmarks() {
  console.log('\n============================================================');
  console.log('  MILESTONECHAIN SERVICE EFFICIENCY BENCHMARKS');
  console.log('============================================================\n');

  const results = [];

  // 1. Database Connection & Query (MongoDB)
  console.log('Testing MongoDB...');
  await measureLatency('MongoDB Connection', () => connectDatabase(process.env.MONGODB_URI));
  
  const { listCampaigns } = require('./src/services/campaignService');
  
  results.push(await measureLatency('MongoDB Query (Uncached List)', () => listCampaigns({ page: 1, limit: 12 })));
  results.push(await measureLatency('MongoDB Query (Cached List)', () => listCampaigns({ page: 1, limit: 12 })));

  // 2. Cache (Redis)
  console.log('\nTesting Redis Cache...');
  const cacheKey = 'benchmark:test:key';
  const cacheData = { timestamp: Date.now(), msg: 'benchmark test' };
  
  results.push(await measureLatency('Redis Write (Set)', async () => {
    try {
      await setCached(cacheKey, cacheData, 60);
    } catch (e) {
      if (e.message.includes('NOPERM')) {
        throw new Error('Read-only token or missing write permissions');
      }
      throw e;
    }
  }));

  results.push(await measureLatency('Redis Read (Get)', () => getCached(cacheKey)));

  // 3. IPFS Pinning (Pinata)
  console.log('\nTesting IPFS Pinning (Pinata)...');
  const { pinJson, pinBuffer } = require('./src/services/pinataService');
  const testJson = { type: 'benchmark', time: Date.now() };
  results.push(await measureLatency('Pinata JSON Upload', () => pinJson(testJson, 'benchmark-metadata.json')));
  
  const dummyBuffer = Buffer.from('hello ipfs world ' + Date.now());
  results.push(await measureLatency('Pinata File Upload', () => pinBuffer(dummyBuffer, 'benchmark-file.txt')));

  // 4. Notifications (Resend)
  console.log('\nTesting Email Notifications (Resend)...');
  const { sendNotificationEmail, isResendConfigured } = require('./src/services/emailService');
  if (isResendConfigured()) {
    const recipient = process.env.TEST_EMAIL || process.env.RESEND_FROM_EMAIL || 'delivered@resend.dev';
    results.push(await measureLatency('Resend Email Send', () => sendNotificationEmail({
      to: recipient,
      subject: 'Benchmark Test',
      html: '<p>Test</p>'
    })));
  } else {
    console.log('⚠️ Resend not configured. Skipping test.');
  }

  // 5. Cloudinary Upload
  console.log('\nTesting Image Upload (Cloudinary)...');
  const { uploadImageBuffer, isCloudinaryConfigured } = require('./src/services/cloudinaryService');
  if (isCloudinaryConfigured()) {
    // create a simple 1x1 png buffer
    const pixel = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
    results.push(await measureLatency('Cloudinary Upload', () => uploadImageBuffer(pixel)));
  } else {
    console.log('⚠️ Cloudinary not configured. Skipping test.');
  }

  console.log('\n============================================================');
  console.log('  BENCHMARK SUMMARY');
  console.log('============================================================');
  
  results.forEach(res => {
    const symbol = res.success ? '✓' : '✗';
    let speedRating = '';
    
    if (res.success) {
      if (res.latency < 100) speedRating = '(Excellent ⚡)';
      else if (res.latency < 500) speedRating = '(Good 👍)';
      else if (res.latency < 1500) speedRating = '(Acceptable 🐢)';
      else speedRating = '(Slow 🐌)';
    }

    console.log(`${symbol} ${res.name.padEnd(30)} : ${res.latency.toFixed(2).padStart(8)} ms ${speedRating}`);
  });

  console.log('\n* Note: High latency on IPFS/Cloudinary uploads is expected over the network.');
  console.log('============================================================\n');
  
  process.exit(0);
}

runEfficiencyBenchmarks().catch(console.error);
