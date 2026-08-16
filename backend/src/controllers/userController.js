const User = require("../models/User");
const { VERIFICATION_STATUS, ROLES_REQUIRING_ADMIN_REVIEW } = require("../config/constants");

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getAdminWalletAllowlist() {
  return (process.env.ADMIN_WALLET_ADDRESSES || "")
    .split(",")
    .map((a) => a.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Determine the role/accountStatus defaults based on requested role and wallet.
 * Admin allowlisted wallets always get the admin role with active status.
 * Roles requiring review get pending_review until an admin approves them.
 */
function resolveRoleDefaults(wallet, persistedRole, requestedRole) {
  const allowlist = getAdminWalletAllowlist();
  const normalizedWallet = (wallet || "").toLowerCase();

  // Admin allowlist: always grant admin immediately
  if (normalizedWallet && allowlist.includes(normalizedWallet)) {
    return { role: "admin", requestedRole: "admin", accountStatus: "active" };
  }

  const effective = requestedRole || persistedRole || "donor";

  // Roles that need admin approval before going active
  if (ROLES_REQUIRING_ADMIN_REVIEW.includes(effective)) {
    return {
      role: persistedRole || "donor",  // keep current role until approved
      requestedRole: effective,
      accountStatus: "pending_review"
    };
  }

  // Donor and any unknown role → immediately active
  return {
    role: effective,
    requestedRole: effective,
    accountStatus: "active"
  };
}

function resolveRoleChangeForExisting(wallet, existingUser, requestedRole) {
  const allowlist = getAdminWalletAllowlist();
  const normalizedWallet = (wallet || existingUser?.walletAddress || "").toLowerCase();
  const currentRole = existingUser?.role || "donor";
  const currentStatus = existingUser?.accountStatus || "active";
  const desiredRole = requestedRole || existingUser?.requestedRole || currentRole;

  if (normalizedWallet && allowlist.includes(normalizedWallet)) {
    return { role: "admin", requestedRole: "admin", accountStatus: "active" };
  }

  if (desiredRole === "admin") {
    return {
      role: currentRole === "admin" ? "admin" : currentRole,
      requestedRole: existingUser?.requestedRole || currentRole,
      accountStatus: currentStatus
    };
  }

  if (currentStatus === "suspended") {
    return {
      role: currentRole,
      requestedRole: existingUser?.requestedRole || currentRole,
      accountStatus: currentStatus
    };
  }

  if (desiredRole === currentRole && currentStatus === "active") {
    return {
      role: currentRole,
      requestedRole: existingUser?.requestedRole || currentRole,
      accountStatus: currentStatus
    };
  }

  return resolveRoleDefaults(normalizedWallet, currentRole, desiredRole);
}

/**
 * Build a minimal user shell for new (not-yet-persisted) users.
 */
function buildUserShell({ walletAddress, clerkUserId, role, requestedRole, accountStatus }) {
  return {
    walletAddress: walletAddress || null,
    clerkUserId: clerkUserId || null,
    displayName: "",
    email: "",
    role,
    requestedRole,
    accountStatus,
    hasOnboarded: false,
    actionHistory: { donated: false, createdCampaign: false },
    verificationStatus: VERIFICATION_STATUS.UNVERIFIED,
    worldIdVerified: false,
    gitcoinPassportScore: 0,
    walletAddresses: walletAddress ? [walletAddress.toLowerCase()] : [],
    preferences: {
      notifications: { email: true, donations: true, milestones: true, votes: true, updates: false },
      privacy: { publicProfile: true, showDonations: true, showCampaigns: true },
      appearance: { language: "en", currency: "USD", theme: "dark" }
    }
  };
}

// ─── Multi-wallet identity resolution ────────────────────────────────────────
/**
 * Find an existing user by: clerkUserId (primary) OR wallet (primary OR in walletAddresses[]).
 * This prevents duplicate accounts when a user connects a new wallet to an existing Clerk account.
 */
async function findExistingUser(wallet, clerkUserId) {
  const orConditions = [];

  if (clerkUserId) {
    orConditions.push({ clerkUserId });
  }
  if (wallet) {
    orConditions.push({ walletAddress: wallet });
    orConditions.push({ walletAddresses: wallet });
  }

  if (orConditions.length === 0) return null;
  return User.findOne({ $or: orConditions }).lean();
}

// ─── upsertUser ──────────────────────────────────────────────────────────────
/**
 * POST /api/users
 * Creates or updates the user record for the current session.
 *
 * Identity contract:
 *   - clerkUserId is the stable primary key when present.
 *   - walletAddress may change between sessions (multi-wallet).
 *   - A new wallet is pushed into walletAddresses[] without losing the old one.
 *   - hasOnboarded gates the role-selection UI on the frontend.
 *
 * Role contract:
 *   - NEW users (hasOnboarded=false): role from requestedRole payload.
 *   - RETURNING users (hasOnboarded=true): NEVER overwrite committed role from payload.
 */
async function upsertUser(req, res) {
  const payload = req.validated ? req.validated.body : req.body;

  if (!payload.walletAddress && !payload.clerkUserId) {
    return res.status(400).json({ success: false, message: "walletAddress or clerkUserId is required" });
  }

  const wallet = payload.walletAddress ? payload.walletAddress.toLowerCase() : null;
  const clerkUserId = payload.clerkUserId || null;

  // ── Identify existing record (multi-wallet aware) ──
  const existingUser = await findExistingUser(wallet, clerkUserId);

  // ── Role resolution ──
  let roleUpdate;
  if (existingUser && existingUser.hasOnboarded) {
    const desiredRole = payload.requestedRole || payload.role;
    roleUpdate = desiredRole
      ? resolveRoleChangeForExisting(wallet, existingUser, desiredRole)
      : {
          role: existingUser.role,
          requestedRole: existingUser.requestedRole || existingUser.role,
          accountStatus: existingUser.accountStatus || "active"
        };
  } else {
    // New user OR first onboarding submission
    const desiredRole = payload.requestedRole || payload.role || "donor";
    roleUpdate = resolveRoleDefaults(wallet || existingUser?.walletAddress, existingUser?.role, desiredRole);
  }

  // ── Determine hasOnboarded ──
  // Mark as onboarded if the payload includes an explicit role selection
  // (i.e., the user submitted the onboarding form, not just an auth sync).
  const isOnboardingSubmit = Boolean(payload.requestedRole || payload.role);
  const hasOnboarded = existingUser?.hasOnboarded || isOnboardingSubmit;

  // ── Wallet array management ──
  // Build the $addToSet for walletAddresses to support multi-wallet.
  const walletArrayOps = {};
  if (wallet) {
    walletArrayOps["$addToSet"] = { walletAddresses: wallet };
  }

  // ── Build update fields ──
  const updateFields = {
    // Identity
    walletAddress: wallet || existingUser?.walletAddress || undefined,
    clerkUserId: clerkUserId || existingUser?.clerkUserId || null,
    // Profile (only update if provided)
    displayName: payload.displayName !== undefined ? payload.displayName : (existingUser?.displayName || ""),
    email: payload.email !== undefined ? payload.email : (existingUser?.email || ""),
    // Role
    ...roleUpdate,
    // Gate
    hasOnboarded
  };

  if (!updateFields.walletAddress) {
    delete updateFields.walletAddress;
  }

  // ── Merge preferences granularly ──
  if (payload.preferences) {
    if (payload.preferences.notifications) {
      updateFields["preferences.notifications"] = {
        ...(existingUser?.preferences?.notifications || {}),
        ...payload.preferences.notifications
      };
    }
    if (payload.preferences.privacy) {
      updateFields["preferences.privacy"] = {
        ...(existingUser?.preferences?.privacy || {}),
        ...payload.preferences.privacy
      };
    }
    if (payload.preferences.appearance) {
      updateFields["preferences.appearance"] = {
        ...(existingUser?.preferences?.appearance || {}),
        ...payload.preferences.appearance
      };
    }
  }

  // ── Build the update operation (combine $set and $addToSet safely) ──
  const updateOp = { $set: updateFields };
  if (wallet) {
    updateOp["$addToSet"] = { walletAddresses: wallet };
  }

  const query = {};
  if (existingUser) {
    // Update by _id for atomicity
    query._id = existingUser._id;
  } else {
    // Upsert via clerkUserId or wallet
    if (clerkUserId) query.clerkUserId = clerkUserId;
    else if (wallet) query.walletAddress = wallet;
  }

  const user = await User.findOneAndUpdate(
    query,
    updateOp,
    { new: true, upsert: true }
  ).lean();

  res.status(200).json({ success: true, user });
}

// ─── getUserByWallet ──────────────────────────────────────────────────────────
async function getUserByWallet(req, res) {
  const { walletAddress } = req.validated ? req.validated.params : req.params;
  const wallet = walletAddress.toLowerCase();

  // Look in both walletAddress field and walletAddresses array
  let user = await User.findOne({
    $or: [{ walletAddress: wallet }, { walletAddresses: wallet }]
  }).lean();

  if (!user) {
    const defaults = resolveRoleDefaults(wallet, null, "donor");
    user = buildUserShell({
      walletAddress: wallet,
      role: defaults.role,
      requestedRole: defaults.requestedRole,
      accountStatus: defaults.accountStatus
    });
    return res.json({ success: true, exists: false, user });
  }

  // Re-run admin allowlist check (allowlist is env-level, always authoritative)
  const defaults = resolveRoleDefaults(wallet, user.role, user.requestedRole || user.role);
  if (defaults.role === "admin" && user.role !== "admin") {
    // Allowlisted admin — reflect runtime role without persisting (admin set it already)
    user = { ...user, role: "admin", accountStatus: "active" };
  }

  res.json({ success: true, exists: true, user });
}

// ─── getCurrentUser ───────────────────────────────────────────────────────────
/**
 * GET /api/users/me
 * Resolves current user from Clerk token (req.clerkUserId + req.walletAddress set by middleware).
 */
async function getCurrentUser(req, res) {
  const walletAddress = req.walletAddress ? req.walletAddress.toLowerCase() : null;
  const clerkUserId = req.clerkUserId || null;

  const user = await findExistingUser(walletAddress, clerkUserId);

  if (!user) {
    return res.json({
      success: true,
      exists: false,
      user: buildUserShell({
        walletAddress: walletAddress || "",
        clerkUserId,
        role: "donor",
        requestedRole: "donor",
        accountStatus: "active"
      })
    });
  }

  // Apply admin allowlist check at runtime
  let effectiveRole = user.role;
  if (walletAddress && getAdminWalletAllowlist().includes(walletAddress)) {
    effectiveRole = "admin";
  }

  res.json({
    success: true,
    exists: true,
    user: { ...user, role: effectiveRole }
  });
}

// ─── updateVerification ───────────────────────────────────────────────────────
async function updateVerification(req, res) {
  const { walletAddress } = req.validated ? req.validated.params : req.params;
  const updates = req.validated ? req.validated.body : req.body;

  const user = await User.findOne({
    $or: [{ walletAddress: walletAddress.toLowerCase() }, { walletAddresses: walletAddress.toLowerCase() }]
  });

  if (!user) {
    return res.status(404).json({ success: false, message: "User not found" });
  }

  Object.assign(user, updates);
  await user.save();
  res.json({ success: true, user: user.toObject() });
}

module.exports = {
  upsertUser,
  getUserByWallet,
  getCurrentUser,
  updateVerification
};
