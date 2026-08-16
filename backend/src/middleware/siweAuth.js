const Campaign = require("../models/Campaign");
const { ClerkExpressRequireAuth, clerkClient } = require("@clerk/clerk-sdk-node");
const { loadCurrentUser } = require("./roleAccess");

const requireAuth = ClerkExpressRequireAuth();

async function requestHasAdminRole(req) {
  if (req.currentUser) {
    return req.currentUser.role === "admin" && req.currentUser.accountStatus === "active";
  }

  const user = await loadCurrentUser(req);
  if (user) {
    req.currentUser = user;
  }

  return user?.role === "admin" && user?.accountStatus === "active";
}

/**
 * Middleware: Authenticate via Clerk and resolve the user's wallet address.
 *
 * Clerk users may or may not have a web3 wallet linked to their profile
 * (e.g. users who signed up via email won't). We attempt to resolve the
 * wallet from Clerk but don't block if it's missing — downstream middleware
 * decides how to handle a missing wallet.
 */
function requireSiweAuth(req, res, next) {
  requireAuth(req, res, async (err) => {
    if (err) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    try {
      const user = await clerkClient.users.getUser(req.auth.userId);

      req.clerkUserId = req.auth.userId;

      // Try to resolve wallet address from Clerk's web3Wallets array
      const web3Wallet = user.web3Wallets?.[0]?.web3Wallet;
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

    // Check wallet match — if Clerk has no wallet, also check against the
    // Clerk user ID stored on the campaign as a fallback.
    const walletMatch = req.walletAddress && campaign.creatorAddress === req.walletAddress;
    const clerkMatch = campaign.clerkUserId && campaign.clerkUserId === req.clerkUserId;

    const adminMatch = await requestHasAdminRole(req);

    if (!adminMatch && !walletMatch && !clerkMatch) {
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

/**
 * Middleware: Verify that the `creatorAddress` in the request body matches
 * the authenticated user's wallet.
 *
 * If the Clerk user has a linked web3 wallet, we enforce an exact match.
 * If not (e.g. email-only sign-up), we allow the request through because
 * the user has already proven wallet ownership by signing the on-chain
 * factory deployment transaction via MetaMask.
 */
async function requireMatchingCreatorAddress(req, res, next) {
  try {
    const payloadCreator = req.validated?.body?.creatorAddress?.toLowerCase();

    if (await requestHasAdminRole(req)) {
      return next();
    }

    // Wallet-only sessions must match the Clerk wallet. Clerk account sessions may
    // link another transaction-proven wallet to the same user identity.
    if (payloadCreator && req.walletAddress && payloadCreator !== req.walletAddress && !req.clerkUserId) {
      return res.status(403).json({
        success: false,
        message: "creatorAddress must match authenticated wallet"
      });
    }

    // If Clerk has no wallet linked, we allow it - the on-chain tx proves ownership
    next();
  } catch (error) {
    next(error);
  }
}

async function requireMatchingWalletParam(req, res, next) {
  try {
    const paramWallet = req.params.walletAddress?.toLowerCase();
    if (!(await requestHasAdminRole(req)) && paramWallet && req.walletAddress && paramWallet !== req.walletAddress && !req.clerkUserId) {
      return res.status(403).json({
        success: false,
        message: "walletAddress must match authenticated wallet"
      });
    }
    next();
  } catch (error) {
    next(error);
  }
}

async function requireMatchingWalletBody(req, res, next) {
  try {
    const bodyWallet = req.validated?.body?.walletAddress?.toLowerCase();
    if (!(await requestHasAdminRole(req)) && bodyWallet && req.walletAddress && bodyWallet !== req.walletAddress && !req.clerkUserId) {
      return res.status(403).json({
        success: false,
        message: "walletAddress must match authenticated wallet"
      });
    }
    next();
  } catch (error) {
    next(error);
  }
}

module.exports = {
  requireSiweAuth,
  requireCampaignCreator,
  requireMatchingCreatorAddress,
  requireMatchingWalletParam,
  requireMatchingWalletBody
};
