const Donation = require("../models/Donation");
const Campaign = require("../models/Campaign");
const User = require("../models/User");
const BlockchainEvent = require("../models/BlockchainEvent");
const {
  computeQVPower,
  qvPowerToDisplay,
  isEligibleToVote,
  getDonorTotalWei
} = require("../services/quadraticVotingService");
const { invalidateCampaignCache } = require("../services/cacheService");

async function resolveWalletScope(walletAddress) {
  const wallet = walletAddress.toLowerCase();
  const user = await User.findOne({
    $or: [{ walletAddress: wallet }, { walletAddresses: wallet }]
  }).lean();

  if (!user) {
    return { wallets: [wallet], user: null };
  }

  const wallets = [
    user.walletAddress,
    ...(user.walletAddresses || [])
  ]
    .filter(Boolean)
    .map((value) => value.toLowerCase());

  return { wallets: [...new Set(wallets.length ? wallets : [wallet])], user };
}

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

function signedWeiToPolDisplay(amountWei) {
  const wei = BigInt(amountWei || "0");
  if (wei < 0n) {
    return `-${weiToPolDisplay((-wei).toString())}`;
  }
  return weiToPolDisplay(wei.toString());
}

function safeWei(amountWei) {
  try {
    return BigInt(amountWei || "0");
  } catch {
    console.warn("[donationController] Ignoring invalid wallet activity amountWei:", amountWei);
    return 0n;
  }
}

function weiToPolNumber(amountWei) {
  return Number.parseFloat(weiToPolDisplay(amountWei));
}

async function recordDonation(req, res) {
  const payload = req.validated.body;
  const donorWallet = payload.walletAddress.toLowerCase();
  const campaignAddress = payload.campaignAddress.toLowerCase();

  const existing = await Donation.findOne({ txHash: payload.txHash.toLowerCase() }).lean();
  if (existing) {
    return res.status(409).json({
      success: false,
      message: "Donation with this transaction hash already recorded"
    });
  }

  const campaign = await Campaign.findOne({
    contractAddress: campaignAddress
  }).lean();

  if (!campaign) {
    return res.status(404).json({
      success: false,
      message: "Campaign not found for the given contract address"
    });
  }

  const priorTotalWei = await getDonorTotalWei(donorWallet, campaignAddress);
  const totalWeiAfter = (BigInt(priorTotalWei) + BigInt(payload.amountWei || "0")).toString();
  const qvPower = computeQVPower(totalWeiAfter);
  const qvPowerDisplay = qvPowerToDisplay(qvPower);
  const eligible = isEligibleToVote(totalWeiAfter);

  const donation = await Donation.create({
    walletAddress:   donorWallet,
    campaignAddress,
    amount:          payload.amount,
    amountWei:       payload.amountWei,
    txHash:          payload.txHash.toLowerCase(),
    chainId:         payload.chainId,
    blockNumber:     payload.blockNumber || null,
    status:          payload.status || "confirmed",
    quadraticVotingPower: qvPower,
    qvPowerDisplay,
    isEligibleToVote: eligible
  });

  await invalidateCampaignCache(campaignAddress);

  // ── Action history: mark donor as having donated (fire-and-forget) ──
  const clerkUserId = req.clerkUserId || null;
  setImmediate(async () => {
    try {
      const query = clerkUserId
        ? { $or: [{ clerkUserId }, { walletAddress: donorWallet }, { walletAddresses: donorWallet }] }
        : { $or: [{ walletAddress: donorWallet }, { walletAddresses: donorWallet }] };

      await User.findOneAndUpdate(
        query,
        {
          $set:      { "actionHistory.donated": true },
          $addToSet: { walletAddresses: donorWallet }
        }
      );
    } catch (err) {
      console.warn("[donationController] Failed to update donor actionHistory:", err.message);
    }
  });

  res.status(201).json({ success: true, donation: donation.toObject() });
}


async function listDonationsByWallet(req, res) {
  const { walletAddress } = req.validated.params;
  const { page, limit } = req.validated.query;

  const { wallets } = await resolveWalletScope(walletAddress);
  const filter = { walletAddress: { $in: wallets } };
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    Donation.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Donation.countDocuments(filter)
  ]);

  const enriched = await enrichDonationsWithCampaignTitles(items);

  res.json({
    success: true,
    items: enriched,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1
    }
  });
}

async function listDonationsByCampaign(req, res) {
  const { campaignAddress } = req.validated.params;
  const { page, limit } = req.validated.query;

  const filter = { campaignAddress: campaignAddress.toLowerCase() };
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    Donation.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Donation.countDocuments(filter)
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

async function getDonationStats(req, res) {
  const { walletAddress } = req.validated.params;
  const { wallets } = await resolveWalletScope(walletAddress);

  const donations = await Donation.find(
    { walletAddress: { $in: wallets }, status: "confirmed" },
    { campaignAddress: 1, amountWei: 1 }
  ).lean();

  let totalAmountWei = 0n;
  const uniqueCampaigns = new Set();
  for (const donation of donations) {
    uniqueCampaigns.add(donation.campaignAddress);
    try {
      totalAmountWei += BigInt(donation.amountWei || "0");
    } catch {
      console.warn("[donationController] Ignoring invalid amountWei:", donation.amountWei);
    }
  }

  res.json({
    success: true,
    stats: {
      totalDonations: donations.length,
      uniqueCampaignCount: uniqueCampaigns.size,
      totalAmountWei: totalAmountWei.toString()
    }
  });
}

async function enrichDonationsWithCampaignTitles(donations) {
  if (donations.length === 0) {
    return donations;
  }

  const campaignAddresses = [...new Set(donations.map((d) => d.campaignAddress))];
  const campaigns = await Campaign.find(
    { contractAddress: { $in: campaignAddresses } },
    { contractAddress: 1, title: 1, coverImageUrl: 1, category: 1 }
  ).lean();

  const campaignMap = new Map();
  for (const c of campaigns) {
    campaignMap.set(c.contractAddress, {
      title: c.title,
      coverImageUrl: c.coverImageUrl,
      category: c.category
    });
  }

  return donations.map((d) => ({
    ...d,
    campaign: campaignMap.get(d.campaignAddress) || null
  }));
}

function toLedgerAmountDisplay(amountWei) {
  return weiToPolDisplay(amountWei);
}

function mapDonationToLedgerItem(donation, campaign) {
  return {
    _id: donation._id.toString(),
    type: "donation",
    walletAddress: donation.walletAddress,
    campaignAddress: donation.campaignAddress,
    fromAddress: donation.walletAddress,
    toAddress: donation.campaignAddress,
    amount: donation.amount,
    amountWei: donation.amountWei,
    txHash: donation.txHash,
    chainId: donation.chainId,
    blockNumber: donation.blockNumber,
    status: donation.status,
    createdAt: donation.createdAt,
    campaign: campaign || null
  };
}

function mapEventToLedgerItem(event, campaign) {
  const eventData = event.data || {};
  const isRelease = event.eventName === "TrancheExecuted";
  const amountWei = String(eventData.amount || "0");
  const fromAddress = isRelease
    ? event.contractAddress
    : String(eventData.contributor || "");
  const toAddress = isRelease
    ? String(eventData.recipient || "")
    : String(eventData.contributor || "");

  return {
    _id: event._id.toString(),
    type: isRelease ? "release" : "refund",
    walletAddress: fromAddress.toLowerCase(),
    campaignAddress: event.contractAddress,
    fromAddress: fromAddress.toLowerCase(),
    toAddress: toAddress.toLowerCase(),
    amount: toLedgerAmountDisplay(amountWei),
    amountWei,
    txHash: event.txHash,
    chainId: event.chainId,
    blockNumber: event.blockNumber,
    status: event.processingError ? "failed" : "confirmed",
    createdAt: event.createdAt,
    eventName: event.eventName,
    metadata: eventData,
    campaign: campaign || null
  };
}

function buildLedgerFilter({ search, status }) {
  const filter = {};

  if (status) {
    filter.status = status;
  }

  if (search) {
    filter.$or = [
      { walletAddress: { $regex: search, $options: "i" } },
      { campaignAddress: { $regex: search, $options: "i" } },
      { txHash: { $regex: search, $options: "i" } }
    ];
  }

  return filter;
}

async function getPlatformLedger(req, res) {
  const { page, limit, search, status, type } = req.validated.query;
  const donationFilter = type === "refund" || type === "release"
    ? null
    : buildLedgerFilter({ search, status });
  const eventFilter = {
    eventName: { $in: ["TrancheExecuted", "RefundClaimed"] }
  };

  if (type === "donation") {
    eventFilter.eventName = { $in: [] };
  } else if (type === "refund") {
    eventFilter.eventName = "RefundClaimed";
  } else if (type === "release") {
    eventFilter.eventName = "TrancheExecuted";
  }

  if (search) {
    eventFilter.$or = [
      { contractAddress: { $regex: search, $options: "i" } },
      { txHash: { $regex: search, $options: "i" } },
      { "data.contributor": { $regex: search, $options: "i" } },
      { "data.recipient": { $regex: search, $options: "i" } }
    ];
  }

  if (status === "failed") {
    eventFilter.processingError = { $ne: null };
  } else if (status === "confirmed") {
    eventFilter.processingError = null;
  } else if (status === "pending") {
    eventFilter.processedAt = null;
    eventFilter.processingError = null;
  }

  const [donations, events] = await Promise.all([
    donationFilter
      ? Donation.find(donationFilter).sort({ createdAt: -1 }).lean()
      : Promise.resolve([]),
    BlockchainEvent.find(eventFilter).sort({ createdAt: -1 }).lean()
  ]);

  const campaignAddresses = [
    ...new Set([
      ...donations.map((donation) => donation.campaignAddress?.toLowerCase()).filter(Boolean),
      ...events.map((event) => event.contractAddress?.toLowerCase()).filter(Boolean)
    ])
  ];

  const campaigns = campaignAddresses.length > 0
    ? await Campaign.find(
        { contractAddress: { $in: campaignAddresses } },
        { contractAddress: 1, title: 1, coverImageUrl: 1, category: 1 }
      ).lean()
    : [];

  const campaignMap = new Map(
    campaigns.map((campaign) => [campaign.contractAddress.toLowerCase(), {
      title: campaign.title,
      coverImageUrl: campaign.coverImageUrl,
      category: campaign.category
    }])
  );

  const ledgerItems = [
    ...donations.map((donation) => mapDonationToLedgerItem(
      donation,
      campaignMap.get(donation.campaignAddress.toLowerCase())
    )),
    ...events.map((event) => mapEventToLedgerItem(
      event,
      campaignMap.get(event.contractAddress.toLowerCase())
    ))
  ].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

  const total = ledgerItems.length;
  const start = (page - 1) * limit;
  const pagedItems = ledgerItems.slice(start, start + limit);

  let totalAmountWei = 0n;
  const confirmedDonations = donations.filter((donation) => donation.status === "confirmed");
  const uniqueDonors = new Set();
  const uniqueCampaigns = new Set();

  for (const donation of confirmedDonations) {
    uniqueDonors.add(donation.walletAddress);
    uniqueCampaigns.add(donation.campaignAddress);
    try {
      totalAmountWei += BigInt(donation.amountWei || "0");
    } catch {
      console.warn("[donationController] Ignoring invalid ledger amountWei:", donation.amountWei);
    }
  }

  res.json({
    success: true,
    items: pagedItems,
    summary: {
      totalDonations: confirmedDonations.length,
      uniqueDonorCount: uniqueDonors.size,
      uniqueCampaignCount: uniqueCampaigns.size,
      totalAmountWei: totalAmountWei.toString()
    },
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1
    }
  });
}

/**
 * GET /api/donations/campaign/:campaignAddress/recent
 * Returns the most recent donations for a campaign (lightweight endpoint).
 */
async function listRecentDonationsByCampaign(req, res) {
  const { campaignAddress } = req.validated.params;
  const limit = req.validated?.query?.limit || 10;

  const items = await Donation.find({
    campaignAddress: campaignAddress.toLowerCase(),
    status: "confirmed"
  })
    .sort({ createdAt: -1 })
    .limit(limit)
    .select("walletAddress amount amountWei txHash createdAt")
    .lean();

  res.json({
    success: true,
    items: items.map((item) => ({
      ...item,
      amount: weiToPolDisplay(item.amountWei)
    }))
  });
}

/**
 * GET /api/donations/donor/:walletAddress/portfolio
 * Returns rich donor portfolio metrics, quadratic governance voting power, and active vote gates.
 */
async function getDonorPortfolio(req, res) {
  const { walletAddress } = req.validated.params;
  const { wallets } = await resolveWalletScope(walletAddress);

  const donations = await Donation.find({ walletAddress: { $in: wallets } })
    .sort({ createdAt: -1 })
    .lean();

  if (!donations || donations.length === 0) {
    return res.json({
      success: true,
      portfolioStats: {
        totalContributions: 0,
        vaultsSupported: 0,
        totalContributed: "0.0000",
        totalQuadraticVotingPower: "0.00",
        activeGovernanceGatesCount: 0,
        categoryBreakdown: {}
      },
      donations: []
    });
  }

  const campaignAddresses = [...new Set(donations.map((d) => d.campaignAddress))];
  const campaigns = await Campaign.find({
    contractAddress: { $in: campaignAddresses }
  }).lean();

  const campaignMap = new Map();
  let activeGovernanceGatesCount = 0;
  const countedVoteVaults = new Set();

  for (const c of campaigns) {
    const addr = c.contractAddress.toLowerCase();
    // Check if campaign has an open voting gate (milestone with proof submitted on an active vault)
    const isVotingActive = (c.milestones || []).some(
      (m) => m.proofCid && m.proofCid.trim().length > 0 && c.status === "active"
    );

    if (isVotingActive && !countedVoteVaults.has(addr)) {
      activeGovernanceGatesCount++;
      countedVoteVaults.add(addr);
    }

    campaignMap.set(addr, {
      title: c.title,
      coverImageUrl: c.coverImageUrl,
      category: c.category || "general",
      status: c.status || "active",
      isVotingActive
    });
  }

  let totalContributedAcc = 0;
  let totalQVPowerAcc = 0;
  const vaultsSupportedSet = new Set();
  const categoryTotals = {};

  const enrichedDonations = donations.map((d) => {
    const addr = d.campaignAddress.toLowerCase();
    const camp = campaignMap.get(addr) || {
      title: `Campaign (${addr.slice(0, 8)}…)`,
      coverImageUrl: "",
      category: "general",
      status: "active",
      isVotingActive: false
    };

    const amountWei = String(d.amountWei || "0");
    const amountNum = weiToPolNumber(amountWei);
    const qvPower = Math.sqrt(amountNum);

    if (d.status === "confirmed") {
      totalContributedAcc += amountNum;
      totalQVPowerAcc += qvPower;
      vaultsSupportedSet.add(addr);

      const cat = camp.category;
      categoryTotals[cat] = (categoryTotals[cat] || 0) + amountNum;
    }

    return {
      ...d,
      amount: weiToPolDisplay(amountWei),
      campaign: camp,
      qvPower: qvPower.toFixed(2)
    };
  });

  // Convert category totals to percentage breakdown
  const categoryBreakdown = {};
  for (const [cat, amt] of Object.entries(categoryTotals)) {
    const pct = totalContributedAcc > 0 ? Math.round((amt / totalContributedAcc) * 100) : 0;
    categoryBreakdown[cat] = { amount: amt.toFixed(3), percentage: pct };
  }

  res.json({
    success: true,
    portfolioStats: {
      totalContributions: donations.length,
      vaultsSupported: vaultsSupportedSet.size,
      totalContributed: totalContributedAcc.toFixed(4),
      totalQuadraticVotingPower: totalQVPowerAcc.toFixed(2),
      activeGovernanceGatesCount,
      categoryBreakdown
    },
    donations: enrichedDonations
  });
}

async function getWalletActivity(req, res) {
  const { walletAddress } = req.validated ? req.validated.params : req.params;
  const { wallets, user } = await resolveWalletScope(walletAddress);

  // 1. Fetch contributions made BY this wallet (sent/outflow)
  const sentDonations = await Donation.find({ walletAddress: { $in: wallets } }).lean();

  // 2. Fetch campaigns created BY this wallet
  const creatorFilter = user?.clerkUserId
    ? { $or: [{ creatorAddress: { $in: wallets } }, { clerkUserId: user.clerkUserId }] }
    : { creatorAddress: { $in: wallets } };
  const myCampaigns = await Campaign.find(creatorFilter).lean();
  const myCampaignAddresses = myCampaigns.map((c) => c.contractAddress.toLowerCase());

  // 3. Fetch donations made TO those creator campaigns (received/inflow)
  const receivedDonations =
    myCampaignAddresses.length > 0
      ? await Donation.find({ campaignAddress: { $in: myCampaignAddresses } }).lean()
      : [];

  const allCampaignAddresses = [
    ...new Set([
      ...sentDonations.map((d) => d.campaignAddress.toLowerCase()),
      ...receivedDonations.map((d) => d.campaignAddress.toLowerCase())
    ])
  ];

  const allCampaigns = await Campaign.find(
    { contractAddress: { $in: allCampaignAddresses } },
    { contractAddress: 1, title: 1, coverImageUrl: 1, category: 1, status: 1 }
  ).lean();

  const campaignMap = new Map();
  for (const c of allCampaigns) {
    campaignMap.set(c.contractAddress.toLowerCase(), {
      title: c.title,
      coverImageUrl: c.coverImageUrl,
      category: c.category,
      status: c.status
    });
  }

  let totalSentAmountWei = 0n;
  let totalReceivedAmountWei = 0n;
  let totalSentCount = 0;
  let totalReceivedCount = 0;

  const sentItems = sentDonations.map((d) => {
    const amountWei = String(d.amountWei || "0");
    const wei = safeWei(amountWei);
    if (d.status === "confirmed") {
      totalSentAmountWei += wei;
      totalSentCount++;
    }
    return {
      ...d,
      amount: weiToPolDisplay(wei.toString()),
      amountWei,
      direction: "sent",
      campaign: campaignMap.get(d.campaignAddress.toLowerCase()) || {
        title: `Vault (${d.campaignAddress.slice(0, 8)}…)`
      }
    };
  });

  const receivedItems = receivedDonations.map((d) => {
    const amountWei = String(d.amountWei || "0");
    const wei = safeWei(amountWei);
    if (d.status === "confirmed") {
      totalReceivedAmountWei += wei;
      totalReceivedCount++;
    }
    return {
      ...d,
      amount: weiToPolDisplay(wei.toString()),
      amountWei,
      direction: "received",
      campaign: campaignMap.get(d.campaignAddress.toLowerCase()) || {
        title: `My Campaign (${d.campaignAddress.slice(0, 8)}…)`
      }
    };
  });

  // Combine and sort chronologically descending
  const allItems = [...sentItems, ...receivedItems].sort(
    (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
  );

  res.json({
    success: true,
    stats: {
      totalSentCount,
      totalReceivedCount,
      totalSentAmount: weiToPolDisplay(totalSentAmountWei.toString()),
      totalReceivedAmount: weiToPolDisplay(totalReceivedAmountWei.toString()),
      netVolume: signedWeiToPolDisplay((totalReceivedAmountWei - totalSentAmountWei).toString()),
      myCampaignsCount: myCampaigns.length
    },
    items: allItems
  });
}

module.exports = {
  recordDonation,
  listDonationsByWallet,
  listDonationsByCampaign,
  getDonationStats,
  listRecentDonationsByCampaign,
  getDonorPortfolio,
  getWalletActivity,
  getPlatformLedger
};
