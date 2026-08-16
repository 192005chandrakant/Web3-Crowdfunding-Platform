const CAMPAIGN_CATEGORIES = ["general", "startup", "charity", "medical", "event"];

// Canonical role list. "reviewer" is an alias displayed as "Reviewer / Moderator"
// in the UI — internally stored as "moderator" in the database for older records,
// but "reviewer" is now a distinct supported role for new accounts.
const USER_ROLES = ["donor", "creator", "moderator", "reviewer", "admin"];

// Roles that require admin approval before the account becomes active.
const ROLES_REQUIRING_ADMIN_REVIEW = ["moderator", "reviewer"];

const ACCOUNT_STATUSES = ["active", "pending_review", "suspended", "rejected"];

const VERIFICATION_STATUS = {
  UNVERIFIED: "unverified",
  PENDING:    "pending",
  VERIFIED:   "verified",
  REJECTED:   "rejected"
};

const NOTIFICATION_TYPES = {
  MILESTONE_PROOF:  "milestone_proof",
  VOTING_OPEN:      "voting_open",
  TRANCHE_RELEASED: "tranche_released",
  CAMPAIGN_UPDATE:  "campaign_update",
  VERIFICATION:     "verification"
};

const DEFAULT_CHAIN_ID = Number(process.env.CHAIN_ID) || 80002;

const CACHE_TTL_SECONDS = Number(process.env.CACHE_TTL_SECONDS) || 300;

module.exports = {
  CAMPAIGN_CATEGORIES,
  USER_ROLES,
  ROLES_REQUIRING_ADMIN_REVIEW,
  ACCOUNT_STATUSES,
  VERIFICATION_STATUS,
  NOTIFICATION_TYPES,
  DEFAULT_CHAIN_ID,
  CACHE_TTL_SECONDS
};
