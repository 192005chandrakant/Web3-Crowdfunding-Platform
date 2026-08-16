const mongoose = require("mongoose");
const { VERIFICATION_STATUS, USER_ROLES, ACCOUNT_STATUSES } = require("../config/constants");

const userSchema = new mongoose.Schema(
  {
    // ─── Primary identifier: Clerk User ID (stable, email/social/wallet agnostic) ──
    clerkUserId: {
      type: String,
      default: null,
      sparse: true,
      index: true
    },

    // ─── Primary wallet (legacy compat + display) ─────────────────────────────────
    walletAddress: {
      type: String,
      required: false,
      unique: true,
      sparse: true,
      index: true,
      lowercase: true
    },

    // ─── All wallets ever linked by this Clerk user (multi-wallet support) ────────
    walletAddresses: {
      type: [{ type: String, lowercase: true, trim: true }],
      default: []
    },

    displayName: { type: String, default: "", trim: true },
    email:       { type: String, default: "", trim: true, lowercase: true },

    // ─── Role & Account State ─────────────────────────────────────────────────────
    role: {
      type: String,
      enum: USER_ROLES,
      default: "donor"
    },
    requestedRole: {
      type: String,
      enum: USER_ROLES,
      default: "donor"
    },
    accountStatus: {
      type: String,
      enum: ACCOUNT_STATUSES,
      default: "active",
      index: true
    },
    reviewNotes:  { type: String, default: "", trim: true },
    reviewedBy:   { type: String, default: null, lowercase: true },
    reviewedAt:   { type: Date,   default: null },

    // ─── Onboarding Gate ─────────────────────────────────────────────────────────
    // Set to true after user completes the role-selection onboarding form ONE time.
    // Guards in frontend check this to avoid re-showing the role picker on every login.
    hasOnboarded: {
      type: Boolean,
      default: false,
      index: true
    },

    // ─── Action History (action-driven role tagging) ──────────────────────────────
    // Tracks what on-platform actions a user has performed.
    // Used to auto-tag users and surface context in admin views.
    actionHistory: {
      donated:         { type: Boolean, default: false },
      createdCampaign: { type: Boolean, default: false }
    },

    // ─── Verification / KYC ───────────────────────────────────────────────────────
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
    worldIdVerified:            { type: Boolean, default: false },
    gitcoinPassportScore:       { type: Number,  default: 0 },

    // ─── Preferences ─────────────────────────────────────────────────────────────
    preferences: {
      notifications: {
        email:      { type: Boolean, default: true },
        donations:  { type: Boolean, default: true },
        milestones: { type: Boolean, default: true },
        votes:      { type: Boolean, default: true },
        updates:    { type: Boolean, default: false }
      },
      privacy: {
        publicProfile:  { type: Boolean, default: true },
        showDonations:  { type: Boolean, default: true },
        showCampaigns:  { type: Boolean, default: true }
      },
      appearance: {
        language: { type: String, default: "en" },
        currency: { type: String, default: "USD" },
        theme:    { type: String, default: "dark" }
      }
    }
  },
  { timestamps: true }
);

// ─── Compound indexes ────────────────────────────────────────────────────────────
// Fast lookup by any wallet in the multi-wallet array
userSchema.index({ walletAddresses: 1 });
// Fast pending-review queries for admin dashboard
userSchema.index({ accountStatus: 1, role: 1 });

module.exports = mongoose.model("User", userSchema);
