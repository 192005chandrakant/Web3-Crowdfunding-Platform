const { z } = require("zod");
const { CAMPAIGN_CATEGORIES, VERIFICATION_STATUS, NOTIFICATION_TYPES } = require("./constants");

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
  chainId: z.number().int().positive().optional().default(80002)
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

const proofUploadMetadataSchema = z.object({
  contractAddress: ethAddress.optional(),
  milestoneIndex: z.coerce.number().int().min(0).optional()
});

const upsertUserSchema = z.object({
  walletAddress: ethAddress.optional().nullable(),
  clerkUserId: z.string().trim().min(1).max(120).optional().nullable(),
  displayName: z.string().trim().max(120).optional().default(""),
  email: z.string().email().optional().default(""),
  role: z.enum(["donor", "creator", "admin"]).optional().default("donor")
});

const updateVerificationSchema = z.object({
  verificationStatus: z.enum(Object.values(VERIFICATION_STATUS)),
  verificationProvider: z.enum(["sumsub", "stripe", "world_id", "gitcoin"]).optional(),
  verificationDepositTxHash: z.string().trim().optional(),
  worldIdVerified: z.boolean().optional(),
  gitcoinPassportScore: z.number().min(0).max(100).optional()
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
  chainId: z.number().int().positive().optional().default(80002),
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
  role: z.enum(["donor", "creator", "admin"]).optional(),
  search: z.string().trim().min(1).max(120).optional()
});

const adminUpdateRoleSchema = z.object({
  role: z.enum(["donor", "creator", "admin"])
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

module.exports = {
  createCampaignSchema,
  updateCampaignSchema,
  campaignAddressSchema,
  listCampaignsQuerySchema,
  proofUploadMetadataSchema,
  upsertUserSchema,
  updateVerificationSchema,
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
  adminPaginationQuerySchema
};
