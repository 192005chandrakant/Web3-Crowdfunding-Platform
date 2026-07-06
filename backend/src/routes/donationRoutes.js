const express = require("express");
const { asyncHandler } = require("../middleware/asyncHandler");
const { validateRequest } = require("../middleware/validateRequest");
const { requireSiweAuth, requireMatchingWalletBody } = require("../middleware/siweAuth");
const {
  createDonationSchema,
  listDonationsQuerySchema,
  walletAddressParamSchema,
  campaignAddressParamSchema
} = require("../config/validators");
const {
  recordDonation,
  listDonationsByWallet,
  listDonationsByCampaign,
  getDonationStats
} = require("../controllers/donationController");

const router = express.Router();

// POST /api/donations — record a new donation (SIWE required, wallet must match)
router.post(
  "/",
  requireSiweAuth,
  validateRequest(createDonationSchema, "body"),
  requireMatchingWalletBody,
  asyncHandler(recordDonation)
);

// GET /api/donations/wallet/:walletAddress — list donations by donor
router.get(
  "/wallet/:walletAddress",
  validateRequest(walletAddressParamSchema, "params"),
  validateRequest(listDonationsQuerySchema, "query"),
  asyncHandler(listDonationsByWallet)
);

// GET /api/donations/campaign/:campaignAddress — list donations by campaign
router.get(
  "/campaign/:campaignAddress",
  validateRequest(campaignAddressParamSchema, "params"),
  validateRequest(listDonationsQuerySchema, "query"),
  asyncHandler(listDonationsByCampaign)
);

// GET /api/donations/stats/:walletAddress — aggregated donation stats
router.get(
  "/stats/:walletAddress",
  validateRequest(walletAddressParamSchema, "params"),
  asyncHandler(getDonationStats)
);

module.exports = router;
