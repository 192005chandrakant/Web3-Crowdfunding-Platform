const { z } = require("zod");
const { CAMPAIGN_CATEGORIES, VERIFICATION_STATUS, NOTIFICATION_TYPES, USER_ROLES, ACCOUNT_STATUSES } = require("./constants");

const DEFAULT_CHAIN_ID = Number(process.env.CHAIN_ID) || 80002;

const ethAddress = z.string().trim().regex(/^0x[a-fA-F0-9]{40}$/);

const milestoneSchema = z.object({
  title: z.string().trim().min(1).max(140),
  targetAmount: z.number().finite().positive(),
  deadline: z.union([z.string(), z.number()]),
  proofCid: z.string().trim().optional().default("")
});

const createCampaignSchema = z.object({
  contractAddress: ethAddress,
  creatorAddress: ethAddress,
  title: z.string().trim().min(3).max(180),
  descriptionMarkdown: z.string().trim().min(20).max(20000),
  targetGoal: z.number().finite().positive(),
  milestones: z.array(milestoneSchema).min(1),
  category: z.enum(CAMPAIGN_CATEGORIES).optional().default("general"),
  hospitalAddress: ethAddress.optional().nullable(),
  coverImageUrl: z.string().url().optional().nullable().or(z.literal("")).default(""),
  tags: z.array(z.string().trim().min(1).max(40)).max(12).optional().default([]),
  status: z.enum(["draft", "active", "completed", "cancelled", "suspended"]).optional().default("active"),
  chainId: z.number().int().positive().optional().default(DEFAULT_CHAIN_ID)
});

const updateCampaignSchema = z
  .object({
    title: z.string().trim().min(3).max(180).optional(),
    descriptionMarkdown: z.string().trim().min(20).max(20000).optional(),
    coverImageUrl: z.string().url().optional(),
    tags: z.array(z.string().trim().min(1).max(40)).max(12).optional(),
    status: z.enum(["draft", "active", "completed", "cancelled", "suspended"]).optional(),
    category: z.enum(CAMPAIGN_CATEGORIES).optional()
  })
  .refine((payload) => Object.keys(payload).length > 0, {
    message: "At least one field must be provided for update"
  });

const campaignAddressSchema = z.object({
  address: ethAddress
});

const listCampaignsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(50).optional().default(12),
  category: z.enum(CAMPAIGN_CATEGORIES).optional(),
  creator: ethAddress.optional(),
  search: z.string().trim().min(1).max(120).optional()
});

const listMilestoneReviewsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(50).optional().default(24),
  search: z.string().trim().min(1).max(120).optional()
});

const proofUploadMetadataSchema = z.object({
  contractAddress: ethAddress.optional(),
  milestoneIndex: z.coerce.number().int().min(0).optional()
});

const upsertUserSchema = z.object({
  walletAddress: ethAddress.optional().nullable(),
  clerkUserId: z.string().trim().min(1).max(120).optional().nullable(),
  displayName: z.string().trim().max(120).optional().default(""),
  email: z.string().email().optional().or(z.literal("")).default(""),
  role: z.enum(USER_ROLES).optional(),
  requestedRole: z.enum(USER_ROLES).optional(),
  preferences: z.object({
    notifications: z.object({
      email: z.boolean().optional(),
      donations: z.boolean().optional(),
      milestones: z.boolean().optional(),
      votes: z.boolean().optional(),
      updates: z.boolean().optional()
    }).optional(),
    privacy: z.object({
      publicProfile: z.boolean().optional(),
      showDonations: z.boolean().optional(),
      showCampaigns: z.boolean().optional()
    }).optional(),
    appearance: z.object({
      language: z.string().trim().optional(),
      currency: z.string().trim().optional(),
      theme: z.string().trim().optional()
    }).optional()
  }).optional()
});

const updateVerificationSchema = z.object({
  verificationStatus: z.enum(Object.values(VERIFICATION_STATUS)),
  verificationProvider: z.enum(["sumsub", "stripe", "world_id", "gitcoin"]).optional(),
  verificationDepositTxHash: z.string().trim().optional(),
  worldIdVerified: z.boolean().optional(),
  gitcoinPassportScore: z.number().min(0).max(100).optional()
});

const adminReviewUserSchema = z.object({
  decision: z.enum(["approve", "reject"]),
  role: z.enum(USER_ROLES).optional(),
  reviewNotes: z.string().trim().max(500).optional().default("")
});

const walletAddressParamSchema = z.object({
  walletAddress: ethAddress
});

const createNotificationSchema = z.object({
  walletAddress: ethAddress,
  type: z.enum(Object.values(NOTIFICATION_TYPES)),
  title: z.string().trim().min(1).max(180),
  message: z.string().trim().min(1).max(2000),
  metadata: z.record(z.string(), z.unknown()).optional().default({}),
  sendEmail: z.boolean().optional().default(false)
});

const notificationIdSchema = z.object({
  id: z.string().trim().min(1)
});

const createDonationSchema = z.object({
  walletAddress: ethAddress,
  campaignAddress: ethAddress,
  amount: z.string().trim().min(1),
  amountWei: z.string().trim().min(1),
  txHash: z.string().trim().regex(/^0x[a-fA-F0-9]{64}$/),
  chainId: z.number().int().positive().optional().default(80002),
  blockNumber: z.number().int().min(0).optional().nullable(),
  status: z.enum(["confirmed", "pending", "failed"]).optional().default("confirmed")
});

const listDonationsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(50).optional().default(12)
});

const campaignAddressParamSchema = z.object({
  campaignAddress: ethAddress
});

const BLOCKCHAIN_EVENT_NAMES = [
  "ContributionReceived",
  "MilestoneProofSubmitted",
  "MilestoneVoted",
  "TrancheExecuted",
  "RefundClaimed",
  "CampaignCreated"
];

const blockchainEventSchema = z.object({
  eventName: z.enum(BLOCKCHAIN_EVENT_NAMES),
  contractAddress: ethAddress,
  txHash: z.string().trim().regex(/^0x[a-fA-F0-9]{64}$/),
  blockNumber: z.number().int().min(0),
  chainId: z.number().int().positive().optional().default(DEFAULT_CHAIN_ID),
  data: z.record(z.string(), z.unknown()).optional().default({})
});

const blockchainEventBatchSchema = z.object({
  events: z.array(blockchainEventSchema).min(1).max(100)
});

const listEventsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  eventName: z.enum(BLOCKCHAIN_EVENT_NAMES).optional(),
  contractAddress: ethAddress.optional(),
  processed: z.enum(["true", "false"]).optional()
});

const adminListUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
  role: z.enum(USER_ROLES).optional(),
  accountStatus: z.enum(ACCOUNT_STATUSES).optional(),
  search: z.string().trim().min(1).max(120).optional()
});

const adminUpdateRoleSchema = z.object({
  role: z.enum(USER_ROLES)
});

const adminFlagCampaignSchema = z.object({
  flagged: z.boolean(),
  flagReason: z.string().trim().max(500).optional().default("")
});

const adminUpdateCampaignStatusSchema = z.object({
  status: z.enum(["draft", "active", "completed", "cancelled", "suspended"])
});

const adminPaginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20)
});

const adminLedgerQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(25),
  search: z.string().trim().min(1).max(120).optional(),
  status: z.enum(["confirmed", "pending", "failed"]).optional(),
  type: z.enum(["donation", "refund", "release"]).optional()
});

const adminAuditLogQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(25),
  action: z.enum([
    "user_role_updated",
    "user_verification_updated",
    "campaign_flagged",
    "campaign_unflagged",
    "campaign_status_updated",
    "admin_seeded"
  ]).optional(),
  resourceType: z.enum(["user", "campaign", "platform"]).optional(),
  search: z.string().trim().min(1).max(120).optional()
});

// ── Campaign stats / donor list schemas ─────────────────────────────────────

const campaignStatsParamSchema = z.object({
  address: ethAddress
});

const campaignDonorsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20)
});

const recentDonationsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(20).optional().default(10)
});

const creatorAddressParamSchema = z.object({
  creatorAddress: ethAddress
});

module.exports = {
  createCampaignSchema,
  updateCampaignSchema,
  campaignAddressSchema,
  listCampaignsQuerySchema,
  listMilestoneReviewsQuerySchema,
  proofUploadMetadataSchema,
  upsertUserSchema,
  updateVerificationSchema,
  adminReviewUserSchema,
  walletAddressParamSchema,
  createNotificationSchema,
  notificationIdSchema,
  createDonationSchema,
  listDonationsQuerySchema,
  campaignAddressParamSchema,
  blockchainEventSchema,
  blockchainEventBatchSchema,
  listEventsQuerySchema,
  adminListUsersQuerySchema,
  adminUpdateRoleSchema,
  adminFlagCampaignSchema,
  adminUpdateCampaignStatusSchema,
  adminPaginationQuerySchema,
  adminLedgerQuerySchema,
  adminAuditLogQuerySchema,
  campaignStatsParamSchema,
  campaignDonorsQuerySchema,
  recentDonationsQuerySchema,
  creatorAddressParamSchema
};

