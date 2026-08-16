const mongoose = require("mongoose");

const blockchainEventSchema = new mongoose.Schema(
  {
    eventName: {
      type: String,
      required: true,
      enum: [
        "ContributionReceived",
        "MilestoneProofSubmitted",
        "MilestoneVoted",
        "TrancheExecuted",
        "RefundClaimed",
        "CampaignCreated"
      ],
      index: true
    },
    contractAddress: {
      type: String,
      required: true,
      index: true,
      lowercase: true
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
      required: true
    },
    chainId: {
      type: Number,
      default: () => Number(process.env.CHAIN_ID) || 80002
    },
    data: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    processedAt: {
      type: Date,
      default: null
    },
    processingError: {
      type: String,
      default: null
    }
  },
  { timestamps: true }
);

blockchainEventSchema.index({ contractAddress: 1, eventName: 1 });
blockchainEventSchema.index({ processedAt: 1 });

module.exports = mongoose.model("BlockchainEvent", blockchainEventSchema);
