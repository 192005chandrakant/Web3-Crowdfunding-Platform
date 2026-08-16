const User = require("../models/User");

/**
 * Admin authorization middleware.
 * Must be used AFTER requireSiweAuth so that req.walletAddress is set.
 *
 * Checks admin status via two methods:
 * 1. User model has role === "admin" in MongoDB
 * 2. Wallet address is listed in ADMIN_WALLET_ADDRESSES env var (comma-separated)
 */
async function requireAdmin(req, res, next) {
  try {
    const wallet = req.walletAddress;

    if (!wallet) {
      return res.status(401).json({
        success: false,
        message: "Authentication required before admin check"
      });
    }

    // Check database role
    const user = await User.findOne({ walletAddress: wallet.toLowerCase() }).lean();
    if (user && user.role === "admin" && user.accountStatus !== "suspended" && user.accountStatus !== "rejected") {
      req.isAdmin = true;
      return next();
    }

    // Bootstrap fallback: allowlisted wallets can seed the first admin account.
    const envAdmins = process.env.ADMIN_WALLET_ADDRESSES;
    if (envAdmins) {
      const adminList = envAdmins
        .split(",")
        .map((addr) => addr.trim().toLowerCase())
        .filter((addr) => addr.length > 0);

      if (adminList.includes(wallet.toLowerCase())) {
        req.isAdmin = true;
        return next();
      }
    }

    return res.status(403).json({
      success: false,
      message: "Admin access required"
    });
  } catch (error) {
    next(error);
  }
}

module.exports = { requireAdmin };
