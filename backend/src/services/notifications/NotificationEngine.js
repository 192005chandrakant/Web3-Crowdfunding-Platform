/**
 * NotificationEngine - Core Subject (Observable) in the Observer Design Pattern.
 * Decouples system events from notification distribution channels (Database Inbox, Resend Email, Real-time SSE, Cache Invalidation).
 */

class NotificationEngine {
  constructor() {
    this.observers = new Set();
    this.stats = {
      totalNotified: 0,
      successCount: 0,
      failureCount: 0
    };
  }

  /**
   * Subscribe a concrete observer to receive future notifications.
   * @param {Object} observer - Concrete observer implementing onNotify(event)
   */
  subscribe(observer) {
    if (!observer || typeof observer.onNotify !== "function") {
      throw new Error("[NotificationEngine] Invalid observer: must implement onNotify(event) method.");
    }
    this.observers.add(observer);
    const name = observer.constructor?.name || "AnonymousObserver";
    console.log(`[NotificationEngine] Registered Observer: ${name} (Total: ${this.observers.size})`);
    return this;
  }

  /**
   * Unsubscribe an observer.
   * @param {Object} observer
   */
  unsubscribe(observer) {
    this.observers.delete(observer);
    const name = observer.constructor?.name || "AnonymousObserver";
    console.log(`[NotificationEngine] Unsubscribed Observer: ${name} (Remaining: ${this.observers.size})`);
    return this;
  }

  /**
   * Notify all registered observers asynchronously.
   * Uses Promise.allSettled so a fault in one communication channel never impacts others.
   * 
   * @param {Object} rawEvent - Notification event payload
   *   {
   *     walletAddress: string,
   *     type: string,
   *     title: string,
   *     message: string,
   *     metadata: Object,
   *     sendEmail?: boolean,
   *     actionUrl?: string
   *   }
   */
  async notify(rawEvent) {
    if (!rawEvent || !rawEvent.walletAddress || !rawEvent.type) {
      console.warn("[NotificationEngine] Invalid event payload received, missing walletAddress or type:", rawEvent);
      return { success: false, reason: "Invalid event payload" };
    }

    const event = {
      ...rawEvent,
      walletAddress: rawEvent.walletAddress.toLowerCase(),
      metadata: rawEvent.metadata || {},
      timestamp: rawEvent.timestamp || new Date()
    };

    this.stats.totalNotified++;
    console.log(`[NotificationEngine] Dispatching event '${event.type}' to ${this.observers.size} observers for ${event.walletAddress}`);

    const observerPromises = Array.from(this.observers).map(async (observer) => {
      const observerName = observer.constructor?.name || "UnknownObserver";
      try {
        await observer.onNotify(event);
        return { observer: observerName, status: "fulfilled" };
      } catch (err) {
        console.error(`[NotificationEngine] Observer '${observerName}' failed during onNotify:`, err.message);
        return { observer: observerName, status: "rejected", error: err.message };
      }
    });

    const results = await Promise.allSettled(observerPromises);

    let hadErrors = false;
    results.forEach((r) => {
      if (r.status === "rejected" || (r.value && r.value.status === "rejected")) {
        hadErrors = true;
      }
    });

    if (hadErrors) {
      this.stats.failureCount++;
    } else {
      this.stats.successCount++;
    }

    return {
      success: true,
      event,
      observerResults: results.map(r => r.value || { status: "rejected", error: r.reason })
    };
  }

  /**
   * Get operational metrics and health status of the Notification Engine.
   */
  getStatus() {
    return {
      active: true,
      observerCount: this.observers.size,
      registeredObservers: Array.from(this.observers).map(o => o.constructor?.name || "AnonymousObserver"),
      stats: this.stats
    };
  }
}

// Singleton instance of the notification engine
const notificationEngine = new NotificationEngine();

module.exports = { NotificationEngine, notificationEngine };
