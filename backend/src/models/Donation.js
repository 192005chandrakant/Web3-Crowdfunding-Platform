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
      default: 80002
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
    }
  },
  { timestamps: true }
);

donationSchema.index({ walletAddress: 1, createdAt: -1 });
donationSchema.index({ campaignAddress: 1, createdAt: -1 });
donationSchema.index({ walletAddress: 1, campaignAddress: 1 });

module.exports = mongoose.model("Donation", donationSchema);
