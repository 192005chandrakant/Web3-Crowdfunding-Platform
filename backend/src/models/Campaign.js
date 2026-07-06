const mongoose = require("mongoose");
const { CAMPAIGN_CATEGORIES } = require("../config/constants");

const milestoneSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    targetAmount: { type: Number, required: true },
    deadline: { type: String, required: true },
    proofCid: { type: String, default: "" }
  },
  { _id: false }
);

const campaignSchema = new mongoose.Schema(
  {
    contractAddress: {
      type: String,
      required: true,
      unique: true,
      index: true,
      lowercase: true
    },
    creatorAddress: { type: String, required: true, index: true, lowercase: true },
    title: { type: String, required: true, trim: true },
    descriptionMarkdown: { type: String, required: true },
    targetGoal: { type: Number, required: true },
    milestones: { type: [milestoneSchema], default: [] },
    category: {
      type: String,
      enum: CAMPAIGN_CATEGORIES,
      default: "general",
      index: true
    },
    hospitalAddress: { type: String, default: null, lowercase: true },
    coverImageUrl: { type: String, default: "" },
    tags: { type: [String], default: [] },
    status: {
      type: String,
      enum: ["draft", "active", "completed", "cancelled", "suspended"],
      default: "active",
      index: true
    },
    chainId: { type: Number, default: 80002 },
    flagged: { type: Boolean, default: false, index: true },
    flagReason: { type: String, default: null }
  },
  { timestamps: true }
);

campaignSchema.index({ title: "text", descriptionMarkdown: "text" });

module.exports = mongoose.model("Campaign", campaignSchema);
