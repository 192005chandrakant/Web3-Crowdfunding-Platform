require("dotenv").config();

const { connectDatabase } = require("../src/config/db");
const { getEnvConfig } = require("../src/config/env");
const User = require("../src/models/User");
const { VERIFICATION_STATUS } = require("../src/config/constants");

function getAllowlistedAdmins() {
  return (process.env.ADMIN_WALLET_ADDRESSES || "")
    .split(",")
    .map((address) => address.trim().toLowerCase())
    .filter(Boolean);
}

async function seedAdminUsers() {
  const env = getEnvConfig();
  const allowlistedAdmins = getAllowlistedAdmins();

  if (allowlistedAdmins.length === 0) {
    throw new Error("ADMIN_WALLET_ADDRESSES is empty. Nothing to seed.");
  }

  await connectDatabase(env.mongoUri);

  for (const walletAddress of allowlistedAdmins) {
    const user = await User.findOneAndUpdate(
      { walletAddress },
      {
        $set: {
          walletAddress,
          role: "admin",
          displayName: "Platform Admin",
          verificationStatus: VERIFICATION_STATUS.VERIFIED
        }
      },
      { new: true, upsert: true }
    ).lean();

    console.log(`Seeded admin user: ${user.walletAddress}`);
  }
}

seedAdminUsers()
  .then(() => {
    console.log("Admin seeding completed successfully.");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Admin seeding failed:", error);
    process.exit(1);
  });