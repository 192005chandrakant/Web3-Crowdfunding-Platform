const express = require("express");
const { asyncHandler } = require("../middleware/asyncHandler");
const { validateRequest } = require("../middleware/validateRequest");
const { requireSiweAuth, requireMatchingWalletBody } = require("../middleware/siweAuth");
const { requireRegisteredUser } = require("../middleware/roleAccess");
const {
  createDonationSchema,
  listDonationsQuerySchema,
  walletAddressParamSchema,
  campaignAddressParamSchema,
  recentDonationsQuerySchema,
  adminLedgerQuerySchema
} = require("../config/validators");
const {
  recordDonation,
  listDonationsByWallet,
  listDonationsByCampaign,
  getDonationStats,
  listRecentDonationsByCampaign,
  getDonorPortfolio,
  getWalletActivity,
  getPlatformLedger
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

// GET /api/donations/ledger — platform-wide fund-transfer ledger for registered users
router.get(
  "/ledger",
  requireSiweAuth,
  requireRegisteredUser,
  validateRequest(adminLedgerQuerySchema, "query"),
  asyncHandler(getPlatformLedger)
);

// GET /api/donations/donor/:walletAddress/portfolio — rich donor governance portfolio
router.get(
  "/donor/:walletAddress/portfolio",
  validateRequest(walletAddressParamSchema, "params"),
  asyncHandler(getDonorPortfolio)
);

// GET /api/donations/activity/:walletAddress — combined sent vs. received wallet transaction ledger
router.get(
  "/activity/:walletAddress",
  validateRequest(walletAddressParamSchema, "params"),
  asyncHandler(getWalletActivity)
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

// GET /api/donations/campaign/:campaignAddress/recent — recent donations (lightweight)
router.get(
  "/campaign/:campaignAddress/recent",
  validateRequest(campaignAddressParamSchema, "params"),
  validateRequest(recentDonationsQuerySchema, "query"),
  asyncHandler(listRecentDonationsByCampaign)
);

// GET /api/donations/stats/:walletAddress — aggregated donation stats
router.get(
  "/stats/:walletAddress",
  validateRequest(walletAddressParamSchema, "params"),
  asyncHandler(getDonationStats)
);

module.exports = router;
