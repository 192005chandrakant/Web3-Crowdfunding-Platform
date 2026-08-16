const mongoose = require("mongoose");

const adminAuditLogSchema = new mongoose.Schema(
  {
    actorWalletAddress: { type: String, required: true, index: true, lowercase: true },
    action: { type: String, required: true, index: true },
    resourceType: {
      type: String,
      required: true,
      enum: ["user", "campaign", "platform"],
      index: true
    },
    resourceId: { type: String, required: true, index: true },
    targetWalletAddress: { type: String, default: null, index: true, lowercase: true },
    outcome: { type: String, enum: ["success", "failed"], default: "success" },
    beforeState: { type: mongoose.Schema.Types.Mixed, default: {} },
    afterState: { type: mongoose.Schema.Types.Mixed, default: {} },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} }
  },
  { timestamps: true }
);

adminAuditLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model("AdminAuditLog", adminAuditLogSchema);