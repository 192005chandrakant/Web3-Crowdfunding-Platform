const { getRedisClient } = require("../config/redis");
const { CACHE_TTL_SECONDS } = require("../config/constants");

function campaignCacheKey(address) {
  return `campaign:${address.toLowerCase()}`;
}

function blockchainCacheKey(address) {
  return `blockchain:${address.toLowerCase()}`;
}

function listCacheKey(queryHash) {
  return `campaigns:list:${queryHash}`;
}

function getRequiredRedisClient() {
  const redis = getRedisClient();
  if (!redis) {
    return null;
  }
  return redis;
}

// --- Rate-limited cache error logger -------------------------------------------
// Upstash REST calls can transiently fail (network blip, rate limit, etc.).
// We suppress repeat identical messages to avoid flooding the console.
// Only the first occurrence is logged as a warning; repeated errors are silenced
// until the server restarts or a different error type appears.
const _seenCacheErrors = new Set();
function warnCacheError(label, key, message) {
  const signature = `${label}:${message}`;
  if (_seenCacheErrors.has(signature)) return;
  _seenCacheErrors.add(signature);
  console.warn(`[Cache] ${label} for ${key}: ${message} (further identical errors suppressed)`);
}
// -------------------------------------------------------------------------------

async function getCached(key) {
  const redis = getRequiredRedisClient();
  if (!redis) {
    return null;
  }

  try {
    return await redis.get(key);
  } catch (error) {
    warnCacheError("Upstash read failed", key, error.message);
    return null;
  }
}

async function setCached(key, value, ttlSeconds = CACHE_TTL_SECONDS) {
  const redis = getRequiredRedisClient();
  if (!redis) {
    return false;
  }

  try {
    await redis.set(key, value, { ex: ttlSeconds });
    return true;
  } catch (error) {
    warnCacheError("Upstash write failed", key, error.message);
    return false;
  }
}

async function invalidateCampaignCache(address) {
  const redis = getRequiredRedisClient();
  if (!redis) {
    return false;
  }

  try {
    await redis.del(campaignCacheKey(address));
    await redis.del(blockchainCacheKey(address));
    return true;
  } catch (error) {
    warnCacheError("Upstash campaign invalidation failed", address, error.message);
    return false;
  }
}

async function invalidate(key) {
  const redis = getRequiredRedisClient();
  if (!redis) {
    return false;
  }

  try {
    await redis.del(key);
    return true;
  } catch (error) {
    warnCacheError("Upstash invalidation failed", key, error.message);
    return false;
  }
}

async function getCampaignFromCache(address) {
  return getCached(campaignCacheKey(address));
}

async function cacheCampaign(address, campaign) {
  await setCached(campaignCacheKey(address), campaign);
}

async function getBlockchainStateFromCache(address) {
  return getCached(blockchainCacheKey(address));
}

async function cacheBlockchainState(address, state) {
  await setCached(blockchainCacheKey(address), state, 60);
}

module.exports = {
  campaignCacheKey,
  blockchainCacheKey,
  listCacheKey,
  getCached,
  setCached,
  invalidate,
  invalidateCampaignCache,
  getCampaignFromCache,
  cacheCampaign,
  getBlockchainStateFromCache,
  cacheBlockchainState
};