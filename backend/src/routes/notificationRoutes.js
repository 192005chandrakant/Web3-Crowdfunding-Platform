const express = require("express");
const { asyncHandler } = require("../middleware/asyncHandler");
const { validateRequest } = require("../middleware/validateRequest");
const {
  walletAddressParamSchema,
  createNotificationSchema,
  notificationIdSchema
} = require("../config/validators");
const {
  listNotifications,
  createNotification,
  markNotificationRead
} = require("../controllers/notificationController");

const router = express.Router();

router.get(
  "/:walletAddress",
  validateRequest(walletAddressParamSchema, "params"),
  asyncHandler(listNotifications)
);

router.post("/", validateRequest(createNotificationSchema, "body"), asyncHandler(createNotification));

router.patch(
  "/:id/read",
  validateRequest(notificationIdSchema, "params"),
  asyncHandler(markNotificationRead)
);

module.exports = router;
