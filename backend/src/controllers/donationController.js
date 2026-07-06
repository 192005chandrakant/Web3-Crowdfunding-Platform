const Donation = require("../models/Donation");
const Campaign = require("../models/Campaign");

async function recordDonation(req, res) {
  const payload = req.validated.body;

  const existing = await Donation.findOne({ txHash: payload.txHash.toLowerCase() }).lean();
  if (existing) {
    return res.status(409).json({
      success: false,
      message: "Donation with this transaction hash already recorded"
    });
  }

  const campaign = await Campaign.findOne({
    contractAddress: payload.campaignAddress.toLowerCase()
  }).lean();

  if (!campaign) {
    return res.status(404).json({
      success: false,
      message: "Campaign not found for the given contract address"
    });
  }

  const donation = await Donation.create({
    walletAddress: payload.walletAddress.toLowerCase(),
    campaignAddress: payload.campaignAddress.toLowerCase(),
    amount: payload.amount,
    amountWei: payload.amountWei,
    txHash: payload.txHash.toLowerCase(),
    chainId: payload.chainId,
    blockNumber: payload.blockNumber || null,
    status: payload.status || "confirmed"
  });

  res.status(201).json({ success: true, donation: donation.toObject() });
}

async function listDonationsByWallet(req, res) {
  const { walletAddress } = req.validated.params;
  const { page, limit } = req.validated.query;

  const filter = { walletAddress: walletAddress.toLowerCase() };
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
  const normalizedWallet = walletAddress.toLowerCase();

  const [stats] = await Donation.aggregate([
    { $match: { walletAddress: normalizedWallet, status: "confirmed" } },
    {
      $group: {
        _id: "$walletAddress",
        totalDonations: { $sum: 1 },
        uniqueCampaigns: { $addToSet: "$campaignAddress" },
        totalAmountWei: { $sum: { $toLong: "$amountWei" } }
      }
    },
    {
      $project: {
        _id: 0,
        totalDonations: 1,
        uniqueCampaignCount: { $size: "$uniqueCampaigns" },
        totalAmountWei: { $toString: "$totalAmountWei" }
      }
    }
  ]);

  res.json({
    success: true,
    stats: stats || {
      totalDonations: 0,
      uniqueCampaignCount: 0,
      totalAmountWei: "0"
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

module.exports = {
  recordDonation,
  listDonationsByWallet,
  listDonationsByCampaign,
  getDonationStats
};
