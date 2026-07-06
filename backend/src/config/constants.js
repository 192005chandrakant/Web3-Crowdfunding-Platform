const CAMPAIGN_CATEGORIES = ["general", "startup", "charity", "medical", "event"];

const VERIFICATION_STATUS = {
  UNVERIFIED: "unverified",
  PENDING: "pending",
  VERIFIED: "verified",
  REJECTED: "rejected"
};

const NOTIFICATION_TYPES = {
  MILESTONE_PROOF: "milestone_proof",
  VOTING_OPEN: "voting_open",
  TRANCHE_RELEASED: "tranche_released",
  CAMPAIGN_UPDATE: "campaign_update",
  VERIFICATION: "verification"
};

const DEFAULT_CHAIN_ID = Number(process.env.CHAIN_ID) || 80002;

const CACHE_TTL_SECONDS = Number(process.env.CACHE_TTL_SECONDS) || 300;

module.exports = {
  CAMPAIGN_CATEGORIES,
  VERIFICATION_STATUS,
  NOTIFICATION_TYPES,
  DEFAULT_CHAIN_ID,
  CACHE_TTL_SECONDS
};
