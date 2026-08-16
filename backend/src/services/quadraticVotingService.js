/**
 * Quadratic Voting Service
 * ─────────────────────────
 * Core engine for all QV math, eligibility checks, and sybil resistance.
 *
 * QV ALGORITHM (from spec):
 *   votingPower = √(MATIC donated)
 *   where MATIC = amountWei / 1e18
 *
 *   Equivalently in Wei-space:
 *   qvPowerRaw = floor(sqrt(amountWei))   [integer arithmetic]
 *   display    = qvPowerRaw / 1e9         [since sqrt(1e18) = 1e9]
 *
 * MINIMUM THRESHOLD (testnet):
 *   0.001 POL = 1_000_000_000_000_000 wei (1e15)
 *
 * EDGE CASES HANDLED:
 *   1. Zero contribution      → power = 0, not eligible
 *   2. Below threshold        → not eligible to vote
 *   3. Sybil detection        → checks worldIdVerified + gitcoinPassportScore
 *   4. Whale suppression      → naturally handled by sqrt (diminishing returns)
 *   5. Micro-donation spam    → threshold blocks penny spammers
 *   6. Multiple donations     → uses cumulative total, not per-tx
 */

const User = require("../models/User");
const Donation = require("../models/Donation");
const Vote = require("../models/Vote");

// ─── Constants ───────────────────────────────────────────────────────────────

// 0.001 POL in wei — testnet-friendly minimum to gain voting rights
const MIN_CONTRIBUTION_WEI = BigInt("1000000000000000"); // 1e15

// Gitcoin Passport minimum score for Sybil resistance (0 = disabled for testnet)
const MIN_GITCOIN_SCORE = 0; // Set to e.g. 15 on mainnet

// ─── Core QV Math (BigInt-safe) ──────────────────────────────────────────────

/**
 * Integer square root using Newton-Raphson method.
 * Same algorithm as Campaign.sol's QuadraticMath library.
 * @param {bigint} n - Input BigInt value
 * @returns {bigint} floor(sqrt(n))
 */
function bigIntSqrt(n) {
  if (n < 0n) throw new Error("Cannot compute sqrt of negative number");
  if (n === 0n) return 0n;
  if (n === 1n) return 1n;

  let z = n;
  let y = (n + 1n) >> 1n;
  while (y < z) {
    z = y;
    y = (n / y + y) >> 1n;
  }
  return z;
}

/**
 * Compute raw QV power from amountWei (BigInt string).
 * Returns: floor(sqrt(amountWei)) as a string.
 * Example: "100000000000000000000" (100 POL) → "10000000000" (10e9 units)
 * @param {string} amountWei - Contribution amount in wei (as decimal string)
 * @returns {string} QV power as string (BigInt-safe)
 */
function computeQVPower(amountWei) {
  try {
    const wei = BigInt(amountWei || "0");
    if (wei <= 0n) return "0";
    return bigIntSqrt(wei).toString();
  } catch {
    return "0";
  }
}

/**
 * Convert raw QV power (in sqrt-wei units) to human-readable display.
 * Formula: display = qvPowerRaw / 1e9  (since sqrt(1e18 wei) = 1e9 units = 1 display vote)
 * Example: "10000000000" → "10.0000" (meaning the donor has 10 votes)
 * @param {string} qvPowerRaw - Raw QV power string from computeQVPower()
 * @returns {string} Display value like "10.0000"
 */
function qvPowerToDisplay(qvPowerRaw) {
  try {
    const raw = BigInt(qvPowerRaw || "0");
    const divisor = 1_000_000_000n; // 1e9
    const whole = raw / divisor;
    const remainder = raw % divisor;
    // Format with 4 decimal places
    const fracStr = remainder.toString().padStart(9, "0").slice(0, 4);
    return `${whole}.${fracStr}`;
  } catch {
    return "0.0000";
  }
}

/**
 * Check if a wallet is eligible to vote based on their contribution amount.
 * @param {string} amountWei - Total contribution in wei
 * @returns {boolean}
 */
function isEligibleToVote(amountWei) {
  try {
    const wei = BigInt(amountWei || "0");
    return wei >= MIN_CONTRIBUTION_WEI;
  } catch {
    return false;
  }
}

/**
 * Compute aggregate QV weight for a set of donations.
 * Each donor's power = sqrt(their total contribution) — NOT sum of individual tx sqrts.
 * This matches the contract's behavior (contributions[] is cumulative).
 * @param {Array<{walletAddress: string, totalWei: string}>} donorTotals
 * @returns {{ totalQVWeight: string, voterCount: number, eligibleCount: number }}
 */
function computeAggregateQVWeight(donorTotals) {
  let totalQV = 0n;
  let eligibleCount = 0;

  for (const donor of donorTotals) {
    const wei = BigInt(donor.totalWei || "0");
    if (wei >= MIN_CONTRIBUTION_WEI) {
      totalQV += bigIntSqrt(wei);
      eligibleCount++;
    }
  }

  return {
    totalQVWeight: totalQV.toString(),
    voterCount: donorTotals.length,
    eligibleCount
  };
}

/**
 * Compute vote result from QV weights.
 * @param {string} approvalQV - Total approval QV weight
 * @param {string} rejectionQV - Total rejection QV weight
 * @param {string} totalEligibleQV - Total eligible QV weight (for participation rate)
 * @returns {{ approved: boolean, approvalPercent: number, rejectionPercent: number, participationPercent: number }}
 */
function computeVoteResult(approvalQV, rejectionQV, totalEligibleQV) {
  const approve = BigInt(approvalQV || "0");
  const reject = BigInt(rejectionQV || "0");
  const total = approve + reject;
  const eligible = BigInt(totalEligibleQV || "0");

  if (total === 0n) {
    return { approved: false, approvalPercent: 0, rejectionPercent: 0, participationPercent: 0 };
  }

  // Percentages in QV weight space (not voter count)
  const approvalPercent = Number((approve * 10000n) / total) / 100;
  const rejectionPercent = Number((reject * 10000n) / total) / 100;
  const participationPercent = eligible > 0n
    ? Number((total * 10000n) / eligible) / 100
    : 0;

  return {
    approved: approve > reject,
    approvalPercent: Math.round(approvalPercent * 100) / 100,
    rejectionPercent: Math.round(rejectionPercent * 100) / 100,
    participationPercent: Math.min(100, Math.round(participationPercent * 100) / 100)
  };
}

// ─── Sybil Resistance ────────────────────────────────────────────────────────

/**
 * Check if a wallet passes sybil resistance checks.
 * On testnet: allows all wallets (for easy demo).
 * On mainnet: would require World ID or Gitcoin Passport verification.
 *
 * @param {string} walletAddress
 * @returns {Promise<{ safe: boolean, reason: string, verificationLevel: string }>}
 */
async function verifySybilResistance(walletAddress) {
  try {
    const user = await User.findOne({ walletAddress: walletAddress.toLowerCase() }).lean();

    if (!user) {
      // Unknown wallet — allow on testnet, block on mainnet
      return {
        safe: true, // Testnet: permissive
        reason: "Wallet not registered but allowed on testnet",
        verificationLevel: "none"
      };
    }

    // World ID verification (strongest — unique human proof)
    if (user.worldIdVerified) {
      return { safe: true, reason: "World ID verified", verificationLevel: "world_id" };
    }

    // Gitcoin Passport score (minimum score threshold)
    if (user.gitcoinPassportScore && user.gitcoinPassportScore >= MIN_GITCOIN_SCORE) {
      return {
        safe: true,
        reason: `Gitcoin Passport score: ${user.gitcoinPassportScore}`,
        verificationLevel: "gitcoin"
      };
    }

    // Testnet: allow unverified wallets with a warning
    // Mainnet: would return { safe: false, reason: "Verification required" }
    return {
      safe: true, // Testnet: permissive — change to false for mainnet sybil defense
      reason: "Unverified wallet (testnet: allowed for demonstration)",
      verificationLevel: "unverified"
    };
  } catch (err) {
    console.error("[QVService] Sybil check error:", err);
    // Fail open on testnet
    return { safe: true, reason: "Check failed — defaulting to safe (testnet)", verificationLevel: "unknown" };
  }
}

// ─── Database Operations ─────────────────────────────────────────────────────

/**
 * Get aggregated donor totals for a campaign from the DB.
 * Groups donations by walletAddress, summing all amountWei values.
 * @param {string} campaignAddress
 * @returns {Promise<Array<{walletAddress: string, totalWei: string}>>}
 */
async function getCampaignDonorTotals(campaignAddress) {
  const donations = await Donation.find(
    {
      campaignAddress: campaignAddress.toLowerCase(),
      status: "confirmed"
    },
    { walletAddress: 1, amountWei: 1 }
  ).lean();

  const totals = new Map();
  for (const donation of donations) {
    const wallet = String(donation.walletAddress || "").toLowerCase();
    if (!wallet) {
      continue;
    }

    try {
      const amountWei = BigInt(donation.amountWei || "0");
      totals.set(wallet, (totals.get(wallet) || 0n) + amountWei);
    } catch {
      console.warn("[QVService] Ignoring invalid donation amountWei:", donation.amountWei);
    }
  }

  return [...totals.entries()].map(([walletAddress, totalWei]) => ({
    walletAddress,
    totalWei: totalWei.toString()
  }));
}

/**
 * Get a voter's total contribution to a campaign (aggregated across all txs).
 * @param {string} walletAddress
 * @param {string} campaignAddress
 * @returns {Promise<string>} Total amount in wei as string
 */
async function getDonorTotalWei(walletAddress, campaignAddress) {
  const donations = await Donation.find(
    {
      walletAddress: walletAddress.toLowerCase(),
      campaignAddress: campaignAddress.toLowerCase(),
      status: "confirmed"
    },
    { amountWei: 1 }
  ).lean();

  let totalWei = 0n;
  for (const donation of donations) {
    try {
      totalWei += BigInt(donation.amountWei || "0");
    } catch {
      console.warn("[QVService] Ignoring invalid donor amountWei:", donation.amountWei);
    }
  }

  return totalWei.toString();
}

/**
 * Get voting stats for a campaign milestone from Vote records.
 * @param {string} campaignAddress
 * @param {number} milestoneIndex
 * @returns {Promise<Object>} QV stats
 */
async function getMilestoneQVStats(campaignAddress, milestoneIndex) {
  const votes = await Vote.find({
    campaignAddress: campaignAddress.toLowerCase(),
    milestoneIndex: Number(milestoneIndex)
  }).lean();

  let approvalQV = 0n;
  let rejectionQV = 0n;
  let approvalCount = 0;
  let rejectionCount = 0;

  for (const vote of votes) {
    const power = BigInt(vote.qvPower || "0");
    if (vote.support) {
      approvalQV += power;
      approvalCount++;
    } else {
      rejectionQV += power;
      rejectionCount++;
    }
  }

  // Get total eligible QV from campaign donors
  const donorTotals = await getCampaignDonorTotals(campaignAddress);
  const { totalQVWeight, eligibleCount } = computeAggregateQVWeight(donorTotals);

  const result = computeVoteResult(
    approvalQV.toString(),
    rejectionQV.toString(),
    totalQVWeight
  );

  return {
    totalQVWeight,
    approvalQVWeight: approvalQV.toString(),
    rejectionQVWeight: rejectionQV.toString(),
    approvalQVDisplay: qvPowerToDisplay(approvalQV.toString()),
    rejectionQVDisplay: qvPowerToDisplay(rejectionQV.toString()),
    totalVoters: votes.length,
    approvalVoterCount: approvalCount,
    rejectionVoterCount: rejectionCount,
    eligibleVoterCount: eligibleCount,
    ...result
  };
}

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  // Core math
  computeQVPower,
  qvPowerToDisplay,
  isEligibleToVote,
  computeAggregateQVWeight,
  computeVoteResult,
  bigIntSqrt,
  // Sybil
  verifySybilResistance,
  // DB operations
  getCampaignDonorTotals,
  getDonorTotalWei,
  getMilestoneQVStats,
  // Constants
  MIN_CONTRIBUTION_WEI: MIN_CONTRIBUTION_WEI.toString()
};
