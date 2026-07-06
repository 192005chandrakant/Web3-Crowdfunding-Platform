const mongoose = require("mongoose");
const { NOTIFICATION_TYPES } = require("../config/constants");

const notificationSchema = new mongoose.Schema(
  {
    walletAddress: { type: String, required: true, index: true, lowercase: true },
    type: {
      type: String,
      enum: Object.values(NOTIFICATION_TYPES),
      required: true
    },
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    readAt: { type: Date, default: null },
    emailSentAt: { type: Date, default: null }
  },
  { timestamps: true }
);

notificationSchema.index({ walletAddress: 1, createdAt: -1 });

module.exports = mongoose.model("Notification", notificationSchema);
