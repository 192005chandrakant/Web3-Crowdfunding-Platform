/**
 * Contract ABIs and deployed addresses.
 * Addresses are read from Vite env vars so they can differ per network.
 */

// ─── Factory address ──────────────────────────────────────────────────────
export const FACTORY_ADDRESS =
  (import.meta.env.VITE_FACTORY_CONTRACT_ADDRESS as string) ||
  "0x4B3E9091e8A15AdcC8fcC1FCC7D6D273F4Cc2D01";

// ─── CampaignFactory ABI (minimal — only the events + functions we call) ──
export const CAMPAIGN_FACTORY_ABI = [
  // Deploy new campaign
  {
    type: "function",
    name: "createCampaign",
    stateMutability: "nonpayable",
    inputs: [
      { name: "goal",            type: "uint256" },
      { name: "hospitalAddress", type: "address" },
      { name: "titles", type: "string[]" },
      { name: "targetAmounts",   type: "uint256[]" },
      { name: "deadlines",       type: "uint256[]" }
    ],
    outputs: [{ name: "campaignAddress", type: "address" }]
  },
  // Event emitted when a campaign is created
  {
    type: "event",
    name: "CampaignCreated",
    inputs: [
      { name: "campaignAddress", type: "address", indexed: true },
      { name: "creator",         type: "address", indexed: true },
      { name: "goal",            type: "uint256", indexed: false }
    ]
  }
] as const;

// ─── Campaign contract ABI (minimal) ─────────────────────────────────────
export const CAMPAIGN_ABI = [
  // Read: public state getters on Campaign.sol
  {
    type: "function",
    name: "totalFundsRaised",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }]
  },
  {
    type: "function",
    name: "totalFundsRemaining",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }]
  },
  {
    type: "function",
    name: "fundraisingGoal",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }]
  },
  {
    type: "function",
    name: "state",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }]
  },
  {
    type: "function",
    name: "creator",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }]
  },
  {
    type: "function",
    name: "contributions",
    stateMutability: "view",
    inputs: [{ name: "", type: "address" }],
    outputs: [{ name: "", type: "uint256" }]
  },
  {
    type: "function",
    name: "milestones",
    stateMutability: "view",
    inputs: [{ name: "", type: "uint256" }],
    outputs: [
      { name: "targetAmount", type: "uint256" },
      { name: "deadline", type: "uint256" },
      { name: "approvalQVWeight", type: "uint256" },
      { name: "rejectionQVWeight", type: "uint256" },
      { name: "snapshotTotalQVWeight", type: "uint256" },
      { name: "isCurrent", type: "bool" },
      { name: "isPaid", type: "bool" },
      { name: "title", type: "string" },
      { name: "ipfsProofHash", type: "string" }
    ]
  },
  {
    type: "function",
    name: "milestoneCount",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }]
  },
  // Write
  {
    type: "function",
    name: "contribute",
    stateMutability: "payable",
    inputs: [],
    outputs: []
  },
  {
    type: "function",
    name: "submitMilestoneProof",
    stateMutability: "nonpayable",
    inputs: [
      { name: "milestoneIndex", type: "uint256" },
      { name: "ipfsCid",        type: "string" }
    ],
    outputs: []
  },
  {
    type: "function",
    name: "voteOnMilestone",
    stateMutability: "nonpayable",
    inputs: [
      { name: "milestoneIndex", type: "uint256" },
      { name: "support",        type: "bool" }
    ],
    outputs: []
  },
  {
    type: "function",
    name: "executeTranche",
    stateMutability: "nonpayable",
    inputs: [{ name: "milestoneIndex", type: "uint256" }],
    outputs: []
  },
  // Events (QV-updated — includes qvWeight and rawContribution)
  {
    type: "event",
    name: "ContributionReceived",
    inputs: [
      { name: "contributor", type: "address", indexed: true },
      { name: "amount",      type: "uint256", indexed: false },
      { name: "qvPower",     type: "uint256", indexed: false }
    ]
  },
  {
    type: "event",
    name: "MilestoneVoted",
    inputs: [
      { name: "milestoneIndex",    type: "uint256", indexed: true  },
      { name: "voter",             type: "address", indexed: true  },
      { name: "support",           type: "bool",    indexed: false },
      { name: "qvWeight",          type: "uint256", indexed: false }, // sqrt(contribution)
      { name: "rawContribution",   type: "uint256", indexed: false }  // raw wei amount
    ]
  },
  {
    type: "event",
    name: "TrancheExecuted",
    inputs: [
      { name: "milestoneIndex", type: "uint256", indexed: true },
      { name: "recipient",       type: "address", indexed: true },
      { name: "amount",          type: "uint256", indexed: false }
    ]
  },
  // QV View helpers
  {
    type: "function",
    name: "getQVPower",
    stateMutability: "view",
    inputs: [{ name: "contributor", type: "address" }],
    outputs: [
      { name: "qvPower",    type: "uint256" },
      { name: "isEligible", type: "bool"    }
    ]
  },
  {
    type: "function",
    name: "getMilestoneQVState",
    stateMutability: "view",
    inputs: [{ name: "index", type: "uint256" }],
    outputs: [
      { name: "approvalQVWeight",      type: "uint256" },
      { name: "rejectionQVWeight",     type: "uint256" },
      { name: "snapshotTotalQVWeight", type: "uint256" },
      { name: "approved",              type: "bool"    }
    ]
  },
  {
    type: "function",
    name: "getVoterStatus",
    stateMutability: "view",
    inputs: [
      { name: "milestoneIndex", type: "uint256" },
      { name: "voter",          type: "address"  }
    ],
    outputs: [
      { name: "voted",        type: "bool" },
      { name: "votedApprove", type: "bool" }
    ]
  }
] as const;
