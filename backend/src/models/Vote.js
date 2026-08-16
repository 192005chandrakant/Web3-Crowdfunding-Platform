const mongoose = require("mongoose");

/**
 * Vote model — tracks off-chain records of on-chain milestone votes.
 * Created by the event processor when it sees a MilestoneVoted event.
 *
 * Quadratic Voting fields:
 *  - rawContributionWei: the donor's total contribution in wei at vote time
 *  - qvPower:            sqrt(rawContributionWei) as a string (BigInt-safe)
 *  - qvPowerDisplay:     human-readable QV power (e.g., "10.00 votes")
 */
const voteSchema = new mongoose.Schema(
  {
    walletAddress: {
      type: String,
      required: true,
      index: true,
      lowercase: true
    },
    campaignAddress: {
      type: String,
      required: true,
      index: true,
      lowercase: true
    },
    milestoneIndex: {
      type: Number,
      required: true,
      min: 0
    },
    support: {
      type: Boolean,
      required: true
    },
    txHash: {
      type: String,
      required: true,
      unique: true,
      index: true,
      lowercase: true
    },
    blockNumber: {
      type: Number,
      default: null
    },
    chainId: {
      type: Number,
      default: () => Number(process.env.CHAIN_ID) || 80002
    },
    // Quadratic Voting fields
    rawContributionWei: {
      type: String,
      default: "0"
    },
    qvPower: {
      type: String,
      default: "0"  // floor(sqrt(rawContributionWei)) stored as string for BigInt precision
    },
    qvPowerDisplay: {
      type: String,
      default: "0"  // e.g. "10.00" (qvPower / 1e9 for MATIC, formatted to 2dp)
    }
  },
  { timestamps: true }
);

// Compound index: one vote per wallet per campaign per milestone
voteSchema.index({ walletAddress: 1, campaignAddress: 1, milestoneIndex: 1 }, { unique: true });
voteSchema.index({ campaignAddress: 1, milestoneIndex: 1, createdAt: -1 });
voteSchema.index({ walletAddress: 1, createdAt: -1 });

module.exports = mongoose.model("Vote", voteSchema);
