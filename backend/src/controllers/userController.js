const User = require("../models/User");
const { VERIFICATION_STATUS } = require("../config/constants");

async function upsertUser(req, res) {
  const payload = req.validated.body;

  const user = await User.findOneAndUpdate(
    { walletAddress: payload.walletAddress.toLowerCase() },
    {
      $set: {
        clerkUserId: payload.clerkUserId ?? null,
        displayName: payload.displayName,
        email: payload.email,
        role: payload.role
      }
    },
    { new: true, upsert: true }
  ).lean();

  res.status(201).json({ success: true, user });
}

async function getUserByWallet(req, res) {
  const { walletAddress } = req.validated.params;
  const user = await User.findOne({ walletAddress: walletAddress.toLowerCase() }).lean();

  if (!user) {
    return res.status(404).json({ success: false, message: "User not found" });
  }

  res.json({ success: true, user });
}

async function updateVerification(req, res) {
  const { walletAddress } = req.validated.params;
  const updates = req.validated.body;

  const user = await User.findOne({ walletAddress: walletAddress.toLowerCase() });
  if (!user) {
    return res.status(404).json({ success: false, message: "User not found" });
  }

  if (updates.verificationStatus === VERIFICATION_STATUS.VERIFIED && user.role === "donor") {
    user.role = "creator";
  }

  Object.assign(user, updates);
  await user.save();

  res.json({ success: true, user: user.toObject() });
}

module.exports = {
  upsertUser,
  getUserByWallet,
  updateVerification
};
