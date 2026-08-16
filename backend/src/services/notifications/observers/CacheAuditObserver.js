const { invalidateCampaignCache, invalidate } = require("../../../services/cacheService");

/**
 * CacheAuditObserver - Concrete Observer responsible for keeping application cache (Upstash Redis)
 * strictly synchronized upon system events and recording structured diagnostic telemetry.
 */
class CacheAuditObserver {
  async onNotify(event) {
    try {
      // Record clean structured diagnostic log for auditing
      const auditEntry = {
        timestamp: new Date().toISOString(),
        event: event.type,
        wallet: event.walletAddress,
        title: event.title,
        contract: event.metadata?.contractAddress || null,
        txHash: event.metadata?.txHash || null
      };

      console.log(`[CacheAuditObserver] AUDIT LOG: ${JSON.stringify(auditEntry)}`);

      // Automatically invalidate Redis campaign cache when an event is associated with a contract address
      if (event.metadata?.contractAddress) {
        const contract = event.metadata.contractAddress;
        await invalidateCampaignCache(contract);
        console.log(`[CacheAuditObserver] Automatically invalidated Redis cache for campaign ${contract}`);
      }

      // Automatically invalidate user-related cached queries if needed
      if (event.walletAddress) {
        await invalidate(`user:portfolio:${event.walletAddress.toLowerCase()}`);
      }

      return { auditRecorded: true, cacheInvalidated: Boolean(event.metadata?.contractAddress) };
    } catch (error) {
      console.warn(`[CacheAuditObserver] Non-fatal error during audit/cache invalidation:`, error.message);
      return { error: error.message };
    }
  }
}

module.exports = new CacheAuditObserver();
