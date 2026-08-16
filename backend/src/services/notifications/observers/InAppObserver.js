const Notification = require("../../../models/Notification");
const { NOTIFICATION_TYPES } = require("../../../config/constants");

/**
 * InAppObserver - Concrete Observer responsible for persisting notifications to MongoDB
 * so users can read them in their app inbox and view their unread count badge.
 */
class InAppObserver {
  async onNotify(event) {
    // Validate or fallback notification type against supported constants
    const type = Object.values(NOTIFICATION_TYPES).includes(event.type)
      ? event.type
      : NOTIFICATION_TYPES.CAMPAIGN_UPDATE;

    try {
      const notification = await Notification.create({
        walletAddress: event.walletAddress.toLowerCase(),
        type,
        title: event.title,
        message: event.message,
        metadata: event.metadata || {},
        emailSentAt: event.emailSent ? new Date() : null
      });

      // Attach database record to the event payload so subsequent observers (like RealtimeSSEObserver) 
      // can broadcast the official DB ID and timestamp to active client browsers
      event.dbNotification = notification.toObject();
      console.log(`[InAppObserver] Persisted notification to inbox for ${event.walletAddress} (ID: ${notification._id})`);
      return notification;
    } catch (error) {
      console.error(`[InAppObserver] Failed to save notification for ${event.walletAddress}:`, error.message);
      throw error;
    }
  }
}

module.exports = new InAppObserver();
