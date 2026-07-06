export interface ApiMilestone {
  title: string;
  targetAmount: number;
  deadline: string;
  proofCid?: string;
}

export interface ApiCampaign {
  contractAddress: string;
  creatorAddress: string;
  title: string;
  descriptionMarkdown: string;
  targetGoal: number;
  milestones: ApiMilestone[];
  category: string;
  hospitalAddress?: string | null;
  coverImageUrl?: string;
  tags?: string[];
  status?: string;
  chainId?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface OnChainMilestone {
  index: number;
  title: string;
  targetAmount: string;
  deadline: string;
  ipfsProofHash: string;
  approvalVotes: string;
  rejectionVotes: string;
  isCurrent: boolean;
  isPaid: boolean;
}

export interface BlockchainState {
  contractAddress: string;
  synced: boolean;
  totalFundsRaised: string | null;
  totalFundsRemaining: string | null;
  fundraisingGoal: string | null;
  latestMilestoneStatus: string;
  milestones: OnChainMilestone[];
}

export interface CampaignDetailResponse {
  success: boolean;
  campaign: ApiCampaign;
  blockchainState: BlockchainState;
}

export interface CampaignListResponse {
  success: boolean;
  items: ApiCampaign[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CreateCampaignPayload {
  contractAddress: string;
  creatorAddress: string;
  title: string;
  descriptionMarkdown: string;
  targetGoal: number;
  milestones: ApiMilestone[];
  category?: string;
  hospitalAddress?: string | null;
  coverImageUrl?: string;
  tags?: string[];
  chainId?: number;
}

export interface UploadProofResponse {
  success: boolean;
  cid: string;
  fileName: string;
  ipfsUrl: string;
  gatewayUrl: string;
  campaign?: ApiCampaign;
}

export interface ApiUser {
  walletAddress: string;
  clerkUserId?: string | null;
  displayName?: string;
  email?: string;
  role?: string;
  verificationStatus?: string;
}

export interface SiweAuthPayload {
  message: string;
  signature: string;
  address: string;
}

export interface ApiError {
  success: false;
  message: string;
  details?: unknown;
}
