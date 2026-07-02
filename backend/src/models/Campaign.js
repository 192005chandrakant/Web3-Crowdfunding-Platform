const mongoose = require("mongoose");

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
    contractAddress: { type: String, required: true, unique: true, index: true },
    creatorAddress: { type: String, required: true, index: true },
    title: { type: String, required: true },
    descriptionMarkdown: { type: String, required: true },
    targetGoal: { type: Number, required: true },
    milestones: { type: [milestoneSchema], default: [] },
    category: { type: String, default: "general" },
    hospitalAddress: { type: String, default: null }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Campaign", campaignSchema);