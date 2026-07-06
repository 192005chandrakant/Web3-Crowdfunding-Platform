const BlockchainEvent = require("../models/BlockchainEvent");
const { processEvent } = require("../services/eventProcessorService");

async function receiveEvent(req, res) {
  const payload = req.validated.body;

  // Deduplicate by txHash
  const existing = await BlockchainEvent.findOne({
    txHash: payload.txHash.toLowerCase()
  }).lean();

  if (existing) {
    return res.status(409).json({
      success: false,
      message: "Event with this transaction hash already processed",
      eventId: existing._id
    });
  }

  // Store the event
  const event = await BlockchainEvent.create({
    eventName: payload.eventName,
    contractAddress: payload.contractAddress.toLowerCase(),
    txHash: payload.txHash.toLowerCase(),
    blockNumber: payload.blockNumber,
    chainId: payload.chainId,
    data: payload.data || {}
  });

  // Process the event asynchronously (don't block the response)
  processEvent(event.toObject())
    .then(async () => {
      await BlockchainEvent.findByIdAndUpdate(event._id, {
        $set: { processedAt: new Date() }
      });
    })
    .catch(async (error) => {
      console.error(`[webhook] Error processing event ${event._id}:`, error.message);
      await BlockchainEvent.findByIdAndUpdate(event._id, {
        $set: { processingError: error.message }
      });
    });

  res.status(202).json({
    success: true,
    message: "Event received and queued for processing",
    eventId: event._id
  });
}

async function receiveBatchEvents(req, res) {
  const { events } = req.validated.body;

  const results = [];

  for (const payload of events) {
    const existing = await BlockchainEvent.findOne({
      txHash: payload.txHash.toLowerCase()
    }).lean();

    if (existing) {
      results.push({
        txHash: payload.txHash,
        status: "duplicate",
        eventId: existing._id
      });
      continue;
    }

    const event = await BlockchainEvent.create({
      eventName: payload.eventName,
      contractAddress: payload.contractAddress.toLowerCase(),
      txHash: payload.txHash.toLowerCase(),
      blockNumber: payload.blockNumber,
      chainId: payload.chainId,
      data: payload.data || {}
    });

    // Process async
    processEvent(event.toObject())
      .then(async () => {
        await BlockchainEvent.findByIdAndUpdate(event._id, {
          $set: { processedAt: new Date() }
        });
      })
      .catch(async (error) => {
        console.error(`[webhook] Error processing event ${event._id}:`, error.message);
        await BlockchainEvent.findByIdAndUpdate(event._id, {
          $set: { processingError: error.message }
        });
      });

    results.push({
      txHash: payload.txHash,
      status: "accepted",
      eventId: event._id
    });
  }

  res.status(202).json({
    success: true,
    message: `Processed ${results.length} events`,
    results
  });
}

async function listEvents(req, res) {
  const { page, limit, eventName, contractAddress, processed } = req.validated.query;

  const filter = {};
  if (eventName) {
    filter.eventName = eventName;
  }
  if (contractAddress) {
    filter.contractAddress = contractAddress.toLowerCase();
  }
  if (processed === "true") {
    filter.processedAt = { $ne: null };
  } else if (processed === "false") {
    filter.processedAt = null;
  }

  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    BlockchainEvent.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    BlockchainEvent.countDocuments(filter)
  ]);

  res.json({
    success: true,
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1
    }
  });
}

async function retryEvent(req, res) {
  const { id } = req.params;

  const event = await BlockchainEvent.findById(id);
  if (!event) {
    return res.status(404).json({ success: false, message: "Event not found" });
  }

  try {
    await processEvent(event.toObject());
    event.processedAt = new Date();
    event.processingError = null;
    await event.save();

    res.json({ success: true, message: "Event reprocessed successfully", event: event.toObject() });
  } catch (error) {
    event.processingError = error.message;
    await event.save();

    res.status(500).json({
      success: false,
      message: "Event reprocessing failed",
      error: error.message
    });
  }
}

module.exports = {
  receiveEvent,
  receiveBatchEvents,
  listEvents,
  retryEvent
};
