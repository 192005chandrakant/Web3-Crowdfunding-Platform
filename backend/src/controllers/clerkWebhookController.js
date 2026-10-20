const { Webhook } = require("svix");
const User = require("../models/User");
const { getEnvConfig } = require("../config/env");

/**
 * POST /api/webhooks/clerk
 * Processes Clerk user lifecycle events to keep the User model in sync.
 *
 * Identity strategy:
 *  - Match by clerkUserId first (most stable).
 *  - If not found, try email match to prevent duplicate accounts.
 *  - If user found by email, link clerkUserId to that existing record.
 *  - When Clerk reports a new web3 wallet, push it to walletAddresses[].
 */
async function handleClerkWebhook(req, res) {
  const env = getEnvConfig();
  const WEBHOOK_SECRET = env.clerk.webhookSecret;

  if (!WEBHOOK_SECRET) {
    console.error("[ClerkWebhook] CLERK_WEBHOOK_SECRET is not set in env.");
    return res.status(500).json({ success: false, message: "Server misconfiguration" });
  }

  const svix_id        = req.headers["svix-id"];
  const svix_timestamp = req.headers["svix-timestamp"];
  const svix_signature = req.headers["svix-signature"];

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return res.status(400).json({ success: false, message: "Missing svix headers" });
  }

  const payload = req.body.toString("utf8");
  const headers = {
    "svix-id":        svix_id,
    "svix-timestamp": svix_timestamp,
    "svix-signature": svix_signature
  };

  const wh = new Webhook(WEBHOOK_SECRET);
  let evt;

  try {
    evt = wh.verify(payload, headers);
  } catch (err) {
    console.error("[ClerkWebhook] Signature verification failed:", err.message);
    return res.status(400).json({ success: false, message: "Webhook verification failed" });
  }

  const clerkUserId = evt.data.id;
  const eventType   = evt.type;
  console.log(`[ClerkWebhook] event=${eventType} clerkUserId=${clerkUserId}`);

  try {
    // â”€â”€ user.created / user.updated â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    if (eventType === "user.created" || eventType === "user.updated") {
      const email = evt.data.email_addresses?.[0]?.email_address || "";
      const displayName = evt.data.first_name
        ? `${evt.data.first_name} ${evt.data.last_name || ""}`.trim()
        : (evt.data.username || "");

      // Extract web3 wallet from Clerk (may be null for email-only accounts)
      const web3WalletRaw = evt.data.web3_wallets?.[0]?.web3_wallet || null;
      const web3Wallet = web3WalletRaw ? web3WalletRaw.toLowerCase() : null;

      // â”€â”€ 1. Try to find by clerkUserId (most precise) â”€â”€
      let existingUser = await User.findOne({ clerkUserId });

      // â”€â”€ 2. If not found, try email (dedup: same person signed up via wallet earlier) â”€â”€
      if (!existingUser && email) {
        existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
          console.log(`[ClerkWebhook] Linking clerkUserId ${clerkUserId} to existing user ${existingUser.walletAddress} via email match`);
        }
      }

      // â”€â”€ 3. Build the update â”€â”€
      const $set = {
        clerkUserId,
        email: email.toLowerCase() || existingUser?.email || "",
        displayName: displayName || existingUser?.displayName || ""
      };

      // Link web3 wallet as primary if the record doesn't have one yet
      if (web3Wallet) {
        if (!existingUser?.walletAddress) {
          $set.walletAddress = web3Wallet;
        }
      }

      const $addToSet = {};
      if (web3Wallet) {
        $addToSet.walletAddresses = web3Wallet;
      }

      const updateOp = { $set };
      if (Object.keys($addToSet).length > 0) {
        updateOp.$addToSet = $addToSet;
      }

      const query = existingUser
        ? { _id: existingUser._id }
        : { clerkUserId };

      await User.findOneAndUpdate(query, updateOp, {
        upsert: true,
        returnDocument: 'after',
        setDefaultsOnInsert: true
      });

      console.log(`[ClerkWebhook] User synced: clerkUserId=${clerkUserId} wallet=${web3Wallet || "none"}`);
    }

    // â”€â”€ user.deleted â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // We soft-delete by suspending, not hard-deleting, so donation history is preserved.
    else if (eventType === "user.deleted") {
      await User.findOneAndUpdate(
        { clerkUserId },
        { $set: { accountStatus: "suspended" } }
      );
      console.log(`[ClerkWebhook] User suspended on Clerk delete: clerkUserId=${clerkUserId}`);
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("[ClerkWebhook] Processing error:", error);
    return res.status(500).json({ success: false, message: "Error processing webhook" });
  }
}

module.exports = { handleClerkWebhook };
