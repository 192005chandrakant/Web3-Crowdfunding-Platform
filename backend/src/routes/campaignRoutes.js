const express = require("express");
const { asyncHandler } = require("../middleware/asyncHandler");
const { validateRequest } = require("../middleware/validateRequest");
const {
  requireSiweAuth,
  requireCampaignCreator,
  requireMatchingCreatorAddress
} = require("../middleware/siweAuth");
const {
  createCampaignSchema,
  updateCampaignSchema,
  campaignAddressSchema,
  listCampaignsQuerySchema
} = require("../config/validators");
const {
  createCampaign,
  getCampaignByAddress,
  listCampaignsHandler,
  patchCampaign
} = require("../controllers/campaignController");

const router = express.Router();

router.get(
  "/",
  validateRequest(listCampaignsQuerySchema, "query"),
  asyncHandler(listCampaignsHandler)
);

router.post(
  "/",
  requireSiweAuth,
  validateRequest(createCampaignSchema, "body"),
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
  asyncHandler(requireCampaignCreator),
  asyncHandler(patchCampaign)
);

module.exports = router;
