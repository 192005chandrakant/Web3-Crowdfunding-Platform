const { z } = require("zod");

const milestoneSchema = z.object({
  title: z.string().trim().min(1).max(140),
  targetAmount: z.number().finite().positive(),
  deadline: z.union([z.string(), z.number()]),
  proofCid: z.string().trim().optional().default("")
});

const createCampaignSchema = z.object({
  contractAddress: z.string().trim().regex(/^0x[a-fA-F0-9]{40}$/),
  creatorAddress: z.string().trim().regex(/^0x[a-fA-F0-9]{40}$/),
  title: z.string().trim().min(3).max(180),
  descriptionMarkdown: z.string().trim().min(20).max(20000),
  targetGoal: z.number().finite().positive(),
  milestones: z.array(milestoneSchema).min(1),
  category: z.string().trim().max(80).optional().default("general"),
  hospitalAddress: z.string().trim().regex(/^0x[a-fA-F0-9]{40}$/).optional().nullable()
});

const campaignAddressSchema = z.object({
  address: z.string().trim().regex(/^0x[a-fA-F0-9]{40}$/)
});

module.exports = {
  createCampaignSchema,
  campaignAddressSchema
};