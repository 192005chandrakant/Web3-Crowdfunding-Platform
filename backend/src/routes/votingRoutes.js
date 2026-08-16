const express = require("express");
const { asyncHandler } = require("../middleware/asyncHandler");
const {
  getVotingEligibility,
  getVoteStatus,
  getCampaignVotingStats,
  listMilestoneVotes,
  getCampaignDonors
} = require("../controllers/votingController");

const router = express.Router();

/**
 * GET /api/voting/eligibility/:campaignAddress/:walletAddress/:milestoneIndex
 * Check if a wallet is eligible to vote (QV power + sybil check)
 */
router.get(
  "/eligibility/:campaignAddress/:walletAddress/:milestoneIndex",
  asyncHandler(getVotingEligibility)
);

/**
 * GET /api/voting/status/:campaignAddress/:walletAddress/:milestoneIndex
 * Lightweight: has wallet voted, and in which direction?
 */
router.get(
  "/status/:campaignAddress/:walletAddress/:milestoneIndex",
  asyncHandler(getVoteStatus)
);

/**
 * GET /api/voting/stats/:campaignAddress/:milestoneIndex
 * Full QV aggregate stats for a milestone
 */
router.get(
  "/stats/:campaignAddress/:milestoneIndex",
  asyncHandler(getCampaignVotingStats)
);

/**
 * GET /api/voting/votes/:campaignAddress/:milestoneIndex
 * Paginated anonymized vote list
 */
router.get(
  "/votes/:campaignAddress/:milestoneIndex",
  asyncHandler(listMilestoneVotes)
);

/**
 * GET /api/voting/donors/:campaignAddress
 * Donor QV leaderboard for a campaign
 */
router.get(
  "/donors/:campaignAddress",
  asyncHandler(getCampaignDonors)
);

module.exports = router;
