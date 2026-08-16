const express = require("express");
const { asyncHandler } = require("../middleware/asyncHandler");
const { validateRequest } = require("../middleware/validateRequest");
const {
  requireSiweAuth,
  requireMatchingWalletParam,
  requireMatchingWalletBody
} = require("../middleware/siweAuth");
const {
  upsertUserSchema,
  updateVerificationSchema,
  walletAddressParamSchema
} = require("../config/validators");
const { upsertUser, getUserByWallet, getCurrentUser, updateVerification } = require("../controllers/userController");

const router = express.Router();

router.post(
  "/",
  requireSiweAuth,
  validateRequest(upsertUserSchema, "body"),
  requireMatchingWalletBody,
  asyncHandler(upsertUser)
);

router.get(
  "/me",
  requireSiweAuth,
  asyncHandler(getCurrentUser)
);

router.get(
  "/:walletAddress",
  validateRequest(walletAddressParamSchema, "params"),
  asyncHandler(getUserByWallet)
);

router.patch(
  "/:walletAddress/verification",
  requireSiweAuth,
  validateRequest(walletAddressParamSchema, "params"),
  requireMatchingWalletParam,
  validateRequest(updateVerificationSchema, "body"),
  asyncHandler(updateVerification)
);

module.exports = router;
