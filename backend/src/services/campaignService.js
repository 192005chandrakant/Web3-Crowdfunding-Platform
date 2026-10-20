const Campaign = require("../models/Campaign");
const Notification = require("../models/Notification");
const User = require("../models/User");
const {
  invalidateCampaignCache,
  cacheCampaign,
  getCampaignFromCache
} = require("./cacheService");
const { fetchOnChainCampaignState } = require("./blockchainService");
const { NOTIFICATION_TYPES } = require("../config/constants");

function weiToPolDisplay(amountWei) {
  try {
    const wei = BigInt(amountWei || "0");
    const base = 10n ** 18n;
    const whole = wei / base;
    const fraction = (wei % base).toString().padStart(18, "0").slice(0, 4);
    return `${whole}.${fraction}`;
  } catch {
    return "0.0000";
  }
}

function weiToPolNumber(amountWei) {
  return Number.parseFloat(weiToPolDisplay(amountWei));
}

function buildCampaignUpsertUpdate(payload) {
  const updates = { ...payload };
  const coverImageUrl =
    typeof payload.coverImageUrl === "string" ? payload.coverImageUrl.trim() : "";

  if (coverImageUrl) {
    updates.coverImageUrl = coverImageUrl;
  } else {
    delete updates.coverImageUrl;
  }

  const setOnInsert = {};
  if (!coverImageUrl) {
    setOnInsert.coverImageUrl = "";
  }

  const update = { $set: updates };
  if (Object.keys(setOnInsert).length > 0) {
    update.$setOnInsert = setOnInsert;
  }

  return update;
}

async function createOrUpdateCampaign(payload) {
  const update = buildCampaignUpsertUpdate(payload);

  const campaign = await Campaign.findOneAndUpdate(
    { contractAddress: payload.contractAddress },
    update,
    { returnDocument: 'after', upsert: true, setDefaultsOnInsert: true, runValidators: true }
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

  // Optimized Caching for heavy count query
  const { getCached, setCached } = require("./cacheService");
  const countCacheKey = `campaigns:count:${JSON.stringify(filter)}`;
  let total = await getCached(countCacheKey);
  
  if (total === null || total === undefined) {
    total = await Campaign.countDocuments(filter);
    await setCached(countCacheKey, total, 60); // Cache count for 60 seconds
  }

  const items = await Campaign.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean();
  const enrichedItems = await enrichCampaignsWithDonationStats(items);

  return {
    items: enrichedItems,
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
    { returnDocument: 'after' }
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
    { returnDocument: 'after' }
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

/**
 * Aggregate donation stats for a single campaign.
 * Returns unique donor count, total raised (MATIC), recent donation list.
 */
async function getCampaignDonorStats(contractAddress) {
  const Donation = require("../models/Donation");

  const normalizedAddress = contractAddress.toLowerCase();

  const confirmedDonations = await Donation.find(
    { campaignAddress: normalizedAddress, status: "confirmed" },
    { walletAddress: 1, amountWei: 1 }
  ).lean();

  let totalAmountWei = 0n;
  const uniqueDonors = new Set();
  for (const donation of confirmedDonations) {
    uniqueDonors.add(donation.walletAddress);
    try {
      totalAmountWei += BigInt(donation.amountWei || "0");
    } catch {
      console.warn("[campaignService] Ignoring invalid amountWei:", donation.amountWei);
    }
  }

  const recentDonations = await Donation.find({
    campaignAddress: normalizedAddress,
    status: "confirmed"
  })
    .sort({ createdAt: -1 })
    .limit(5)
    .select("walletAddress amount amountWei txHash createdAt")
    .lean();

  return {
    stats: {
      totalDonations: confirmedDonations.length,
      uniqueDonorCount: uniqueDonors.size,
      totalAmountWei: totalAmountWei.toString()
    },
    recentDonations: recentDonations.map((donation) => ({
      ...donation,
      amount: weiToPolDisplay(donation.amountWei)
    }))
  };
}

async function enrichCampaignsWithDonationStats(campaigns) {
  if (!campaigns.length) {
    return campaigns;
  }

  const Donation = require("../models/Donation");
  const campaignAddresses = campaigns
    .map((campaign) => campaign.contractAddress?.toLowerCase())
    .filter(Boolean);

  const donations = await Donation.find(
    { campaignAddress: { $in: campaignAddresses }, status: "confirmed" },
    { campaignAddress: 1, walletAddress: 1, amountWei: 1 }
  ).lean();

  const statsMap = new Map();
  for (const donation of donations) {
    const address = String(donation.campaignAddress || "").toLowerCase();
    if (!address) {
      continue;
    }

    const current = statsMap.get(address) || {
      totalAmountWei: 0n,
      uniqueDonors: new Set(),
      donationCount: 0
    };

    try {
      current.totalAmountWei += BigInt(donation.amountWei || "0");
    } catch {
      console.warn("[campaignService] Ignoring invalid list amountWei:", donation.amountWei);
    }

    if (donation.walletAddress) {
      current.uniqueDonors.add(String(donation.walletAddress).toLowerCase());
    }
    current.donationCount += 1;
    statsMap.set(address, current);
  }

  return campaigns.map((campaign) => {
    const address = campaign.contractAddress.toLowerCase();
    const stats = statsMap.get(address);
    const totalRaised = stats ? weiToPolDisplay(stats.totalAmountWei.toString()) : "0.0000";
    const raisedNum = Number.parseFloat(totalRaised) || 0;
    const goalNum = Number(campaign.targetGoal) || 0;

    return {
      ...campaign,
      totalRaised,
      totalRaisedWei: stats ? stats.totalAmountWei.toString() : "0",
      donorCount: stats ? stats.uniqueDonors.size : 0,
      donationCount: stats ? stats.donationCount : 0,
      progressPercentage: goalNum > 0 ? Math.min(100, Math.round((raisedNum / goalNum) * 100)) : 0
    };
  });
}

async function listMilestoneReviews({ page, limit, search }) {
  const filter = {
    status: "active",
    milestones: {
      $elemMatch: {
        proofCid: { $exists: true, $ne: "" },
        isPaid: { $ne: true }
      }
    }
  };

  if (search) {
    filter.$or = [
      { title: { $regex: search, $options: "i" } },
      { descriptionMarkdown: { $regex: search, $options: "i" } },
      { contractAddress: { $regex: search, $options: "i" } }
    ];
  }

  const campaigns = await Campaign.find(filter)
    .sort({ updatedAt: -1, createdAt: -1 })
    .lean();

  const allItems = [];
  for (const campaign of campaigns) {
    (campaign.milestones || []).forEach((milestone, index) => {
      const proofCid = typeof milestone.proofCid === "string" ? milestone.proofCid.trim() : "";
      if (!proofCid || milestone.isPaid) {
        return;
      }

      allItems.push({
        id: `${campaign.contractAddress}:${index}`,
        campaignAddress: campaign.contractAddress,
        campaignTitle: campaign.title,
        creatorAddress: campaign.creatorAddress,
        category: campaign.category,
        coverImageUrl: campaign.coverImageUrl || "",
        milestoneIndex: index,
        milestoneTitle: milestone.title,
        targetAmount: milestone.targetAmount,
        deadline: milestone.deadline,
        proofCid,
        createdAt: campaign.createdAt,
        updatedAt: campaign.updatedAt
      });
    });
  }

  const skip = (page - 1) * limit;
  const items = allItems.slice(skip, skip + limit);

  return {
    items,
    pagination: {
      page,
      limit,
      total: allItems.length,
      totalPages: Math.ceil(allItems.length / limit) || 1
    }
  };
}

/**
 * List campaigns filtered by status with pagination.
 */
async function listCampaignsByStatus(status, page = 1, limit = 12) {
  const filter = {};
  if (status) {
    filter.status = status;
  }

  const skip = (page - 1) * limit;

  // Optimized Caching for heavy count query
  const { getCached, setCached } = require("./cacheService");
  const countCacheKey = `campaigns:count:${JSON.stringify(filter)}`;
  let total = await getCached(countCacheKey);
  
  if (total === null || total === undefined) {
    total = await Campaign.countDocuments(filter);
    await setCached(countCacheKey, total, 60); // Cache count for 60 seconds
  }

  const items = await Campaign.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean();

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

/**
 * Aggregated Creator Dashboard summary without N+1 queries.
 * Returns total raised POL, total donors, campaign status breakdowns, and proof alerts.
 */
async function getCreatorDashboardSummary(creatorAddress) {
  const Donation = require("../models/Donation");
  const normalizedCreator = creatorAddress.toLowerCase();
  const user = await User.findOne({
    $or: [{ walletAddress: normalizedCreator }, { walletAddresses: normalizedCreator }]
  }).lean();
  const creatorWallets = user
    ? [...new Set([user.walletAddress, ...(user.walletAddresses || [])].filter(Boolean).map((wallet) => wallet.toLowerCase()))]
    : [normalizedCreator];
  const creatorFilter = user?.clerkUserId
    ? { $or: [{ creatorAddress: { $in: creatorWallets } }, { clerkUserId: user.clerkUserId }] }
    : { creatorAddress: { $in: creatorWallets } };

  const campaigns = await Campaign.find(creatorFilter)
    .sort({ createdAt: -1 })
    .lean();

  if (!campaigns || campaigns.length === 0) {
    return {
      creatorStats: {
        totalCampaigns: 0,
        activeCampaigns: 0,
        completedCampaigns: 0,
        totalTargetGoal: 0,
        totalRaised: "0",
        totalUniqueDonors: 0,
        pendingProofCount: 0
      },
      campaigns: []
    };
  }

  const campaignAddresses = campaigns.map((c) => c.contractAddress.toLowerCase());

  const donations = await Donation.find(
    { campaignAddress: { $in: campaignAddresses }, status: "confirmed" },
    { campaignAddress: 1, walletAddress: 1, amountWei: 1 }
  ).lean();

  const statsMap = new Map();
  const allUniqueDonors = new Set();
  let totalRaisedAcc = 0;

  for (const donation of donations) {
    const campaignAddress = String(donation.campaignAddress || "").toLowerCase();
    if (!campaignAddress) {
      continue;
    }

    const current = statsMap.get(campaignAddress) || {
      totalAmountWei: 0n,
      uniqueDonors: new Set(),
      donationCount: 0
    };

    try {
      current.totalAmountWei += BigInt(donation.amountWei || "0");
    } catch {
      console.warn("[campaignService] Ignoring invalid creator dashboard amountWei:", donation.amountWei);
    }

    if (donation.walletAddress) {
      const wallet = donation.walletAddress.toLowerCase();
      current.uniqueDonors.add(wallet);
      allUniqueDonors.add(wallet);
    }
    current.donationCount += 1;
    statsMap.set(campaignAddress, current);
  }

  let activeCount = 0;
  let completedCount = 0;
  let totalGoalAcc = 0;
  let pendingProofCount = 0;

  const enrichedCampaigns = campaigns.map((c) => {
    const addr = c.contractAddress.toLowerCase();
    const rawStat = statsMap.get(addr);
    const totalRaised = rawStat ? weiToPolDisplay(rawStat.totalAmountWei.toString()) : "0.0000";
    const stat = rawStat
      ? {
          totalRaised,
          donorCount: rawStat.uniqueDonors.size,
          donationCount: rawStat.donationCount
        }
      : { totalRaised: "0.0000", donorCount: 0, donationCount: 0 };
    const goal = c.targetGoal || 0;
    totalGoalAcc += goal;

    const status = c.status || "active";
    if (status === "completed") {
      completedCount++;
    } else {
      activeCount++;
    }

    const raisedNum = parseFloat(stat.totalRaised);
    totalRaisedAcc += raisedNum;
    const progressPercentage = goal > 0 ? Math.min(100, Math.round((raisedNum / goal) * 100)) : 0;

    // Check if any active milestone requires proof
    const requiresProofUpload = (c.milestones || []).some((m, idx) => {
      // If no proofCid is uploaded and campaign is active
      return !m.proofCid && status === "active" && idx === 0;
    });

    if (requiresProofUpload) {
      pendingProofCount++;
    }

    return {
      ...c,
      totalRaised: stat.totalRaised,
      donorCount: stat.donorCount,
      donationCount: stat.donationCount,
      progressPercentage,
      requiresProofUpload
    };
  });

  return {
    creatorStats: {
      totalCampaigns: campaigns.length,
      activeCampaigns: activeCount,
      completedCampaigns: completedCount,
      totalTargetGoal: totalGoalAcc,
      totalRaised: totalRaisedAcc.toFixed(3),
      totalUniqueDonors: allUniqueDonors.size,
      pendingProofCount
    },
    campaigns: enrichedCampaigns
  };
}

module.exports = {
  buildCampaignUpsertUpdate,
  createOrUpdateCampaign,
  getCampaignWithBlockchainState,
  listCampaigns,
  listMilestoneReviews,
  updateCampaignMetadata,
  recordProofSubmission,
  getCampaignDonorStats,
  listCampaignsByStatus,
  getCreatorDashboardSummary
};

