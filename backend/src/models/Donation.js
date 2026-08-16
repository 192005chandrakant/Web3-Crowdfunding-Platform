const mongoose = require("mongoose");

const donationSchema = new mongoose.Schema(
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
    amount: {
      type: String,
      required: true
    },
    amountWei: {
      type: String,
      required: true
    },
    txHash: {
      type: String,
      required: true,
      unique: true,
      index: true,
      lowercase: true
    },
    chainId: {
      type: Number,
      default: () => Number(process.env.CHAIN_ID) || 80002
    },
    blockNumber: {
      type: Number,
      default: null
    },
    status: {
      type: String,
      enum: ["confirmed", "pending", "failed"],
      default: "confirmed",
      index: true
    },
    // ── Quadratic Voting fields ─────────────────────────────────────────────
    // quadraticVotingPower: floor(sqrt(amountWei)) stored as string for BigInt precision
    // Example: 100 POL (100e18 wei) → sqrt(100e18) = 10e9 → stored as "10000000000"
    quadraticVotingPower: {
      type: String,
      default: "0"
    },
    // qvPowerDisplay: human-readable (qvPower / 1e9 formatted to 4dp)
    // Example: "10.0000" means the donor gets 10 votes
    qvPowerDisplay: {
      type: String,
      default: "0.0000"
    },
    // isEligibleToVote: true if amountWei >= MIN_CONTRIBUTION_WEI (0.001 POL = 1e15 wei)
    isEligibleToVote: {
      type: Boolean,
      default: false,
      index: true
    }
  },
  { timestamps: true }
);

donationSchema.index({ walletAddress: 1, createdAt: -1 });
donationSchema.index({ campaignAddress: 1, createdAt: -1 });
donationSchema.index({ walletAddress: 1, campaignAddress: 1 });

module.exports = mongoose.model("Donation", donationSchema);
