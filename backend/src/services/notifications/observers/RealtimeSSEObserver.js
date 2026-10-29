/**
 * RealtimeSSEObserver - Concrete Observer responsible for broadcasting real-time Server-Sent Events (SSE)
 * over open HTTP streaming connections to connected client wallet browsers with zero polling latency.
 */
class RealtimeSSEObserver {
  constructor() {
    // Map<lowercaseWalletAddress, Set<ExpressResponse>>
    // Supports multiple open browser tabs/windows per user wallet
    this.clients = new Map();

    // Start automated keep-alive heartbeats (prevents NGINX/Cloudflare/Browser read timeouts)
    this.heartbeatInterval = setInterval(() => {
      this.sendHeartbeat();
    }, 25000);
    if (this.heartbeatInterval?.unref) {
      this.heartbeatInterval.unref();
    }
  }

  /**
   * Register a new client streaming HTTP connection.
   * @param {string} walletAddress
   * @param {Object} res - Express Response stream
   */
  addClient(walletAddress, res) {
    const address = walletAddress.toLowerCase();
    if (!this.clients.has(address)) {
      this.clients.set(address, new Set());
    }

    const clientSet = this.clients.get(address);
    clientSet.add(res);

    console.log(`[RealtimeSSEObserver] Client streaming connection added for ${address} (Active tabs: ${clientSet.size})`);

    // Remove client cleanly on socket close / abort
    reqOrResCloseHandler(res, () => {
      this.removeClient(address, res);
    });
  }

  /**
   * Remove a disconnected response stream from registry.
   * @param {string} walletAddress
   * @param {Object} res
   */
  removeClient(walletAddress, res) {
    const address = walletAddress.toLowerCase();
    const clientSet = this.clients.get(address);
    if (clientSet) {
      clientSet.delete(res);
      if (clientSet.size === 0) {
        this.clients.delete(address);
      }
      console.log(`[RealtimeSSEObserver] Client stream disconnected for ${address} (Remaining tabs: ${clientSet ? clientSet.size : 0})`);
    }
  }

  /**
   * Broadcast heartbeat comments to keep HTTP streaming connections alive.
   */
  sendHeartbeat() {
    let totalTabs = 0;
    for (const [address, resSet] of this.clients.entries()) {
      for (const res of resSet) {
        try {
          res.write(`: heartbeat ${Date.now()}\n\n`);
          totalTabs++;
        } catch (err) {
          this.removeClient(address, res);
        }
      }
    }
  }

  /**
   * On notification event, instantly transmit formatted JSON event via SSE to matching open wallet tabs.
   * @param {Object} event - Notification event from NotificationEngine
   */
  async onNotify(event) {
    const address = event.walletAddress.toLowerCase();
    const clientSet = this.clients.get(address);

    if (!clientSet || clientSet.size === 0) {
      console.log(`[RealtimeSSEObserver] No open SSE client streams for wallet ${address}. Event will wait in inbox.`);
      return { delivered: 0 };
    }

    // Prefer broadcasting the full database-saved document (with valid _id & timestamps), fall back to event
    const payload = event.dbNotification || event;
    const sseFormattedData = `event: notification\ndata: ${JSON.stringify(payload)}\n\n`;

    let deliveryCount = 0;
    for (const res of clientSet) {
      try {
        res.write(sseFormattedData);
        deliveryCount++;
      } catch (err) {
        console.error(`[RealtimeSSEObserver] Error transmitting SSE to ${address}:`, err.message);
        this.removeClient(address, res);
      }
    }

    console.log(`[RealtimeSSEObserver] Realtime notification broadcasted to ${deliveryCount} open stream tab(s) for ${address}!`);
    return { delivered: deliveryCount };
  }

  /**
   * Return real-time streaming health telemetry and connected wallet counts.
   */
  getStats() {
    let totalConnections = 0;
    this.clients.forEach(set => { totalConnections += set.size; });
    return {
      connectedWallets: this.clients.size,
      totalStreamingTabs: totalConnections
    };
  }
}

function reqOrResCloseHandler(res, callback) {
  res.on("close", callback);
  res.on("error", callback);
}

module.exports = new RealtimeSSEObserver();
