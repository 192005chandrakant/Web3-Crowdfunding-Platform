const Notification = require("../models/Notification");
const { notificationEngine } = require("../services/notifications/NotificationEngine");
const realtimeSSEObserver = require("../services/notifications/observers/RealtimeSSEObserver");

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

/**
 * Real-time Server-Sent Events (SSE) streaming endpoint for zero-latency browser notifications.
 */
function streamNotifications(req, res) {
  const { walletAddress } = req.validated ? req.validated.params : req.params;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no"); // Prevents buffering by NGINX / proxies
  res.flushHeaders();

  // Register client browser connection to Realtime SSE Observer
  realtimeSSEObserver.addClient(walletAddress, res);

  // Send initial ping to confirm established live stream
  res.write(`event: connected\ndata: ${JSON.stringify({ status: "streaming", wallet: walletAddress })}\n\n`);
}

async function createNotification(req, res) {
  const payload = req.validated.body;

  // Dispatch through centralized Observer Notification Engine
  const result = await notificationEngine.notify({
    walletAddress: payload.walletAddress,
    type: payload.type,
    title: payload.title,
    message: payload.message,
    metadata: payload.metadata,
    sendEmail: payload.sendEmail
  });

  const savedRecord = result.event?.dbNotification || {
    walletAddress: payload.walletAddress.toLowerCase(),
    type: payload.type,
    title: payload.title,
    message: payload.message,
    metadata: payload.metadata
  };

  res.status(201).json({ success: true, notification: savedRecord });
}

/**
 * Trigger a real-time test notification across all registered Observers (InApp DB + SSE Toast + Email + Audit Log).
 */
async function sendTestNotification(req, res) {
  const body = (req.validated && req.validated.body) ? req.validated.body : req.body;
  const { walletAddress, type = "campaign_update", title, message, recipientEmail } = body || {};

  if (!walletAddress) {
    return res.status(400).json({ success: false, message: "walletAddress is required to dispatch test notification." });
  }

  const result = await notificationEngine.notify({
    walletAddress,
    recipientEmail,
    type,
    title: title || "âš¡ Live System Test Notification",
    message: message || "Your integrated Observer Design Pattern Notification engine & Real-time SSE stream are 100% active and operational!",
    metadata: {
      isTest: true,
      actionUrl: `${process.env.FRONTEND_URL || "http://localhost:5173"}/notifications`
    },
    sendEmail: true
  });

  res.status(201).json({
    success: true,
    message: "Test notification broadcasted to all active observers!",
    result: {
      activeObservers: result.observerResults,
      event: result.event?.dbNotification || result.event
    }
  });
}

async function markNotificationRead(req, res) {
  const { id } = req.validated.params;

  const notification = await Notification.findByIdAndUpdate(
    id,
    { $set: { readAt: new Date() } },
    { returnDocument: 'after' }
  ).lean();

  if (!notification) {
    return res.status(404).json({ success: false, message: "Notification not found" });
  }

  res.json({ success: true, notification });
}

async function markAllNotificationsRead(req, res) {
  const { walletAddress } = req.validated.params;

  const result = await Notification.updateMany(
    { walletAddress: walletAddress.toLowerCase(), readAt: null },
    { $set: { readAt: new Date() } }
  );

  res.json({ success: true, count: result.modifiedCount });
}

module.exports = {
  listNotifications,
  streamNotifications,
  createNotification,
  sendTestNotification,
  markNotificationRead,
  markAllNotificationsRead
};
