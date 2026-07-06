const Donation = require("../models/Donation");
const Campaign = require("../models/Campaign");
const Notification = require("../models/Notification");
const User = require("../models/User");
const { NOTIFICATION_TYPES } = require("../config/constants");
const { invalidateCampaignCache } = require("./cacheService");
const { 
  sendMilestoneNotification, 
  sendDonationReceivedNotification, 
  sendProofSubmittedNotification 
} = require("./emailService");

/**
 * Process a ContributionReceived event.
 * Auto-creates a Donation record and notifies the campaign creator.
 */
async function processContributionReceived(event) {
  const { contributor, amount, amountWei } = event.data;

  // Create donation record (txHash dedup is handled by unique index)
  const existing = await Donation.findOne({ txHash: event.txHash }).lean();
  if (!existing) {
    await Donation.create({
      walletAddress: contributor.toLowerCase(),
      campaignAddress: event.contractAddress,
      amount: amount || "0",
      amountWei: amountWei || "0",
      txHash: event.txHash,
      chainId: event.chainId,
      blockNumber: event.blockNumber,
      status: "confirmed"
    });
  }

  await invalidateCampaignCache(event.contractAddress);

  // Notify campaign creator
  const campaign = await Campaign.findOne({
    contractAddress: event.contractAddress
  }).lean();

  if (campaign) {
    await Notification.create({
      walletAddress: campaign.creatorAddress,
      type: NOTIFICATION_TYPES.CAMPAIGN_UPDATE,
      title: "New contribution received",
      message: `A donor contributed ${amount || "some"} MATIC to "${campaign.title}".`,
      metadata: {
        contractAddress: event.contractAddress,
        contributor,
        amount,
        txHash: event.txHash
      }
    });

    // Send email to creator
    const creator = await User.findOne({ walletAddress: campaign.creatorAddress }).lean();
    if (creator?.email) {
      await sendDonationReceivedNotification({
        email: creator.email,
        campaignTitle: campaign.title,
        amount: amount || "0",
        actionUrl: `${process.env.FRONTEND_URL || "http://localhost:5173"}/campaign/${event.contractAddress}/manage`
      });
    }
  }
}

/**
 * Process a MilestoneVoted event.
 * Notifies the campaign creator about the vote.
 */
async function processMilestoneVoted(event) {
  const { milestoneIndex, voter, support, weight } = event.data;

  const campaign = await Campaign.findOne({
    contractAddress: event.contractAddress
  }).lean();

  await invalidateCampaignCache(event.contractAddress);

  if (campaign) {
    const milestoneTitle =
      campaign.milestones?.[milestoneIndex]?.title || `Milestone #${milestoneIndex}`;

    await Notification.create({
      walletAddress: campaign.creatorAddress,
      type: NOTIFICATION_TYPES.VOTING_OPEN,
      title: `Vote received on "${milestoneTitle}"`,
      message: `A donor ${support ? "approved" : "rejected"} milestone "${milestoneTitle}" with weight ${weight || "unknown"}.`,
      metadata: {
        contractAddress: event.contractAddress,
        milestoneIndex,
        voter,
        support,
        weight,
        txHash: event.txHash
      }
    });
  }
}

/**
 * Process a TrancheExecuted event.
 * Updates campaign cache and notifies the creator.
 */
async function processTrancheExecuted(event) {
  const { milestoneIndex, recipient, amount } = event.data;

  await invalidateCampaignCache(event.contractAddress);

  const campaign = await Campaign.findOne({
    contractAddress: event.contractAddress
  }).lean();

  if (campaign) {
    const milestoneTitle =
      campaign.milestones?.[milestoneIndex]?.title || `Milestone #${milestoneIndex}`;

    await Notification.create({
      walletAddress: campaign.creatorAddress,
      type: NOTIFICATION_TYPES.TRANCHE_RELEASED,
      title: `Tranche released for "${milestoneTitle}"`,
      message: `Funds (${amount || "unknown"} MATIC) have been released to ${recipient} for milestone "${milestoneTitle}".`,
      metadata: {
        contractAddress: event.contractAddress,
        milestoneIndex,
        recipient,
        amount,
        txHash: event.txHash
      }
    });

    // Send email to creator if they have an email on file
    const user = await User.findOne({
      walletAddress: campaign.creatorAddress
    }).lean();

    if (user?.email) {
      await sendMilestoneNotification({
        email: user.email,
        campaignTitle: campaign.title,
        milestoneTitle,
        actionUrl: `${process.env.FRONTEND_URL || "http://localhost:5173"}/campaign/${event.contractAddress}/manage`
      });
    }
  }
}

/**
 * Process a RefundClaimed event.
 * Updates the donation record status and notifies the donor.
 */
async function processRefundClaimed(event) {
  const { contributor, amount } = event.data;

  // Mark the donation as refunded (update latest donation by this contributor for this campaign)
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

  await Notification.create({
    walletAddress: contributor.toLowerCase(),
    type: NOTIFICATION_TYPES.CAMPAIGN_UPDATE,
    title: "Refund processed",
    message: `Your refund of ${amount || "some"} MATIC from "${campaign?.title || "a campaign"}" has been processed.`,
    metadata: {
      contractAddress: event.contractAddress,
      amount,
      txHash: event.txHash
    }
  });

  await invalidateCampaignCache(event.contractAddress);
}

/**
 * Process a MilestoneProofSubmitted event.
 * Notifies all donors of this campaign that a proof was submitted.
 */
async function processMilestoneProofSubmitted(event) {
  const { milestoneIndex, cid } = event.data;

  const campaign = await Campaign.findOne({
    contractAddress: event.contractAddress
  }).lean();

  if (!campaign) {
    return;
  }

  // Update the proof CID in the campaign milestones
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

  await invalidateCampaignCache(event.contractAddress);

  // Get unique donor wallets for this campaign
  const donorWallets = await Donation.distinct("walletAddress", {
    campaignAddress: event.contractAddress
  });

  const milestoneTitle =
    campaign.milestones?.[milestoneIndex]?.title || `Milestone #${milestoneIndex}`;

  // Notify all donors
  const notifications = donorWallets.map((wallet) => ({
    walletAddress: wallet,
    type: NOTIFICATION_TYPES.MILESTONE_PROOF,
    title: `Proof submitted for "${milestoneTitle}"`,
    message: `The creator of "${campaign.title}" has submitted proof for milestone "${milestoneTitle}". Review and vote.`,
    metadata: {
      contractAddress: event.contractAddress,
      milestoneIndex,
      cid,
      txHash: event.txHash
    }
  }));

  if (notifications.length > 0) {
    await Notification.insertMany(notifications);
  }

  // Send emails to donors
  const donors = await User.find({
    walletAddress: { $in: donorWallets },
    email: { $exists: true, $ne: "" }
  }).lean();

  const donorEmails = donors.map((d) => d.email);
  if (donorEmails.length > 0) {
    await sendProofSubmittedNotification({
      emails: donorEmails,
      campaignTitle: campaign.title,
      milestoneTitle,
      actionUrl: `${process.env.FRONTEND_URL || "http://localhost:5173"}/campaign/${event.contractAddress}`
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
