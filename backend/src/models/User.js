const mongoose = require("mongoose");
const { VERIFICATION_STATUS } = require("../config/constants");

const userSchema = new mongoose.Schema(
  {
    walletAddress: {
      type: String,
      required: false,
      unique: true,
      sparse: true,
      index: true,
      lowercase: true
    },
    clerkUserId: { type: String, default: null, sparse: true, index: true },
    displayName: { type: String, default: "", trim: true },
    email: { type: String, default: "", trim: true, lowercase: true },
    role: {
      type: String,
      enum: ["donor", "creator", "admin"],
      default: "donor"
    },
    verificationStatus: {
      type: String,
      enum: Object.values(VERIFICATION_STATUS),
      default: VERIFICATION_STATUS.UNVERIFIED
    },
    verificationProvider: {
      type: String,
      enum: ["sumsub", "stripe", "world_id", "gitcoin", null],
      default: null
    },
    verificationDepositTxHash: { type: String, default: null },
    worldIdVerified: { type: Boolean, default: false },
    gitcoinPassportScore: { type: Number, default: 0 }
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
