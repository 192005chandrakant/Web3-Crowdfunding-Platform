const Campaign = require("../models/Campaign");
const Notification = require("../models/Notification");
const {
  invalidateCampaignCache,
  cacheCampaign,
  getCampaignFromCache
} = require("./cacheService");
const { fetchOnChainCampaignState } = require("./blockchainService");
const { NOTIFICATION_TYPES } = require("../config/constants");

async function createOrUpdateCampaign(payload) {
  const campaign = await Campaign.findOneAndUpdate(
    { contractAddress: payload.contractAddress },
    { $set: payload },
    { new: true, upsert: true }
  ).lean();

  await invalidateCampaignCache(payload.contractAddress);
  await cacheCampaign(payload.contractAddress, campaign);

  return campaign;
}

async function getCampaignWithBlockchainState(address) {
  let campaign = await getCampaignFromCache(address);

  if (!campaign) {
    campaign = await Campaign.findOne({ contractAddress: address }).lean();
    if (campaign) {
      await cacheCampaign(address, campaign);
    }
  }

  if (!campaign) {
    return null;
  }

  let blockchainState;
  try {
    blockchainState = await fetchOnChainCampaignState(address);
  } catch (error) {
    console.warn("[blockchain] Failed to read contract state:", error.message);
    blockchainState = {
      contractAddress: address,
      synced: false,
      totalFundsRaised: null,
      totalFundsRemaining: null,
      fundraisingGoal: null,
      latestMilestoneStatus: "rpc_unavailable",
      milestones: []
    };
  }

  return { campaign, blockchainState };
}

async function listCampaigns({ page, limit, category, creatorAddress, search }) {
  const filter = {};

  if (category) {
    filter.category = category;
  }

  if (creatorAddress) {
    filter.creatorAddress = creatorAddress.toLowerCase();
  }

  if (search) {
    filter.$or = [
      { title: { $regex: search, $options: "i" } },
      { descriptionMarkdown: { $regex: search, $options: "i" } }
    ];
  }

  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    Campaign.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Campaign.countDocuments(filter)
  ]);

  return {
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1
    }
  };
}

async function updateCampaignMetadata(address, updates) {
  const campaign = await Campaign.findOneAndUpdate(
    { contractAddress: address },
    { $set: updates },
    { new: true }
  ).lean();

  if (!campaign) {
    return null;
  }

  await invalidateCampaignCache(address);
  await cacheCampaign(address, campaign);
  return campaign;
}

async function recordProofSubmission({ contractAddress, milestoneIndex, cid, submittedBy }) {
  const campaign = await Campaign.findOne({ contractAddress }).lean();
  if (!campaign) {
    return null;
  }

  const milestones = [...campaign.milestones];
  if (milestoneIndex < 0 || milestoneIndex >= milestones.length) {
    const error = new Error("Invalid milestone index");
    error.statusCode = 400;
    throw error;
  }

  milestones[milestoneIndex] = {
    ...milestones[milestoneIndex],
    proofCid: cid
  };

  const updated = await Campaign.findOneAndUpdate(
    { contractAddress },
    { $set: { milestones } },
    { new: true }
  ).lean();

  await invalidateCampaignCache(contractAddress);

  await Notification.create({
    walletAddress: campaign.creatorAddress,
    type: NOTIFICATION_TYPES.MILESTONE_PROOF,
    title: "Proof submitted",
    message: `Proof CID ${cid} recorded for milestone "${milestones[milestoneIndex].title}".`,
    metadata: { contractAddress, milestoneIndex, cid, submittedBy }
  });

  return updated;
}

module.exports = {
  createOrUpdateCampaign,
  getCampaignWithBlockchainState,
  listCampaigns,
  updateCampaignMetadata,
  recordProofSubmission
};
