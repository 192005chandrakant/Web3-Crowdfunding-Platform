const {
  createOrUpdateCampaign,
  getCampaignWithBlockchainState,
  listCampaigns,
  listMilestoneReviews,
  updateCampaignMetadata,
  getCampaignDonorStats,
  getCreatorDashboardSummary
} = require("../services/campaignService");
const User = require("../models/User");

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

async function createCampaign(req, res) {
  const payload = req.validated.body;
  const campaign = await createOrUpdateCampaign({
    ...payload,
    contractAddress: payload.contractAddress.toLowerCase(),
    creatorAddress: payload.creatorAddress.toLowerCase(),
    hospitalAddress: payload.hospitalAddress ? payload.hospitalAddress.toLowerCase() : null,
    clerkUserId: req.clerkUserId || null
  });

  // ── Action history: mark creator as having launched a campaign ──
  // This is fire-and-forget — never fail the campaign creation response over this.
  const creatorWallet = payload.creatorAddress.toLowerCase();
  const clerkUserId   = req.clerkUserId || null;
  setImmediate(async () => {
    try {
      const query = clerkUserId
        ? { $or: [{ clerkUserId }, { walletAddress: creatorWallet }, { walletAddresses: creatorWallet }] }
        : { $or: [{ walletAddress: creatorWallet }, { walletAddresses: creatorWallet }] };

      await User.findOneAndUpdate(
        query,
        {
          $set:    { "actionHistory.createdCampaign": true },
          $addToSet: { walletAddresses: creatorWallet }
        }
      );
    } catch (err) {
      console.warn("[campaignController] Failed to update creator actionHistory:", err.message);
    }
  });

  res.status(201).json({ success: true, campaign });
}


async function getCampaignByAddress(req, res) {
  const { address } = req.validated.params;
  const normalizedAddress = address.toLowerCase();
  const result = await getCampaignWithBlockchainState(normalizedAddress);

  if (!result) {
    return res.status(404).json({ success: false, message: "Campaign not found" });
  }

  res.json({
    success: true,
    campaign: result.campaign,
    blockchainState: result.blockchainState
  });
}

async function listCampaignsHandler(req, res) {
  const query = req.validated.query;
  const result = await listCampaigns({
    page: query.page,
    limit: query.limit,
    category: query.category,
    creatorAddress: query.creator ? query.creator.toLowerCase() : undefined,
    search: query.search
  });

  res.json({ success: true, ...result });
}

async function listMilestoneReviewsHandler(req, res) {
  const query = req.validated.query;
  const result = await listMilestoneReviews({
    page: query.page,
    limit: query.limit,
    search: query.search
  });

  res.json({ success: true, ...result });
}

async function patchCampaign(req, res) {
  const { address } = req.validated.params;
  const updates = req.validated.body;
  const campaign = await updateCampaignMetadata(address.toLowerCase(), updates);

  if (!campaign) {
    return res.status(404).json({ success: false, message: "Campaign not found" });
  }

  res.json({ success: true, campaign });
}

/**
 * GET /api/campaigns/:address/stats
 * Returns campaign-scoped donation stats (donor count, total raised, recent donations).
 */
async function getCampaignStats(req, res) {
  const { address } = req.validated.params;
  const result = await getCampaignDonorStats(address.toLowerCase());
  res.json({ success: true, ...result });
}

/**
 * GET /api/campaigns/:address/donors
 * Returns paginated donor list for a specific campaign.
 */
async function getCampaignDonors(req, res) {
  const Donation = require("../models/Donation");
  const { address } = req.validated.params;
  const { page, limit } = req.validated.query;

  const normalizedAddress = address.toLowerCase();
  const skip = (page - 1) * limit;

  const donations = await Donation.find(
    { campaignAddress: normalizedAddress, status: "confirmed" },
    { walletAddress: 1, amount: 1, amountWei: 1, createdAt: 1 }
  ).lean();

  const donorMap = new Map();
  for (const donation of donations) {
    const wallet = String(donation.walletAddress || "").toLowerCase();
    if (!wallet) {
      continue;
    }

    const current = donorMap.get(wallet) || {
      walletAddress: wallet,
      totalAmountWei: 0n,
      donationCount: 0,
      lastDonation: null,
      firstDonation: null
    };

    try {
      current.totalAmountWei += BigInt(donation.amountWei || "0");
    } catch {
      console.warn("[campaignController] Ignoring invalid amountWei:", donation.amountWei);
    }
    current.donationCount += 1;

    const createdAt = donation.createdAt ? new Date(donation.createdAt) : null;
    if (createdAt && (!current.lastDonation || createdAt > current.lastDonation)) {
      current.lastDonation = createdAt;
    }
    if (createdAt && (!current.firstDonation || createdAt < current.firstDonation)) {
      current.firstDonation = createdAt;
    }

    donorMap.set(wallet, current);
  }

  const allItems = [...donorMap.values()].sort((a, b) => {
    if (a.totalAmountWei === b.totalAmountWei) {
      return 0;
    }
    return a.totalAmountWei > b.totalAmountWei ? -1 : 1;
  });

  const items = allItems.slice(skip, skip + limit).map((item) => ({
    walletAddress: item.walletAddress,
    totalAmount: weiToPolDisplay(item.totalAmountWei.toString()),
    totalAmountWei: item.totalAmountWei.toString(),
    donationCount: item.donationCount,
    lastDonation: item.lastDonation,
    firstDonation: item.firstDonation
  }));

  return res.json({
    success: true,
    items,
    pagination: {
      page,
      limit,
      total: allItems.length,
      totalPages: Math.ceil(allItems.length / limit) || 1
    }
  });
}

/**
 * GET /api/campaigns/creator/:creatorAddress/dashboard
 * Returns aggregated creator statistics and enriched campaigns list.
 */
async function getCreatorDashboard(req, res) {
  const { creatorAddress } = req.validated.params;
  const result = await getCreatorDashboardSummary(creatorAddress.toLowerCase());
  res.json({ success: true, ...result });
}

module.exports = {
  createCampaign,
  getCampaignByAddress,
  listCampaignsHandler,
  listMilestoneReviewsHandler,
  patchCampaign,
  getCampaignStats,
  getCampaignDonors,
  getCreatorDashboard
};
