const express = require("express");
const { asyncHandler } = require("../middleware/asyncHandler");
const { validateRequest } = require("../middleware/validateRequest");
const {
  requireSiweAuth,
  requireCampaignCreator,
  requireMatchingCreatorAddress
} = require("../middleware/siweAuth");
const { requireRole } = require("../middleware/roleAccess");
const {
  createCampaignSchema,
  updateCampaignSchema,
  campaignAddressSchema,
  listCampaignsQuerySchema,
  listMilestoneReviewsQuerySchema,
  campaignStatsParamSchema,
  campaignDonorsQuerySchema,
  creatorAddressParamSchema
} = require("../config/validators");
const {
  createCampaign,
  getCampaignByAddress,
  listCampaignsHandler,
  listMilestoneReviewsHandler,
  patchCampaign,
  getCampaignStats,
  getCampaignDonors,
  getCreatorDashboard
} = require("../controllers/campaignController");

const router = express.Router();

router.get(
  "/",
  validateRequest(listCampaignsQuerySchema, "query"),
  asyncHandler(listCampaignsHandler)
);

router.get(
  "/milestone-reviews",
  validateRequest(listMilestoneReviewsQuerySchema, "query"),
  asyncHandler(listMilestoneReviewsHandler)
);

router.get(
  "/creator/:creatorAddress/dashboard",
  validateRequest(creatorAddressParamSchema, "params"),
  requireSiweAuth,
  requireRole("creator"),
  asyncHandler(getCreatorDashboard)
);

router.post(
  "/",
  requireSiweAuth,
  validateRequest(createCampaignSchema, "body"),
  requireRole("creator", { requireActive: false }),
  requireMatchingCreatorAddress,
  asyncHandler(createCampaign)
);

router.get(
  "/:address",
  validateRequest(campaignAddressSchema, "params"),
  asyncHandler(getCampaignByAddress)
);


router.patch(
  "/:address",
  requireSiweAuth,
  validateRequest(campaignAddressSchema, "params"),
  validateRequest(updateCampaignSchema, "body"),
  requireRole("creator"),
  asyncHandler(requireCampaignCreator),
  asyncHandler(patchCampaign)
);

// ── Campaign stats & donor list (public) ─────────────────────────────────────

router.get(
  "/:address/stats",
  validateRequest(campaignStatsParamSchema, "params"),
  asyncHandler(getCampaignStats)
);

router.get(
  "/:address/donors",
  validateRequest(campaignStatsParamSchema, "params"),
  validateRequest(campaignDonorsQuerySchema, "query"),
  asyncHandler(getCampaignDonors)
);

module.exports = router;
