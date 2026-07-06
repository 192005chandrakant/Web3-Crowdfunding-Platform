const User = require("../models/User");
const Campaign = require("../models/Campaign");
const Donation = require("../models/Donation");
const BlockchainEvent = require("../models/BlockchainEvent");
const Notification = require("../models/Notification");
const mongoose = require("mongoose");

// ───────────── User Management ─────────────

async function listAllUsers(req, res) {
  const { page, limit, role, search } = req.validated.query;

  const filter = {};
  if (role) {
    filter.role = role;
  }
  if (search) {
    filter.$or = [
      { walletAddress: { $regex: search, $options: "i" } },
      { displayName: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } }
    ];
  }

  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    User.countDocuments(filter)
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

async function updateUserRole(req, res) {
  const { walletAddress } = req.validated.params;
  const { role } = req.validated.body;

  const user = await User.findOneAndUpdate(
    { walletAddress: walletAddress.toLowerCase() },
    { $set: { role } },
    { new: true }
  ).lean();

  if (!user) {
    return res.status(404).json({ success: false, message: "User not found" });
  }

  res.json({ success: true, user });
}

// ───────────── Campaign Management ─────────────

async function flagCampaign(req, res) {
  const { address } = req.validated.params;
  const { flagged, flagReason } = req.validated.body;

  const campaign = await Campaign.findOneAndUpdate(
    { contractAddress: address.toLowerCase() },
    {
      $set: {
        flagged: flagged,
        flagReason: flagged ? flagReason || "Flagged by admin" : null
      }
    },
    { new: true }
  ).lean();

  if (!campaign) {
    return res.status(404).json({ success: false, message: "Campaign not found" });
  }

  // Notify campaign creator about the flag action
  if (flagged) {
    await Notification.create({
      walletAddress: campaign.creatorAddress,
      type: "campaign_update",
      title: "Campaign flagged by admin",
      message: `Your campaign "${campaign.title}" has been flagged: ${flagReason || "No reason provided"}.`,
      metadata: {
        contractAddress: address.toLowerCase(),
        flagReason,
        action: "flagged"
      }
    });
  }

  res.json({ success: true, campaign });
}

async function listFlaggedCampaigns(req, res) {
  const { page, limit } = req.validated.query;
  const skip = (page - 1) * limit;

  const filter = { flagged: true };

  const [items, total] = await Promise.all([
    Campaign.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(limit).lean(),
    Campaign.countDocuments(filter)
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

async function updateCampaignStatus(req, res) {
  const { address } = req.validated.params;
  const { status } = req.validated.body;

  const campaign = await Campaign.findOneAndUpdate(
    { contractAddress: address.toLowerCase() },
    { $set: { status } },
    { new: true }
  ).lean();

  if (!campaign) {
    return res.status(404).json({ success: false, message: "Campaign not found" });
  }

  // Notify creator
  await Notification.create({
    walletAddress: campaign.creatorAddress,
    type: "campaign_update",
    title: `Campaign status changed to "${status}"`,
    message: `Your campaign "${campaign.title}" has been ${status} by platform admin.`,
    metadata: {
      contractAddress: address.toLowerCase(),
      newStatus: status,
      action: "status_change"
    }
  });

  res.json({ success: true, campaign });
}

// ───────────── Platform Health & Stats ─────────────

async function getPlatformHealth(req, res) {
  const dbStatus = mongoose.connection.readyState;
  const dbStatusLabels = {
    0: "disconnected",
    1: "connected",
    2: "connecting",
    3: "disconnecting"
  };

  const [
    totalCampaigns,
    activeCampaigns,
    flaggedCampaigns,
    totalUsers,
    totalDonations,
    totalEvents,
    unprocessedEvents,
    totalNotifications
  ] = await Promise.all([
    Campaign.countDocuments(),
    Campaign.countDocuments({ status: "active" }),
    Campaign.countDocuments({ flagged: true }),
    User.countDocuments(),
    Donation.countDocuments(),
    BlockchainEvent.countDocuments(),
    BlockchainEvent.countDocuments({ processedAt: null }),
    Notification.countDocuments()
  ]);

  res.json({
    success: true,
    health: {
      database: {
        status: dbStatusLabels[dbStatus] || "unknown",
        readyState: dbStatus
      },
      counts: {
        campaigns: {
          total: totalCampaigns,
          active: activeCampaigns,
          flagged: flaggedCampaigns
        },
        users: totalUsers,
        donations: totalDonations,
        blockchainEvents: {
          total: totalEvents,
          unprocessed: unprocessedEvents
        },
        notifications: totalNotifications
      },
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      nodeVersion: process.version
    }
  });
}

async function getPlatformStats(req, res) {
  const [campaignStats, donationStats, userStats] = await Promise.all([
    Campaign.aggregate([
      {
        $group: {
          _id: null,
          totalCampaigns: { $sum: 1 },
          activeCampaigns: {
            $sum: { $cond: [{ $eq: ["$status", "active"] }, 1, 0] }
          },
          totalGoalAmount: { $sum: "$targetGoal" },
          avgGoal: { $avg: "$targetGoal" },
          categoryBreakdown: { $push: "$category" }
        }
      }
    ]),
    Donation.aggregate([
      { $match: { status: "confirmed" } },
      {
        $group: {
          _id: null,
          totalDonations: { $sum: 1 },
          uniqueDonors: { $addToSet: "$walletAddress" },
          uniqueCampaigns: { $addToSet: "$campaignAddress" }
        }
      },
      {
        $project: {
          _id: 0,
          totalDonations: 1,
          uniqueDonorCount: { $size: "$uniqueDonors" },
          uniqueCampaignCount: { $size: "$uniqueCampaigns" }
        }
      }
    ]),
    User.aggregate([
      {
        $group: {
          _id: "$role",
          count: { $sum: 1 }
        }
      }
    ])
  ]);

  const campaignData = campaignStats[0] || {
    totalCampaigns: 0,
    activeCampaigns: 0,
    totalGoalAmount: 0,
    avgGoal: 0,
    categoryBreakdown: []
  };

  // Count category occurrences
  const categoryCounts = {};
  for (const cat of campaignData.categoryBreakdown || []) {
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
  }

  const donationData = donationStats[0] || {
    totalDonations: 0,
    uniqueDonorCount: 0,
    uniqueCampaignCount: 0
  };

  const userRoles = {};
  for (const entry of userStats) {
    userRoles[entry._id] = entry.count;
  }

  res.json({
    success: true,
    stats: {
      campaigns: {
        total: campaignData.totalCampaigns,
        active: campaignData.activeCampaigns,
        totalGoalAmount: campaignData.totalGoalAmount,
        avgGoal: Math.round((campaignData.avgGoal || 0) * 100) / 100,
        categories: categoryCounts
      },
      donations: donationData,
      users: {
        total: Object.values(userRoles).reduce((a, b) => a + b, 0),
        byRole: userRoles
      }
    }
  });
}

module.exports = {
  listAllUsers,
  updateUserRole,
  flagCampaign,
  listFlaggedCampaigns,
  updateCampaignStatus,
  getPlatformHealth,
  getPlatformStats
};
