const { createSchema } = require("graphql-yoga");
const Campaign = require("../models/Campaign");
const { getCampaignFromCache, cacheCampaign } = require("../services/cacheService");
const { fetchOnChainCampaignState } = require("../services/blockchainService");

const typeDefs = /* GraphQL */ `
  type Milestone {
    title: String!
    targetAmount: Float!
    deadline: String!
    proofCid: String
  }

  type OnChainMilestone {
    index: Int!
    title: String!
    targetAmount: String!
    deadline: String!
    ipfsProofHash: String!
    approvalQVWeight: String!
    rejectionQVWeight: String!
    snapshotTotalQVWeight: String!
    isCurrent: Boolean!
    isPaid: Boolean!
  }

  type BlockchainState {
    contractAddress: String!
    synced: Boolean!
    totalFundsRaised: String
    totalFundsRemaining: String
    fundraisingGoal: String
    latestMilestoneStatus: String!
    milestones: [OnChainMilestone!]!
  }

  type Campaign {
    contractAddress: String!
    creatorAddress: String!
    title: String!
    descriptionMarkdown: String!
    targetGoal: Float!
    milestones: [Milestone!]!
    category: String!
    hospitalAddress: String
    coverImageUrl: String
    tags: [String!]!
    status: String!
    chainId: Int!
  }

  type CampaignDetail {
    campaign: Campaign!
    blockchainState: BlockchainState!
  }

  type CampaignList {
    items: [Campaign!]!
    total: Int!
    page: Int!
    limit: Int!
  }

  type HealthResponse {
    status: String!
  }

  type Query {
    health: HealthResponse!
    campaigns(page: Int = 1, limit: Int = 12, category: String, search: String): CampaignList!
    campaign(address: String!): CampaignDetail
  }
`;

const resolvers = {
  Query: {
    health: () => ({ status: "ok" }),
    campaigns: async (_parent, { page = 1, limit = 12, category, search }) => {
      const filter = {};
      if (category) {
        filter.category = category;
      }
      if (search) {
        filter.$or = [
          { title: { $regex: search, $options: "i" } },
          { descriptionMarkdown: { $regex: search, $options: "i" } }
        ];
      }

      const safeLimit = Math.min(Math.max(limit, 1), 50);
      const safePage = Math.max(page, 1);
      const skip = (safePage - 1) * safeLimit;

      const [items, total] = await Promise.all([
        Campaign.find(filter).sort({ createdAt: -1 }).skip(skip).limit(safeLimit).lean(),
        Campaign.countDocuments(filter)
      ]);

      return { items, total, page: safePage, limit: safeLimit };
    },
    campaign: async (_parent, { address }) => {
      const normalized = address.toLowerCase();
      let campaign = await getCampaignFromCache(normalized);

      if (!campaign) {
        campaign = await Campaign.findOne({ contractAddress: normalized }).lean();
        if (campaign) {
          await cacheCampaign(normalized, campaign);
        }
      }

      if (!campaign) {
        return null;
      }

      let blockchainState;
      try {
        blockchainState = await fetchOnChainCampaignState(normalized);
      } catch {
        blockchainState = {
          contractAddress: normalized,
          synced: false,
          totalFundsRaised: null,
          totalFundsRemaining: null,
          fundraisingGoal: null,
          latestMilestoneStatus: "rpc_unavailable",
          milestones: []
        };
      }

      return { campaign, blockchainState };
    }
  }
};

const schema = createSchema({
  typeDefs,
  resolvers
});

module.exports = { schema };
