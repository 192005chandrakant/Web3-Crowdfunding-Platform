/**
 * Voting Controller — Quadratic Voting API
 * ──────────────────────────────────────────
 * Provides read-only endpoints for the frontend to:
 *  1. Check if a wallet is eligible to vote (QV threshold + sybil)
 *  2. Get a wallet's vote status on a milestone
 *  3. Get aggregate QV stats for a milestone
 *  4. List individual votes (anonymized) for a milestone
 */

const Vote = require("../models/Vote");
const Donation = require("../models/Donation");
const Campaign = require("../models/Campaign");
const {
  computeQVPower,
  qvPowerToDisplay,
  isEligibleToVote,
  getDonorTotalWei,
  getCampaignDonorTotals,
  getMilestoneQVStats,
  verifySybilResistance,
  MIN_CONTRIBUTION_WEI
} = require("../services/quadraticVotingService");

/**
 * GET /api/voting/eligibility/:campaignAddress/:walletAddress/:milestoneIndex
 *
 * Returns:
 *  - eligible: boolean
 *  - reason: string (why eligible/ineligible)
 *  - qvPower: string (raw QV power)
 *  - qvPowerDisplay: string (e.g., "10.0000")
 *  - donationTotalWei: string
 *  - isSybilSafe: boolean
 *  - verificationLevel: string
 *  - hasVoted: boolean
 *  - minThresholdWei: string (for UI display)
 *  - minThresholdDisplay: string (e.g., "0.0010 POL")
 */
async function getVotingEligibility(req, res) {
  const { campaignAddress, walletAddress, milestoneIndex } = req.params;

  const [donorTotalWei, sybilCheck, existingVote] = await Promise.all([
    getDonorTotalWei(walletAddress, campaignAddress),
    verifySybilResistance(walletAddress),
    Vote.findOne({
      walletAddress: walletAddress.toLowerCase(),
      campaignAddress: campaignAddress.toLowerCase(),
      milestoneIndex: Number(milestoneIndex)
    }).lean()
  ]);

  const qvPower = computeQVPower(donorTotalWei);
  const qvPowerDisplay = qvPowerToDisplay(qvPower);
  const eligible = isEligibleToVote(donorTotalWei) && sybilCheck.safe;

  // Build human-readable reason
  let reason = "";
  if (existingVote) {
    reason = "You have already voted on this milestone.";
  } else if (BigInt(donorTotalWei || "0") === 0n) {
    reason = "You have not donated to this campaign yet.";
  } else if (!isEligibleToVote(donorTotalWei)) {
    const minPOL = (Number(MIN_CONTRIBUTION_WEI) / 1e18).toFixed(3);
    reason = `Your donation of ${(Number(donorTotalWei) / 1e18).toFixed(4)} POL is below the minimum threshold of ${minPOL} POL.`;
  } else if (!sybilCheck.safe) {
    reason = `Sybil check failed: ${sybilCheck.reason}`;
  } else {
    reason = `Eligible! Your voting power: ${qvPowerDisplay} votes (√ of your ${(Number(donorTotalWei) / 1e18).toFixed(4)} POL donation).`;
  }

  // Min threshold display
  const minPOL = (Number(MIN_CONTRIBUTION_WEI) / 1e18).toFixed(4);

  res.json({
    success: true,
    eligible: eligible && !existingVote,
    hasVoted: Boolean(existingVote),
    voteDirection: existingVote ? (existingVote.support ? "approve" : "reject") : null,
    reason,
    qvPower,
    qvPowerDisplay,
    donationTotalWei: donorTotalWei,
    donationTotalPOL: (Number(donorTotalWei) / 1e18).toFixed(4),
    isSybilSafe: sybilCheck.safe,
    verificationLevel: sybilCheck.verificationLevel,
    minThresholdWei: MIN_CONTRIBUTION_WEI,
    minThresholdDisplay: `${minPOL} POL`
  });
}

/**
 * GET /api/voting/status/:campaignAddress/:walletAddress/:milestoneIndex
 *
 * Lightweight: just returns whether the wallet has voted and direction.
 */
async function getVoteStatus(req, res) {
  const { campaignAddress, walletAddress, milestoneIndex } = req.params;

  const vote = await Vote.findOne({
    walletAddress: walletAddress.toLowerCase(),
    campaignAddress: campaignAddress.toLowerCase(),
    milestoneIndex: Number(milestoneIndex)
  }).lean();

  res.json({
    success: true,
    hasVoted: Boolean(vote),
    support: vote?.support ?? null,
    qvPower: vote?.qvPower || "0",
    qvPowerDisplay: vote?.qvPowerDisplay || "0.0000",
    txHash: vote?.txHash || null
  });
}

/**
 * GET /api/voting/stats/:campaignAddress/:milestoneIndex
 *
 * Returns full QV aggregate stats for a milestone:
 * - totalQVWeight, approvalQVWeight, rejectionQVWeight (raw)
 * - approvalQVDisplay, rejectionQVDisplay (human-readable)
 * - totalVoters, approvalVoterCount, rejectionVoterCount
 * - eligibleVoterCount
 * - approved (boolean)
 * - approvalPercent, rejectionPercent (of voted QV)
 * - participationPercent (of eligible QV that has voted)
 */
async function getCampaignVotingStats(req, res) {
  const { campaignAddress, milestoneIndex } = req.params;

  const stats = await getMilestoneQVStats(campaignAddress, Number(milestoneIndex));

  res.json({
    success: true,
    ...stats
  });
}

/**
 * GET /api/voting/votes/:campaignAddress/:milestoneIndex?page=1&limit=20
 *
 * Returns paginated list of votes for a milestone.
 * Anonymized: wallet addresses are truncated for privacy.
 */
async function listMilestoneVotes(req, res) {
  const { campaignAddress, milestoneIndex } = req.params;
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
  const skip = (page - 1) * limit;

  const filter = {
    campaignAddress: campaignAddress.toLowerCase(),
    milestoneIndex: Number(milestoneIndex)
  };

  const [votes, total] = await Promise.all([
    Vote.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Vote.countDocuments(filter)
  ]);

  // Anonymize wallet addresses for public display
  const anonymized = votes.map(v => ({
    id: v._id,
    voterDisplay: `${v.walletAddress.slice(0, 6)}…${v.walletAddress.slice(-4)}`,
    support: v.support,
    qvPower: v.qvPower,
    qvPowerDisplay: v.qvPowerDisplay,
    createdAt: v.createdAt
  }));

  res.json({
    success: true,
    items: anonymized,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1
    }
  });
}

/**
 * GET /api/voting/campaign-donors/:campaignAddress
 *
 * Returns the list of donors with their QV powers for a campaign.
 * Used for building the "QV Leaderboard" in the frontend.
 */
async function getCampaignDonors(req, res) {
  const { campaignAddress } = req.params;
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
  const skip = (page - 1) * limit;

  const [donorTotals, donationCounts] = await Promise.all([
    getCampaignDonorTotals(campaignAddress),
    Donation.aggregate([
      {
        $match: {
          campaignAddress: campaignAddress.toLowerCase(),
          status: "confirmed"
        }
      },
      {
        $group: {
          _id: "$walletAddress",
          donationCount: { $sum: 1 }
        }
      }
    ])
  ]);

  const countMap = new Map(
    donationCounts.map((item) => [String(item._id).toLowerCase(), item.donationCount])
  );

  const sorted = donorTotals.sort((a, b) => {
    const left = BigInt(a.totalWei || "0");
    const right = BigInt(b.totalWei || "0");
    return left === right ? 0 : left > right ? -1 : 1;
  });

  const items = sorted.slice(skip, skip + limit).map((d) => ({
    voterDisplay: `${d.walletAddress.slice(0, 6)}...${d.walletAddress.slice(-4)}`,
    totalPOL: (Number(BigInt(d.totalWei || "0")) / 1e18).toFixed(4),
    qvPowerDisplay: qvPowerToDisplay(computeQVPower(d.totalWei)),
    donationCount: countMap.get(d.walletAddress) || 0,
    isEligibleToVote: isEligibleToVote(d.totalWei)
  }));

  return res.json({
    success: true,
    items,
    pagination: { page, limit, total: sorted.length, totalPages: Math.ceil(sorted.length / limit) || 1 }
  });

  {
  // Legacy aggregate path retained unreachable after the BigInt-safe response above.
  // Aggregate: group donations by wallet, compute totals
  const result = await Donation.aggregate([
    {
      $match: {
        campaignAddress: campaignAddress.toLowerCase(),
        status: "confirmed"
      }
    },
    {
      $group: {
        _id: "$walletAddress",
        totalWei: { $sum: { $toLong: "$amountWei" } },
        donationCount: { $sum: 1 },
        isEligibleToVote: { $max: "$isEligibleToVote" },
        qvPowerDisplay: { $last: "$qvPowerDisplay" }
      }
    },
    {
      $sort: { totalWei: -1 }
    },
    {
      $facet: {
        items: [{ $skip: skip }, { $limit: limit }],
        count: [{ $count: "total" }]
      }
    }
  ]);

  const items = (result[0]?.items || []).map(d => ({
    voterDisplay: `${d._id.slice(0, 6)}…${d._id.slice(-4)}`,
    totalPOL: (Number(d.totalWei) / 1e18).toFixed(4),
    qvPowerDisplay: qvPowerToDisplay(
      computeQVPower(d.totalWei.toString())
    ),
    donationCount: d.donationCount,
    isEligibleToVote: d.isEligibleToVote
  }));

  const total = result[0]?.count[0]?.total || 0;

  res.json({
    success: true,
    items,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 }
  });
  }
}

module.exports = {
  getVotingEligibility,
  getVoteStatus,
  getCampaignVotingStats,
  listMilestoneVotes,
  getCampaignDonors
};
