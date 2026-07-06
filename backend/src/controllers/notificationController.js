const Notification = require("../models/Notification");
const User = require("../models/User");
const { sendMilestoneNotification } = require("../services/emailService");

async function listNotifications(req, res) {
  const { walletAddress } = req.validated.params;
  const unreadOnly = req.query.unread === "true";

  const filter = { walletAddress: walletAddress.toLowerCase() };
  if (unreadOnly) {
    filter.readAt = null;
  }

  const notifications = await Notification.find(filter)
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

  res.json({ success: true, notifications });
}

async function createNotification(req, res) {
  const payload = req.validated.body;

  const notification = await Notification.create({
    walletAddress: payload.walletAddress.toLowerCase(),
    type: payload.type,
    title: payload.title,
    message: payload.message,
    metadata: payload.metadata
  });

  if (payload.sendEmail) {
    const user = await User.findOne({ walletAddress: payload.walletAddress.toLowerCase() }).lean();
    if (user?.email) {
      await sendMilestoneNotification({
        email: user.email,
        campaignTitle: payload.metadata?.campaignTitle || "MilestoneChain",
        milestoneTitle: payload.title,
        actionUrl: payload.metadata?.actionUrl || process.env.FRONTEND_URL || "http://localhost:5173"
      });
      notification.emailSentAt = new Date();
      await notification.save();
    }
  }

  res.status(201).json({ success: true, notification: notification.toObject() });
}

async function markNotificationRead(req, res) {
  const { id } = req.validated.params;

  const notification = await Notification.findByIdAndUpdate(
    id,
    { $set: { readAt: new Date() } },
    { new: true }
  ).lean();

  if (!notification) {
    return res.status(404).json({ success: false, message: "Notification not found" });
  }

  res.json({ success: true, notification });
}

module.exports = {
  listNotifications,
  createNotification,
  markNotificationRead
};
