const express = require("express");
const { asyncHandler } = require("../middleware/asyncHandler");
const { validateRequest } = require("../middleware/validateRequest");
const { requireSiweAuth } = require("../middleware/siweAuth");
const { requireAdmin } = require("../middleware/adminAuth");
const {
  adminListUsersQuerySchema,
  adminUpdateRoleSchema,
  adminFlagCampaignSchema,
  adminUpdateCampaignStatusSchema,
  adminPaginationQuerySchema,
  walletAddressParamSchema,
  campaignAddressSchema
} = require("../config/validators");
const {
  listAllUsers,
  updateUserRole,
  flagCampaign,
  listFlaggedCampaigns,
  updateCampaignStatus,
  getPlatformHealth,
  getPlatformStats
} = require("../controllers/adminController");

const router = express.Router();

// All admin routes require SIWE auth + admin role
router.use(requireSiweAuth, requireAdmin);

// ─── Users ───
// GET /api/admin/users — paginated user list with search
router.get(
  "/users",
  validateRequest(adminListUsersQuerySchema, "query"),
  asyncHandler(listAllUsers)
);

// PATCH /api/admin/users/:walletAddress/role — change user role
router.patch(
  "/users/:walletAddress/role",
  validateRequest(walletAddressParamSchema, "params"),
  validateRequest(adminUpdateRoleSchema, "body"),
  asyncHandler(updateUserRole)
);

// ─── Campaigns ───
// PATCH /api/admin/campaigns/:address/flag — flag or unflag a campaign
router.patch(
  "/campaigns/:address/flag",
  validateRequest(campaignAddressSchema, "params"),
  validateRequest(adminFlagCampaignSchema, "body"),
  asyncHandler(flagCampaign)
);

// GET /api/admin/campaigns/flagged — list flagged campaigns
router.get(
  "/campaigns/flagged",
  validateRequest(adminPaginationQuerySchema, "query"),
  asyncHandler(listFlaggedCampaigns)
);

// PATCH /api/admin/campaigns/:address/status — change campaign status
router.patch(
  "/campaigns/:address/status",
  validateRequest(campaignAddressSchema, "params"),
  validateRequest(adminUpdateCampaignStatusSchema, "body"),
  asyncHandler(updateCampaignStatus)
);

// ─── Platform ───
// GET /api/admin/health — deep platform health check
router.get("/health", asyncHandler(getPlatformHealth));

// GET /api/admin/stats — platform-wide statistics
router.get("/stats", asyncHandler(getPlatformStats));

module.exports = router;
