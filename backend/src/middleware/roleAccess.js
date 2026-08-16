const User = require("../models/User");

async function loadCurrentUser(req) {
  if (req.clerkUserId) {
    const byClerk = await User.findOne({ clerkUserId: req.clerkUserId }).lean();
    if (byClerk) {
      return byClerk;
    }
  }

  if (req.walletAddress) {
    const wallet = req.walletAddress.toLowerCase();
    const byWallet = await User.findOne({
      $or: [{ walletAddress: wallet }, { walletAddresses: wallet }]
    }).lean();
    if (byWallet) {
      return byWallet;
    }
  }

  return null;
}

function requireRole(requiredRoles, options = {}) {
  const allowedRoles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
  const requireActive = options.requireActive !== false;
  const allowAdmin = options.allowAdmin !== false;

  return async function roleGate(req, res, next) {
    try {
      const user = await loadCurrentUser(req);

      if (!user) {
        return res.status(403).json({ success: false, message: "Account profile is required for this action" });
      }

      if (requireActive && user.accountStatus !== "active") {
        return res.status(403).json({
          success: false,
          message: `Account status must be active before accessing ${allowedRoles.join("/")} features`
        });
      }

      if (!allowedRoles.includes(user.role) && !(allowAdmin && user.role === "admin")) {
        return res.status(403).json({
          success: false,
          message: `This action requires one of these roles: ${allowedRoles.join(", ")}`
        });
      }

      req.currentUser = user;
      next();
    } catch (error) {
      next(error);
    }
  };
}

async function requireRegisteredUser(req, res, next) {
  try {
    const user = await loadCurrentUser(req);

    if (!user) {
      return res.status(403).json({
        success: false,
        message: "Registered platform account is required"
      });
    }

    if (user.accountStatus !== "active") {
      return res.status(403).json({
        success: false,
        message: "Account must be active to access the platform ledger"
      });
    }

    req.currentUser = user;
    next();
  } catch (error) {
    next(error);
  }
}

module.exports = {
  loadCurrentUser,
  requireRole,
  requireRegisteredUser
};
