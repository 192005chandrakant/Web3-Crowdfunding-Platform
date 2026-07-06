/**
 * Contract ABIs and deployed addresses.
 * Addresses are read from Vite env vars so they can differ per network.
 */

// ─── Factory address ──────────────────────────────────────────────────────
export const FACTORY_ADDRESS =
  (import.meta.env.VITE_FACTORY_CONTRACT_ADDRESS as string) || "";

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
  // Read
  {
    type: "function",
    name: "getState",
    stateMutability: "view",
    inputs: [],
    outputs: [
      { name: "totalFunds",     type: "uint256" },
      { name: "goal",           type: "uint256" },
      { name: "currentMilestone", type: "uint256" },
      { name: "isActive",       type: "bool" }
    ]
  },
  {
    type: "function",
    name: "getMilestone",
    stateMutability: "view",
    inputs: [{ name: "index", type: "uint256" }],
    outputs: [
      { name: "title",          type: "string" },
      { name: "targetAmount",   type: "uint256" },
      { name: "deadline",       type: "uint256" },
      { name: "isPaid",         type: "bool" },
      { name: "approvalVotes",  type: "uint256" },
      { name: "rejectionVotes", type: "uint256" },
      { name: "ipfsProofHash",  type: "string" }
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
  // Events
  {
    type: "event",
    name: "Contributed",
    inputs: [
      { name: "donor",  type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false }
    ]
  },
  {
    type: "event",
    name: "MilestoneVoted",
    inputs: [
      { name: "voter",   type: "address", indexed: true },
      { name: "index",   type: "uint256", indexed: false },
      { name: "support", type: "bool",    indexed: false }
    ]
  }
] as const;
