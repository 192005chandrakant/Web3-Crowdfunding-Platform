const express = require("express");
const { asyncHandler } = require("../middleware/asyncHandler");
const { validateRequest } = require("../middleware/validateRequest");
const { requireSiweAuth } = require("../middleware/siweAuth");
const {
  walletAddressParamSchema,
  createNotificationSchema,
  notificationIdSchema
} = require("../config/validators");
const {
  listNotifications,
  streamNotifications,
  createNotification,
  sendTestNotification,
  markNotificationRead,
  markAllNotificationsRead
} = require("../controllers/notificationController");

const router = express.Router();

// Real-time SSE live stream endpoint for client browsers
router.get(
  "/stream/:walletAddress",
  validateRequest(walletAddressParamSchema, "params"),
  streamNotifications
);

// Trigger a synthetic test notification across all observers
router.post(
  "/test",
  asyncHandler(sendTestNotification)
);

router.get(
  "/:walletAddress",
  requireSiweAuth,
  validateRequest(walletAddressParamSchema, "params"),
  asyncHandler(listNotifications)
);

router.post("/", requireSiweAuth, validateRequest(createNotificationSchema, "body"), asyncHandler(createNotification));

router.patch(
  "/:id/read",
  requireSiweAuth,
  validateRequest(notificationIdSchema, "params"),
  asyncHandler(markNotificationRead)
);

// Mark ALL unread notifications for a wallet as read
router.patch(
  "/:walletAddress/read-all",
  requireSiweAuth,
  validateRequest(walletAddressParamSchema, "params"),
  asyncHandler(markAllNotificationsRead)
);

module.exports = router;
