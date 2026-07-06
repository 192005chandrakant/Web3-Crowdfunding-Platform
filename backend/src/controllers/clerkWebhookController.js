const { Webhook } = require("svix");
const User = require("../models/User");
const { getEnvConfig } = require("../config/env");

async function handleClerkWebhook(req, res) {
  const env = getEnvConfig();
  const WEBHOOK_SECRET = env.clerk.webhookSecret;

  if (!WEBHOOK_SECRET) {
    console.error("Please add CLERK_WEBHOOK_SECRET from Clerk Dashboard to .env");
    return res.status(500).json({ success: false, message: "Server misconfiguration" });
  }

  // Get the headers
  const svix_id = req.headers["svix-id"];
  const svix_timestamp = req.headers["svix-timestamp"];
  const svix_signature = req.headers["svix-signature"];

  // If there are no Svix headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return res.status(400).json({
      success: false,
      message: "Error occured -- no svix headers",
    });
  }

  // Get the body
  const payload = req.body.toString("utf8");
  const headers = {
    "svix-id": svix_id,
    "svix-timestamp": svix_timestamp,
    "svix-signature": svix_signature,
  };

  // Create a new Webhook instance with your secret
  const wh = new Webhook(WEBHOOK_SECRET);

  let evt;

  // Verify the payload with the headers
  try {
    evt = wh.verify(payload, headers);
  } catch (err) {
    console.error("Error verifying webhook:", err.message);
    return res.status(400).json({
      success: false,
      message: "Error verifying webhook",
    });
  }

  // Get the ID and type
  const { id } = evt.data;
  const eventType = evt.type;

  console.log(`Webhook with an ID of ${id} and type of ${eventType}`);
  console.log("Webhook body:", evt.data);

  try {
    if (eventType === "user.created" || eventType === "user.updated") {
      const email = evt.data.email_addresses?.[0]?.email_address || "";
      const displayName = evt.data.first_name 
        ? `${evt.data.first_name} ${evt.data.last_name || ""}`.trim() 
        : evt.data.username || "";
      const web3Wallet = evt.data.web3_wallets?.[0]?.web3_wallet?.toLowerCase() || null;

      await User.findOneAndUpdate(
        { clerkUserId: id },
        {
          clerkUserId: id,
          email: email,
          displayName: displayName,
          ...(web3Wallet ? { walletAddress: web3Wallet } : {}),
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    } else if (eventType === "user.deleted") {
      await User.findOneAndDelete({ clerkUserId: id });
    }
    
    return res.status(200).json({ success: true, message: "Webhook received" });
  } catch (error) {
    console.error("Error processing webhook:", error);
    return res.status(500).json({ success: false, message: "Error processing webhook" });
  }
}

module.exports = {
  handleClerkWebhook
};
