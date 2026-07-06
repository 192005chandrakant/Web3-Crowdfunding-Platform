const express = require("express");
const { asyncHandler } = require("../middleware/asyncHandler");
const { validateRequest } = require("../middleware/validateRequest");
const { requireApiKey } = require("../middleware/apiKeyAuth");
const {
  blockchainEventSchema,
  blockchainEventBatchSchema,
  listEventsQuerySchema
} = require("../config/validators");
const {
  receiveEvent,
  receiveBatchEvents,
  listEvents,
  retryEvent
} = require("../controllers/webhookController");
const router = express.Router();

// POST /api/webhooks/blockchain-event — receive a single event (API key required)
router.post(
  "/blockchain-event",
  requireApiKey,
  validateRequest(blockchainEventSchema, "body"),
  asyncHandler(receiveEvent)
);

// POST /api/webhooks/blockchain-events — receive batch events (API key required)
router.post(
  "/blockchain-events",
  requireApiKey,
  validateRequest(blockchainEventBatchSchema, "body"),
  asyncHandler(receiveBatchEvents)
);

// GET /api/webhooks/events — list processed events (API key required)
router.get(
  "/events",
  requireApiKey,
  validateRequest(listEventsQuerySchema, "query"),
  asyncHandler(listEvents)
);

// POST /api/webhooks/events/:id/retry — retry a failed event (API key required)
router.post(
  "/events/:id/retry",
  requireApiKey,
  asyncHandler(retryEvent)
);

module.exports = router;
