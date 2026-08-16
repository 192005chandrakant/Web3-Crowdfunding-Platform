const Donation = require("../models/Donation");
const Campaign = require("../models/Campaign");
const Vote = require("../models/Vote");
const { NOTIFICATION_TYPES } = require("../config/constants");
const { notificationEngine } = require("./notifications/NotificationEngine");
const { invalidateCampaignCache } = require("./cacheService");
const {
  computeQVPower,
  qvPowerToDisplay,
  isEligibleToVote,
  getDonorTotalWei
} = require("./quadraticVotingService");

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

/**
 * Process a ContributionReceived event.
 * Auto-creates a Donation record and dispatches live notification to campaign creator via Observer engine.
 */
async function processContributionReceived(event) {
  const { contributor, amount, amountWei } = event.data;

  // Create donation record (txHash dedup is handled by unique index)
  const existing = await Donation.findOne({ txHash: event.txHash }).lean();
  if (!existing) {
    const priorTotalWei = await getDonorTotalWei(contributor, event.contractAddress);
    const totalWeiAfter = (BigInt(priorTotalWei) + BigInt(amountWei || "0")).toString();
    const qvPower = computeQVPower(totalWeiAfter);
    const qvPowerDisplay = qvPowerToDisplay(qvPower);
    const eligible = isEligibleToVote(totalWeiAfter);

    await Donation.create({
      walletAddress: contributor.toLowerCase(),
      campaignAddress: event.contractAddress,
      amount: amount || "0",
      amountWei: amountWei || "0",
      txHash: event.txHash,
      chainId: event.chainId,
      blockNumber: event.blockNumber,
      status: "confirmed",
      quadraticVotingPower: qvPower,
      qvPowerDisplay,
      isEligibleToVote: eligible
    });

    console.log(
      `[QV] Contribution processed: ${contributor} → ${amount} POL | QV Power: ${qvPowerDisplay} votes | Eligible: ${eligible}`
    );
  }

  await invalidateCampaignCache(event.contractAddress);

  // Notify campaign creator via centralized Observer design pattern
  const campaign = await Campaign.findOne({
    contractAddress: event.contractAddress
  }).lean();

  if (campaign) {
    await notificationEngine.notify({
      walletAddress: campaign.creatorAddress,
      type: "donation_received", // Triggers specialized donation EmailObserver template & instant SSE toast
      title: `🎉 New donation to "${campaign.title}"!`,
      message: `A generous donor contributed ${amount || "some"} MATIC/POL to your campaign.`,
      metadata: {
        contractAddress: event.contractAddress,
        campaignTitle: campaign.title,
        contributor,
        amount,
        txHash: event.txHash,
        actionUrl: `${process.env.FRONTEND_URL || "http://localhost:5173"}/campaign/${event.contractAddress}/manage`
      }
    });

    await notifyCampaignDonors({
      contractAddress: event.contractAddress,
      type: NOTIFICATION_TYPES.CAMPAIGN_UPDATE,
      title: `💸 Donation confirmed for "${campaign.title}"`,
      message: `Your contribution of ${amount || "some"} MATIC/POL has been recorded for "${campaign.title}".`,
      metadata: {
        campaignTitle: campaign.title,
        amount,
        contributor,
        txHash: event.txHash,
        actionUrl: `${process.env.FRONTEND_URL || "http://localhost:5173"}/campaign/${event.contractAddress}`
      },
      excludeWallets: [contributor.toLowerCase()]
    });
  }
}

/**
 * Process a MilestoneVoted event.
 * Notifies campaign creator about the vote via Observer engine.
 */
async function processMilestoneVoted(event) {
  const { milestoneIndex, voter, support, qvWeight, rawContribution } = event.data;

  let qvPower = qvWeight || "0";
  let rawWei = rawContribution || "0";

  if (!qvWeight) {
    rawWei = await getDonorTotalWei(voter, event.contractAddress);
    qvPower = computeQVPower(rawWei);
  }

  const qvPowerDisplay = qvPowerToDisplay(qvPower);

  try {
    await Vote.create({
      walletAddress: voter.toLowerCase(),
      campaignAddress: event.contractAddress.toLowerCase(),
      milestoneIndex: Number(milestoneIndex),
      support: Boolean(support),
      txHash: event.txHash,
      blockNumber: event.blockNumber,
      chainId: event.chainId,
      rawContributionWei: rawWei,
      qvPower,
      qvPowerDisplay
    });
    console.log(
      `[QV] Vote recorded: ${voter} → ${support ? "APPROVE" : "REJECT"} | QV Power: ${qvPowerDisplay} votes`
    );
  } catch (voteErr) {
    if (!voteErr.code || voteErr.code !== 11000) {
      console.error("[QV] Failed to create Vote record:", voteErr.message);
    }
  }

  const campaign = await Campaign.findOne({
    contractAddress: event.contractAddress
  }).lean();

  if (campaign) {
    const milestoneTitle =
      campaign.milestones?.[milestoneIndex]?.title || `Milestone #${milestoneIndex}`;

    await notificationEngine.notify({
      walletAddress: campaign.creatorAddress,
      type: NOTIFICATION_TYPES.VOTING_OPEN,
      title: `Vote cast on "${milestoneTitle}"`,
      message: `A donor ${support ? "approved ✓" : "rejected ✗"} milestone "${milestoneTitle}" with ${qvPowerDisplay} QV weight.`,
      metadata: {
        contractAddress: event.contractAddress,
        campaignTitle: campaign.title,
        milestoneIndex,
        voter,
        support,
        qvPower,
        qvPowerDisplay,
        rawContributionWei: rawWei,
        txHash: event.txHash,
        actionUrl: `${process.env.FRONTEND_URL || "http://localhost:5173"}/campaign/${event.contractAddress}/manage`
      }
    });

    await notifyCampaignDonors({
      contractAddress: event.contractAddress,
      type: NOTIFICATION_TYPES.CAMPAIGN_UPDATE,
      title: `🗳️ Vote recorded on "${milestoneTitle}"`,
      message: `A donor ${support ? "approved ✓" : "rejected ✗"} "${milestoneTitle}" in "${campaign.title}".`,
      metadata: {
        campaignTitle: campaign.title,
        milestoneIndex,
        milestoneTitle,
        voter,
        support,
        qvPower,
        qvPowerDisplay,
        txHash: event.txHash,
        actionUrl: `${process.env.FRONTEND_URL || "http://localhost:5173"}/campaign/${event.contractAddress}`
      },
      excludeWallets: [voter.toLowerCase()]
    });
  }
}

/**
 * Process a TrancheExecuted event.
 * Notifies creator via Observer pattern (in-app, SSE streaming, email, cache sync).
 */
async function processTrancheExecuted(event) {
  const { milestoneIndex, recipient, amount } = event.data;
  const index = Number(milestoneIndex);
  const amountWei = amount || "0";
  const amountPOL = weiToPolDisplay(amountWei);

  const campaign = await Campaign.findOne({
    contractAddress: event.contractAddress
  }).lean();

  if (campaign) {
    const milestoneTitle =
      campaign.milestones?.[index]?.title || `Milestone #${index}`;
    const milestones = [...(campaign.milestones || [])];

    if (milestones[index]) {
      milestones[index] = {
        ...milestones[index],
        isPaid: true,
        payoutTxHash: event.txHash,
        payoutRecipient: recipient.toLowerCase(),
        payoutAmountWei: amountWei,
        payoutAmountPOL: amountPOL,
        payoutReleasedAt: new Date()
      };

      const allPaid = milestones.length > 0 && milestones.every((m) => Boolean(m.isPaid));
      await Campaign.findOneAndUpdate(
        { contractAddress: event.contractAddress },
        {
          $set: {
            milestones,
            ...(allPaid ? { status: "completed" } : {})
          }
        }
      );
      await invalidateCampaignCache(event.contractAddress);
    }

    await notificationEngine.notify({
      walletAddress: campaign.creatorAddress,
      type: NOTIFICATION_TYPES.TRANCHE_RELEASED,
      title: `💰 Tranche released for "${milestoneTitle}"!`,
      message: `Funds (${amountPOL} POL) have been officially released to ${recipient} following successful community vote.`,
      metadata: {
        contractAddress: event.contractAddress,
        campaignTitle: campaign.title,
        milestoneIndex: index,
        milestoneTitle,
        recipient,
        amount: amountPOL,
        amountWei,
        amountPOL,
        txHash: event.txHash,
        actionUrl: `${process.env.FRONTEND_URL || "http://localhost:5173"}/campaign/${event.contractAddress}/manage`
      }
    });

    await notifyCampaignDonors({
      contractAddress: event.contractAddress,
      type: NOTIFICATION_TYPES.TRANCHE_RELEASED,
      title: `💰 "${campaign.title}" funds released`,
      message: `The milestone "${milestoneTitle}" has been approved and ${amountPOL} POL has been released to the beneficiary.`,
      metadata: {
        campaignTitle: campaign.title,
        milestoneIndex: index,
        milestoneTitle,
        recipient,
        amount: amountPOL,
        amountWei,
        amountPOL,
        txHash: event.txHash,
        actionUrl: `${process.env.FRONTEND_URL || "http://localhost:5173"}/campaign/${event.contractAddress}`
      }
    });
  }
}

/**
 * Process a RefundClaimed event.
 */
async function processRefundClaimed(event) {
  const { contributor, amount } = event.data;

  await Donation.updateMany(
    {
      walletAddress: contributor.toLowerCase(),
      campaignAddress: event.contractAddress
    },
    { $set: { status: "failed" } }
  );

  const campaign = await Campaign.findOne({
    contractAddress: event.contractAddress
  }).lean();

  await notificationEngine.notify({
    walletAddress: contributor.toLowerCase(),
    type: NOTIFICATION_TYPES.CAMPAIGN_UPDATE,
    title: "Refund processed successfully",
    message: `Your contribution refund of ${amount || "some"} MATIC from "${campaign?.title || "campaign"}" has been claimed to your wallet.`,
    metadata: {
      contractAddress: event.contractAddress,
      campaignTitle: campaign?.title,
      amount,
      txHash: event.txHash
    }
  });
}

/**
 * Process a MilestoneProofSubmitted event.
 * Broadcasts review notifications to all active campaign donors simultaneously via Observer engine.
 */
async function processMilestoneProofSubmitted(event) {
  const { milestoneIndex, cid } = event.data;

  const campaign = await Campaign.findOne({
    contractAddress: event.contractAddress
  }).lean();

  if (!campaign) {
    return;
  }

  if (campaign.milestones?.[milestoneIndex]) {
    const milestones = [...campaign.milestones];
    milestones[milestoneIndex] = {
      ...milestones[milestoneIndex],
      proofCid: cid
    };

    await Campaign.findOneAndUpdate(
      { contractAddress: event.contractAddress },
      { $set: { milestones } }
    );
  }

  const milestoneTitle =
    campaign.milestones?.[milestoneIndex]?.title || `Milestone #${milestoneIndex}`;

  await notifyCampaignDonors({
    contractAddress: event.contractAddress,
    type: NOTIFICATION_TYPES.MILESTONE_PROOF,
    title: `📋 Proof Submitted for "${milestoneTitle}"`,
    message: `The creator of "${campaign.title}" has uploaded documentation proof for milestone "${milestoneTitle}". Please inspect the evidence and cast your quadratic vote!`,
    metadata: {
      campaignTitle: campaign.title,
      milestoneIndex,
      milestoneTitle,
      cid,
      txHash: event.txHash,
      actionUrl: `${process.env.FRONTEND_URL || "http://localhost:5173"}/campaign/${event.contractAddress}`
    }
  });
}

async function notifyCampaignDonors({
  contractAddress,
  type,
  title,
  message,
  metadata = {},
  excludeWallets = []
}) {
  const donorWallets = await Donation.distinct("walletAddress", {
    campaignAddress: contractAddress.toLowerCase(),
    status: "confirmed"
  });

  for (const wallet of donorWallets) {
    const normalizedWallet = String(wallet || "").toLowerCase();
    if (!normalizedWallet || excludeWallets.includes(normalizedWallet)) {
      continue;
    }

    await notificationEngine.notify({
      walletAddress: normalizedWallet,
      type,
      title,
      message,
      metadata: {
        ...metadata,
        contractAddress: contractAddress.toLowerCase(),
        campaignAddress: contractAddress.toLowerCase()
      }
    });
  }
}

const EVENT_PROCESSORS = {
  ContributionReceived: processContributionReceived,
  MilestoneVoted: processMilestoneVoted,
  TrancheExecuted: processTrancheExecuted,
  RefundClaimed: processRefundClaimed,
  MilestoneProofSubmitted: processMilestoneProofSubmitted
};

async function processEvent(event) {
  const processor = EVENT_PROCESSORS[event.eventName];
  if (!processor) {
    console.warn(`[event-processor] No processor found for event: ${event.eventName}`);
    return;
  }

  await processor(event);
}

module.exports = { processEvent, EVENT_PROCESSORS };
