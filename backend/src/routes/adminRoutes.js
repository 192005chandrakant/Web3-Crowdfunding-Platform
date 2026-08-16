const express = require("express");
const { asyncHandler } = require("../middleware/asyncHandler");
const { validateRequest } = require("../middleware/validateRequest");
const { requireSiweAuth } = require("../middleware/siweAuth");
const { requireAdmin } = require("../middleware/adminAuth");
const {
  adminListUsersQuerySchema,
  adminUpdateRoleSchema,
  adminReviewUserSchema,
  updateVerificationSchema,
  adminFlagCampaignSchema,
  adminUpdateCampaignStatusSchema,
  adminPaginationQuerySchema,
  adminLedgerQuerySchema,
  adminAuditLogQuerySchema,
  walletAddressParamSchema,
  campaignAddressSchema
} = require("../config/validators");
const {
  listAllUsers,
  updateUserRole,
  reviewUserAccount,
  updateUserVerification,
  flagCampaign,
  listFlaggedCampaigns,
  updateCampaignStatus,
  getPlatformHealth,
  getPlatformStats,
  getRecentActivity,
  listAuditLogs,
  getLedger,
  getDonationsOverTime,
  getUserGrowth,
  getCampaignCategoryBreakdown,
  getRoleDistribution
} = require("../controllers/adminController");

const router = express.Router();

// ─── Public Analytics & Ledger ───
// GET /api/admin/health — platform health status
router.get("/health", asyncHandler(getPlatformHealth));

// GET /api/admin/stats — platform-wide statistics
router.get("/stats", asyncHandler(getPlatformStats));

// GET /api/admin/activity — platform-wide recent activity feed
router.get("/activity", asyncHandler(getRecentActivity));

// GET /api/admin/ledger — platform-wide transaction ledger
router.get(
  "/ledger",
  requireSiweAuth,
  requireAdmin,
  validateRequest(adminLedgerQuerySchema, "query"),
  asyncHandler(getLedger)
);

// ─── Public Analytics Charts ───
router.get("/analytics/donations-over-time", asyncHandler(getDonationsOverTime));
router.get("/analytics/user-growth", asyncHandler(getUserGrowth));
router.get("/analytics/campaign-categories", asyncHandler(getCampaignCategoryBreakdown));
router.get("/analytics/role-distribution", asyncHandler(getRoleDistribution));


// All subsequent admin routes require SIWE auth + admin role
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

router.patch(
  "/users/:walletAddress/review",
  validateRequest(walletAddressParamSchema, "params"),
  validateRequest(adminReviewUserSchema, "body"),
  asyncHandler(reviewUserAccount)
);

// PATCH /api/admin/users/:walletAddress/verify — change user verification status
router.patch(
  "/users/:walletAddress/verify",
  validateRequest(walletAddressParamSchema, "params"),
  validateRequest(updateVerificationSchema, "body"),
  asyncHandler(updateUserVerification)
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
// GET /api/admin/audit-logs — audit trail for moderation and role changes
router.get(
  "/audit-logs",
  validateRequest(adminAuditLogQuerySchema, "query"),
  asyncHandler(listAuditLogs)
);

module.exports = router;
