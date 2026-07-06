const Campaign = require("../models/Campaign");
const { ClerkExpressRequireAuth, clerkClient } = require("@clerk/clerk-sdk-node");

const requireAuth = ClerkExpressRequireAuth();

function requireSiweAuth(req, res, next) {
  requireAuth(req, res, async (err) => {
    if (err) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    try {
      const user = await clerkClient.users.getUser(req.auth.userId);
      const web3Wallet = user.web3Wallets?.[0]?.web3Wallet;

      req.clerkUserId = req.auth.userId;
      
      if (web3Wallet) {
        req.walletAddress = web3Wallet.toLowerCase();
      }

      next();
    } catch (error) {
      console.error("[Auth] Clerk verification error:", error);
      res.status(401).json({ success: false, message: "Invalid session" });
    }
  });
}

async function requireCampaignCreator(req, res, next) {
  try {
    const { address } = req.params;
    const campaign = await Campaign.findOne({ contractAddress: address.toLowerCase() }).lean();

    if (!campaign) {
      return res.status(404).json({ success: false, message: "Campaign not found" });
    }

    if (campaign.creatorAddress !== req.walletAddress) {
      return res.status(403).json({
        success: false,
        message: "Only the campaign creator can perform this action"
      });
    }

    req.campaign = campaign;
    next();
  } catch (error) {
    next(error);
  }
}

function requireMatchingCreatorAddress(req, res, next) {
  const payloadCreator = req.validated?.body?.creatorAddress?.toLowerCase();
  if (payloadCreator && payloadCreator !== req.walletAddress) {
    return res.status(403).json({
      success: false,
      message: "creatorAddress must match authenticated wallet"
    });
  }
  next();
}

function requireMatchingWalletParam(req, res, next) {
  const paramWallet = req.params.walletAddress?.toLowerCase();
  if (paramWallet && paramWallet !== req.walletAddress) {
    return res.status(403).json({
      success: false,
      message: "walletAddress must match authenticated wallet"
    });
  }
  next();
}

function requireMatchingWalletBody(req, res, next) {
  const bodyWallet = req.validated?.body?.walletAddress?.toLowerCase();
  if (bodyWallet && bodyWallet !== req.walletAddress) {
    return res.status(403).json({
      success: false,
      message: "walletAddress must match authenticated wallet"
    });
  }
  next();
}

module.exports = {
  requireSiweAuth,
  requireCampaignCreator,
  requireMatchingCreatorAddress,
  requireMatchingWalletParam,
  requireMatchingWalletBody
};
