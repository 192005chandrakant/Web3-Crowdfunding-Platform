const User = require("../models/User");
const Campaign = require("../models/Campaign");
const Donation = require("../models/Donation");
const BlockchainEvent = require("../models/BlockchainEvent");
const Notification = require("../models/Notification");
const AdminAuditLog = require("../models/AdminAuditLog");
const mongoose = require("mongoose");
const { serviceManager } = require("../services/serviceManager");

function truncateWallet(value) {
  if (!value || typeof value !== "string") return "Unknown wallet";
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

function getServiceHealth(isConfigured, healthyMessage, missingMessage, missingStatus = "degraded") {
  return {
    status: isConfigured ? "ok" : missingStatus,
    message: isConfigured ? healthyMessage : missingMessage
  };
}

function userWalletFilter(walletAddress) {
  const wallet = walletAddress.toLowerCase();
  return { $or: [{ walletAddress: wallet }, { walletAddresses: wallet }] };
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

function weiToPolNumber(amountWei) {
  return Number.parseFloat(weiToPolDisplay(amountWei));
}



async function recordAdminAuditLog(entry) {
  try {
    await AdminAuditLog.create({
      actorWalletAddress: entry.actorWalletAddress.toLowerCase(),
      action: entry.action,
      resourceType: entry.resourceType,
      resourceId: entry.resourceId,
      targetWalletAddress: entry.targetWalletAddress ? entry.targetWalletAddress.toLowerCase() : null,
      outcome: entry.outcome || "success",
      beforeState: entry.beforeState || {},
      afterState: entry.afterState || {},
      metadata: entry.metadata || {}
    });
  } catch (error) {
    console.error("[admin audit] failed to persist audit log:", error.message);
  }
}

// ───────────── User Management ─────────────

async function listAllUsers(req, res) {
  const { page, limit, role, accountStatus, search } = req.validated.query;

  const filter = {};
  if (role) {
    filter.role = role;
  }
  if (accountStatus) {
    filter.accountStatus = accountStatus;
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

  const beforeUser = await User.findOne(userWalletFilter(walletAddress)).lean();

  const user = await User.findOneAndUpdate(
    userWalletFilter(walletAddress),
    {
      $set: {
        role,
        requestedRole: role,
        accountStatus: "active",
        reviewedBy: req.walletAddress ? req.walletAddress.toLowerCase() : null,
        reviewedAt: new Date(),
        reviewNotes: ""
      }
    },
    { new: true }
  ).lean();

  if (!user) {
    return res.status(404).json({ success: false, message: "User not found" });
  }

  await recordAdminAuditLog({
    actorWalletAddress: req.walletAddress,
    action: "user_role_updated",
    resourceType: "user",
    resourceId: walletAddress.toLowerCase(),
    targetWalletAddress: walletAddress,
    beforeState: { role: beforeUser?.role || null },
    afterState: { role: user.role },
    metadata: { changedField: "role" }
  });

  res.json({ success: true, user });
}

async function reviewUserAccount(req, res) {
  const { walletAddress } = req.validated.params;
  const { decision, role, reviewNotes } = req.validated.body;

  const beforeUser = await User.findOne(userWalletFilter(walletAddress)).lean();

  if (!beforeUser) {
    return res.status(404).json({ success: false, message: "User not found" });
  }

  const approvedRole = role || beforeUser.requestedRole || beforeUser.role || "donor";
  const nextStatus = decision === "approve" ? "active" : "rejected";
  const nextRole = decision === "approve" ? approvedRole : beforeUser.role;

  const user = await User.findOneAndUpdate(
    userWalletFilter(walletAddress),
    {
      $set: {
        role: nextRole,
        requestedRole: approvedRole,
        accountStatus: nextStatus,
        reviewedBy: req.walletAddress ? req.walletAddress.toLowerCase() : null,
        reviewedAt: new Date(),
        reviewNotes: reviewNotes || ""
      }
    },
    { new: true }
  ).lean();

  if (!user) {
    return res.status(404).json({ success: false, message: "User not found" });
  }

  if (decision === "approve") {
    await Notification.create({
      walletAddress: user.walletAddress,
      type: "verification",
      title: "Account approved",
      message: `Your ${approvedRole} account has been approved and is now active.`,
      metadata: { role: approvedRole, accountStatus: nextStatus }
    });
  } else {
    await Notification.create({
      walletAddress: user.walletAddress,
      type: "verification",
      title: "Account review outcome",
      message: `Your requested account was reviewed and marked as rejected.${reviewNotes ? ` Notes: ${reviewNotes}` : ""}`,
      metadata: { role: approvedRole, accountStatus: nextStatus, reviewNotes }
    });
  }

  await recordAdminAuditLog({
    actorWalletAddress: req.walletAddress,
    action: decision === "approve" ? "user_role_updated" : "user_verification_updated",
    resourceType: "user",
    resourceId: walletAddress.toLowerCase(),
    targetWalletAddress: walletAddress,
    beforeState: {
      role: beforeUser.role,
      requestedRole: beforeUser.requestedRole || null,
      accountStatus: beforeUser.accountStatus || null
    },
    afterState: {
      role: user.role,
      requestedRole: user.requestedRole || null,
      accountStatus: user.accountStatus
    },
    metadata: { decision, reviewNotes, approvedRole }
  });

  res.json({ success: true, user });
}

async function updateUserVerification(req, res) {
  const { walletAddress } = req.validated.params;
  const { verificationStatus } = req.validated.body;

  const beforeUser = await User.findOne(userWalletFilter(walletAddress)).lean();

  const user = await User.findOneAndUpdate(
    userWalletFilter(walletAddress),
    { $set: { verificationStatus } },
    { new: true }
  ).lean();

  if (!user) {
    return res.status(404).json({ success: false, message: "User not found" });
  }

  // Notify user
  await Notification.create({
    walletAddress: user.walletAddress,
    type: "user_update",
    title: "Verification Status Updated",
    message: `Your account verification status is now: ${verificationStatus}.`,
  });

  await recordAdminAuditLog({
    actorWalletAddress: req.walletAddress,
    action: "user_verification_updated",
    resourceType: "user",
    resourceId: walletAddress.toLowerCase(),
    targetWalletAddress: walletAddress,
    beforeState: { verificationStatus: beforeUser?.verificationStatus || null },
    afterState: { verificationStatus: user.verificationStatus },
    metadata: { changedField: "verificationStatus" }
  });

  res.json({ success: true, user });
}

// ───────────── Campaign Management ─────────────

async function flagCampaign(req, res) {
  const { address } = req.validated.params;
  const { flagged, flagReason } = req.validated.body;

  const beforeCampaign = await Campaign.findOne({ contractAddress: address.toLowerCase() }).lean();

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

  await recordAdminAuditLog({
    actorWalletAddress: req.walletAddress,
    action: flagged ? "campaign_flagged" : "campaign_unflagged",
    resourceType: "campaign",
    resourceId: address.toLowerCase(),
    targetWalletAddress: campaign.creatorAddress,
    beforeState: {
      flagged: beforeCampaign?.flagged || false,
      flagReason: beforeCampaign?.flagReason || null
    },
    afterState: {
      flagged,
      flagReason: flagged ? flagReason || "Flagged by admin" : null
    },
    metadata: { campaignTitle: campaign.title }
  });

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

  const beforeCampaign = await Campaign.findOne({ contractAddress: address.toLowerCase() }).lean();

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

  await recordAdminAuditLog({
    actorWalletAddress: req.walletAddress,
    action: "campaign_status_updated",
    resourceType: "campaign",
    resourceId: address.toLowerCase(),
    targetWalletAddress: campaign.creatorAddress,
    beforeState: { status: beforeCampaign?.status || null },
    afterState: { status: campaign.status },
    metadata: { campaignTitle: campaign.title }
  });

  res.json({ success: true, campaign });
}

// ───────────── Platform Health & Stats ─────────────

async function getPlatformHealth(req, res) {
  const startedAt = Date.now();
  const dbStatus = mongoose.connection.readyState;
  const diagnostics = serviceManager.getDiagnostics();
  const mongoStatus = dbStatus === 1 ? "ok" : dbStatus === 2 ? "degraded" : "down";
  const redisConfigured = Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
  const pinataConfigured = Boolean(process.env.PINATA_JWT || process.env.PINATA_API_KEY);
  const cloudinaryConfigured = Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );
  const resendConfigured = Boolean(process.env.RESEND_API_KEY);

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
      mongodb: {
        status: mongoStatus,
        message: dbStatus === 1 ? "MongoDB connected" : "MongoDB is not connected"
      },
      redis: {
        status: redisConfigured ? "ok" : "degraded",
        message: redisConfigured ? "Redis configured" : "Redis credentials are not configured"
      },
      pinata: getServiceHealth(pinataConfigured, "Pinata configured", "Pinata credentials are not configured"),
      cloudinary: getServiceHealth(cloudinaryConfigured, "Cloudinary configured", "Cloudinary credentials are not configured"),
      resend: getServiceHealth(resendConfigured, "Resend configured", "Resend credentials are not configured"),
      blockchainRpc: getServiceHealth(
        diagnostics.services.blockchainRpc,
        "Blockchain RPC provider initialized",
        "Blockchain RPC provider is not initialized"
      ),
      notificationEngine: getServiceHealth(
        diagnostics.services.notificationEngine,
        "Notification observer engine active",
        "Notification observer engine is not initialized"
      ),
      overall: [mongoStatus, redisConfigured ? "ok" : "degraded", pinataConfigured ? "ok" : "degraded", cloudinaryConfigured ? "ok" : "degraded", resendConfigured ? "ok" : "degraded", diagnostics.services.blockchainRpc ? "ok" : "degraded"].includes("down")
        ? "down"
        : [mongoStatus, redisConfigured ? "ok" : "degraded", pinataConfigured ? "ok" : "degraded", cloudinaryConfigured ? "ok" : "degraded", resendConfigured ? "ok" : "degraded", diagnostics.services.blockchainRpc ? "ok" : "degraded"].includes("degraded")
          ? "degraded"
          : "ok",
      database: {
        status: mongoStatus,
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
      nodeVersion: process.version,
      responseTimeMs: Date.now() - startedAt,
      checkedAt: new Date().toISOString()
    }
  });
}
async function getPlatformStats(req, res) {
  const [campaignStats, donationStats, userStats, reviewStats] = await Promise.all([
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
    Donation.find(
      { status: "confirmed" },
      { walletAddress: 1, campaignAddress: 1, amountWei: 1 }
    ).lean(),
    User.aggregate([
      {
        $group: {
          _id: "$role",
          count: { $sum: 1 }
        }
      }
    ]),
    User.aggregate([
      {
        $group: {
          _id: "$accountStatus",
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

  let donationTotalWei = 0n;
  const uniqueDonors = new Set();
  const uniqueCampaigns = new Set();
  for (const donation of donationStats) {
    if (donation.walletAddress) {
      uniqueDonors.add(donation.walletAddress.toLowerCase());
    }
    if (donation.campaignAddress) {
      uniqueCampaigns.add(donation.campaignAddress.toLowerCase());
    }
    try {
      donationTotalWei += BigInt(donation.amountWei || "0");
    } catch {
      console.warn("[adminController] Ignoring invalid platform stats amountWei:", donation.amountWei);
    }
  }

  const donationData = {
    totalDonations: donationStats.length,
    totalAmount: weiToPolNumber(donationTotalWei.toString()),
    uniqueDonorCount: uniqueDonors.size,
    uniqueCampaignCount: uniqueCampaigns.size
  };

  const userRoles = {};
  for (const entry of userStats) {
    userRoles[entry._id || "unknown"] = entry.count;
  }

  const userStatuses = {};
  for (const entry of reviewStats) {
    userStatuses[entry._id || "unknown"] = entry.count;
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
      donations: {
        ...donationData,
        totalAmount: Math.round((donationData.totalAmount || 0) * 10000) / 10000
      },
      users: {
        total: Object.values(userRoles).reduce((a, b) => a + b, 0),
        byRole: userRoles,
        byStatus: userStatuses,
        pendingReview: userStatuses.pending_review || 0
      }
    }
  });
}

async function getRecentActivity(req, res) {
  const [recentDonations, recentCampaigns, recentUsers, recentAuditLogs] = await Promise.all([
    Donation.find().sort({ createdAt: -1 }).limit(5).lean(),
    Campaign.find().sort({ createdAt: -1 }).limit(5).lean(),
    User.find().sort({ createdAt: -1 }).limit(5).lean(),
    AdminAuditLog.find().sort({ createdAt: -1 }).limit(5).lean()
  ]);

  const campaignAddresses = [
    ...new Set(recentDonations.map((donation) => donation.campaignAddress?.toLowerCase()).filter(Boolean))
  ];
  const donationCampaigns = campaignAddresses.length > 0
    ? await Campaign.find(
        { contractAddress: { $in: campaignAddresses } },
        { contractAddress: 1, title: 1 }
      ).lean()
    : [];
  const campaignTitleByAddress = new Map(
    donationCampaigns.map((campaign) => [campaign.contractAddress.toLowerCase(), campaign.title])
  );

  const activities = [];

  for (const d of recentDonations) {
    activities.push({
      id: d._id.toString(),
      type: "donation",
      title: "New Donation",
      message: `${truncateWallet(d.walletAddress)} donated ${d.amount} POL to ${campaignTitleByAddress.get(d.campaignAddress?.toLowerCase()) || "campaign"}`,
      timestamp: d.createdAt,
      link: `/campaign/${d.campaignAddress}`
    });
  }

  for (const c of recentCampaigns) {
    activities.push({
      id: c.contractAddress,
      type: c.flagged ? "campaign_flagged" : "campaign_created",
      title: c.flagged ? "Campaign Flagged" : "New Campaign",
      message: `"${c.title}" by ${truncateWallet(c.creatorAddress)}`,
      timestamp: c.updatedAt || c.createdAt,
      link: `/campaign/${c.contractAddress}`
    });
  }

  for (const u of recentUsers) {
    activities.push({
      id: u.walletAddress,
      type: "user_registered",
      title: "New User Registration",
      message: `${u.displayName || truncateWallet(u.walletAddress)} joined as ${u.requestedRole || u.role || "donor"}.`,
      timestamp: u.createdAt,
      link: `/admin/users`
    });
  }

  for (const log of recentAuditLogs) {
    activities.push({
      id: log._id.toString(),
      type: "admin_action",
      title: "Admin Action",
      message: `${log.action.replace(/_/g, " ")} on ${log.resourceType}`,
      timestamp: log.createdAt,
      link: log.resourceType === "campaign" ? `/campaign/${log.resourceId}` : "/admin/audit-log"
    });
  }

  activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  
  res.json({
    success: true,
    activities: activities.slice(0, 10)
  });
}

async function listAuditLogs(req, res) {
  const { page, limit, action, resourceType, search } = req.validated.query;
  const filter = {};

  if (action) {
    filter.action = action;
  }

  if (resourceType) {
    filter.resourceType = resourceType;
  }

  if (search) {
    filter.$or = [
      { actorWalletAddress: { $regex: search, $options: "i" } },
      { targetWalletAddress: { $regex: search, $options: "i" } },
      { resourceId: { $regex: search, $options: "i" } },
      { action: { $regex: search, $options: "i" } }
    ];
  }

  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    AdminAuditLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    AdminAuditLog.countDocuments(filter)
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

async function getLedger(req, res) {
  const { page, limit, search, status } = req.validated.query;
  const skip = (page - 1) * limit;

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

  const [items, total, confirmedDonations] = await Promise.all([
    Donation.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Donation.countDocuments(filter),
    Donation.find(
      { status: "confirmed" },
      { walletAddress: 1, campaignAddress: 1, amountWei: 1 }
    ).lean()
  ]);

  let totalAmountWei = 0n;
  const uniqueWallets = new Set();
  const uniqueCampaigns = new Set();
  for (const donation of confirmedDonations) {
    if (donation.walletAddress) {
      uniqueWallets.add(donation.walletAddress.toLowerCase());
    }
    if (donation.campaignAddress) {
      uniqueCampaigns.add(donation.campaignAddress.toLowerCase());
    }
    try {
      totalAmountWei += BigInt(donation.amountWei || "0");
    } catch {
      console.warn("[adminController] Ignoring invalid ledger summary amountWei:", donation.amountWei);
    }
  }

  const summary = {
    totalDonations: confirmedDonations.length,
    uniqueDonorCount: uniqueWallets.size,
    uniqueCampaignCount: uniqueCampaigns.size,
    totalAmountWei: totalAmountWei.toString()
  };

  const campaignAddresses = [...new Set(items.map((donation) => donation.campaignAddress.toLowerCase()))];
  const campaigns = campaignAddresses.length > 0
    ? await Campaign.find(
        { contractAddress: { $in: campaignAddresses } },
        { contractAddress: 1, title: 1, coverImageUrl: 1, category: 1 }
      ).lean()
    : [];

  const campaignMap = new Map(campaigns.map((campaign) => [campaign.contractAddress.toLowerCase(), campaign]));
  const ledgerItems = items.map((donation) => ({
    ...donation,
    campaign: campaignMap.get(donation.campaignAddress.toLowerCase()) || null
  }));

  res.json({
    success: true,
    items: ledgerItems,
    summary,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1
    }
  });
}

// ───────────── Analytics Endpoints ─────────────

async function getDonationsOverTime(req, res) {
  const days = parseInt(req.query.days, 10) || 30;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const donations = await Donation.find(
    { status: "confirmed", createdAt: { $gte: startDate } },
    { amountWei: 1, createdAt: 1 }
  ).lean();

  const buckets = new Map();
  for (const donation of donations) {
    const date = donation.createdAt.toISOString().slice(0, 10);
    const current = buckets.get(date) || { date, count: 0, totalAmountWei: 0n };
    current.count += 1;
    try {
      current.totalAmountWei += BigInt(donation.amountWei || "0");
    } catch {
      console.warn("[adminController] Ignoring invalid donations-over-time amountWei:", donation.amountWei);
    }
    buckets.set(date, current);
  }

  const data = [...buckets.values()]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((bucket) => ({
      date: bucket.date,
      count: bucket.count,
      totalAmount: weiToPolNumber(bucket.totalAmountWei.toString())
    }));

  res.json({ success: true, data });
}

async function getUserGrowth(req, res) {
  const days = parseInt(req.query.days, 10) || 30;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const pipeline = [
    { $match: { createdAt: { $gte: startDate } } },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
        count: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } },
    {
      $project: {
        _id: 0,
        date: "$_id",
        count: 1
      }
    }
  ];

  const result = await User.aggregate(pipeline);
  res.json({ success: true, data: result });
}

async function getCampaignCategoryBreakdown(req, res) {
  const pipeline = [
    {
      $group: {
        _id: "$category",
        count: { $sum: 1 },
        totalGoal: { $sum: "$targetGoal" }
      }
    },
    { $sort: { count: -1 } },
    {
      $project: {
        _id: 0,
        category: { $ifNull: ["$_id", "general"] },
        count: 1,
        totalGoal: 1
      }
    }
  ];

  const result = await Campaign.aggregate(pipeline);
  res.json({ success: true, data: result });
}

async function getRoleDistribution(req, res) {
  const pipeline = [
    {
      $group: {
        _id: "$role",
        count: { $sum: 1 }
      }
    },
    { $sort: { count: -1 } },
    {
      $project: {
        _id: 0,
        role: { $ifNull: ["$_id", "donor"] },
        count: 1
      }
    }
  ];

  const result = await User.aggregate(pipeline);
  res.json({ success: true, data: result });
}

module.exports = {
  listAllUsers,
  updateUserRole,
  reviewUserAccount,
  updateUserVerification,
  flagCampaign,
  listFlaggedCampaigns,
  updateCampaignStatus,
  getPlatformHealth,
  getPlatformStats,
  getRecentActivity,
  listAuditLogs,
  getLedger,
  getDonationsOverTime,
  getUserGrowth,
  getCampaignCategoryBreakdown,
  getRoleDistribution
};
