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

async function getCached(key) {
  const redis = getRedisClient();
  if (!redis) {
    return null;
  }
  return redis.get(key);
}

async function setCached(key, value, ttlSeconds = CACHE_TTL_SECONDS) {
  const redis = getRedisClient();
  if (!redis) {
    return;
  }
  await redis.set(key, value, { ex: ttlSeconds });
}

async function invalidateCampaignCache(address) {
  const redis = getRedisClient();
  if (!redis) {
    return;
  }
  await redis.del(campaignCacheKey(address));
  await redis.del(blockchainCacheKey(address));
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
  invalidateCampaignCache,
  getCampaignFromCache,
  cacheCampaign,
  getBlockchainStateFromCache,
  cacheBlockchainState
};
