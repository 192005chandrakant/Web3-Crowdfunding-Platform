const PinataClient = require("@pinata/sdk");
const Campaign = require("../models/Campaign");
const { createCampaignSchema, campaignAddressSchema } = require("../config/validators");

function parseZodResult(schema, payload) {
  const result = schema.safeParse(payload);
  if (!result.success) {
    const error = new Error("Validation failed");
    error.statusCode = 400;
    error.details = result.error.flatten();
    throw error;
  }

  return result.data;
}

function createPinataClient() {
  const apiKey = process.env.PINATA_API_KEY;
  const apiSecret = process.env.PINATA_API_SECRET;
  if (apiKey && apiSecret) {
    return new PinataClient(apiKey, apiSecret);
  }

  if (process.env.PINATA_JWT) {
    return new PinataClient({ pinataJWTKey: process.env.PINATA_JWT });
  }

  throw new Error("Missing Pinata credentials");
}

async function createCampaign(req, res, next) {
  try {
    const payload = parseZodResult(createCampaignSchema, req.body);
    const campaign = await Campaign.findOneAndUpdate(
      { contractAddress: payload.contractAddress },
      { $set: payload },
      { new: true, upsert: true }
    );

    res.status(201).json({ success: true, campaign });
  } catch (error) {
    next(error);
  }
}

async function getCampaignByAddress(req, res, next) {
  try {
    const { address } = parseZodResult(campaignAddressSchema, req.params);
    const campaign = await Campaign.findOne({ contractAddress: address }).lean();

    if (!campaign) {
      return res.status(404).json({ success: false, message: "Campaign not found" });
    }

    res.json({
      success: true,
      campaign,
      blockchainState: {
        contractAddress: address,
        totalFundsRaised: null,
        totalFundsRemaining: null,
        latestMilestoneStatus: "pending_index_sync"
      }
    });
  } catch (error) {
    next(error);
  }
}

async function uploadProof(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "Proof file is required" });
    }

    const pinata = createPinataClient();
    const pinResult = await pinata.pinBuffer(req.file.buffer, {
      pinataMetadata: {
        name: req.file.originalname
      }
    });

    res.status(201).json({
      success: true,
      cid: pinResult.IpfsHash || pinResult.cid,
      fileName: req.file.originalname
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createCampaign,
  getCampaignByAddress,
  uploadProof
};