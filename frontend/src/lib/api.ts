/**
 * Backend API client.
 * Base URL from VITE_BACKEND_URL (defaults to localhost:5000).
 */
import type { SiwePayload } from "@/store/authStore";
import type { CampaignCardData } from "@/components/CampaignCard";

const BASE_URL =
  (import.meta.env.VITE_BACKEND_URL as string) || "http://localhost:5000";

// ─── Campaign interfaces ────────────────────────────────────────────────────

export interface ApiMilestone {
  title: string;
  targetAmount: number;
  deadline: string;
  proofCid?: string;
  isPaid?: boolean;
  payoutTxHash?: string;
  payoutRecipient?: string;
  payoutAmountWei?: string;
  payoutAmountPOL?: string;
  payoutReleasedAt?: string | null;
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
  chainId?: number;
  coverImageUrl?: string | null;
  status?: string;
  flagged?: boolean;
  isFlagged?: boolean;
  flagReason?: string;
  createdAt?: string;
  totalRaised?: string;
  totalRaisedWei?: string;
  donorCount?: number;
  donationCount?: number;
  progressPercentage?: number;
}

export interface BlockchainMilestoneState {
  index: number;
  title: string;
  targetAmount: string;
  deadline?: string;
  isPaid: boolean;
  isCurrent: boolean;
  approvalVotes: string | number;
  rejectionVotes: string | number;
  ipfsProofHash?: string;
}

export interface CampaignDetailResponse {
  success?: boolean;
  campaign: ApiCampaign;
  blockchainState: {
    contractAddress?: string;
    synced: boolean;
    totalFundsRaised: string | null;
    totalFundsRemaining?: string | null;
    fundraisingGoal: string | null;
    latestMilestoneStatus: string;
    milestones: BlockchainMilestoneState[];
  };
}

export interface CampaignListResponse {
  success?: boolean;
  items: ApiCampaign[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface MilestoneReviewItem {
  id: string;
  campaignAddress: string;
  campaignTitle: string;
  creatorAddress: string;
  category?: string;
  coverImageUrl?: string;
  milestoneIndex: number;
  milestoneTitle: string;
  targetAmount: number;
  deadline: string;
  proofCid: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface MilestoneReviewsResponse {
  success: boolean;
  items: MilestoneReviewItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ─── Donation interfaces ────────────────────────────────────────────────────

export interface ApiDonation {
  _id: string;
  walletAddress: string;
  campaignAddress: string;
  amount: string;
  amountWei: string;
  txHash: string;
  chainId: number;
  status: string;
  createdAt: string;
  campaign?: {
    title: string;
    coverImageUrl?: string;
    category: string;
  };
}

export interface DonationListResponse {
  success: boolean;
  items: ApiDonation[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface DonationStatsResponse {
  success: boolean;
  stats: {
    totalDonations: number;
    uniqueCampaignCount: number;
    totalAmountWei: string;
  };
}

export interface EnrichedCampaign extends ApiCampaign {
  totalRaised?: string;
  donorCount?: number;
  donationCount?: number;
  progressPercentage?: number;
  requiresProofUpload?: boolean;
}

export interface CreatorDashboardResponse {
  success: boolean;
  creatorStats: {
    totalCampaigns: number;
    activeCampaigns: number;
    completedCampaigns: number;
    totalTargetGoal: number;
    totalRaised: string;
    totalUniqueDonors: number;
    pendingProofCount: number;
  };
  campaigns: EnrichedCampaign[];
}

export interface EnrichedDonation extends ApiDonation {
  qvPower?: string;
  campaign?: {
    title: string;
    coverImageUrl?: string;
    category: string;
    status?: string;
    isVotingActive?: boolean;
  };
}

export interface DonorPortfolioResponse {
  success: boolean;
  portfolioStats: {
    totalContributions: number;
    vaultsSupported: number;
    totalContributed: string;
    totalQuadraticVotingPower: string;
    activeGovernanceGatesCount: number;
    categoryBreakdown: Record<string, { amount: string; percentage: number }>;
  };
  donations: EnrichedDonation[];
}

// ─── Quadratic Voting interfaces ────────────────────────────────────────────

export interface QVEligibilityResponse {
  success: boolean;
  eligible: boolean;
  hasVoted: boolean;
  voteDirection: "approve" | "reject" | null;
  reason: string;
  qvPower: string;
  qvPowerDisplay: string;        // e.g., "10.0000"
  donationTotalWei: string;
  donationTotalPOL: string;      // e.g., "100.0000"
  isSybilSafe: boolean;
  verificationLevel: string;     // "none" | "unverified" | "gitcoin" | "world_id"
  minThresholdWei: string;
  minThresholdDisplay: string;   // e.g., "0.0010 POL"
}

export interface QVStatsResponse {
  success: boolean;
  totalQVWeight: string;
  approvalQVWeight: string;
  rejectionQVWeight: string;
  approvalQVDisplay: string;     // human-readable (e.g., "10.0000")
  rejectionQVDisplay: string;
  totalVoters: number;
  approvalVoterCount: number;
  rejectionVoterCount: number;
  eligibleVoterCount: number;
  approved: boolean;
  approvalPercent: number;       // 0-100
  rejectionPercent: number;      // 0-100
  participationPercent: number;  // 0-100
}

export interface QVVoteStatus {
  success: boolean;
  hasVoted: boolean;
  support: boolean | null;
  qvPower: string;
  qvPowerDisplay: string;
  txHash: string | null;
}

export interface QVVoteItem {
  id: string;
  voterDisplay: string;          // e.g., "0x1234…5678"
  support: boolean;
  qvPower: string;
  qvPowerDisplay: string;
  createdAt: string;
}

export interface QVVotesListResponse {
  success: boolean;
  items: QVVoteItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface QVDonorItem {
  voterDisplay: string;
  totalPOL: string;
  qvPowerDisplay: string;
  donationCount: number;
  isEligibleToVote: boolean;
}

export interface QVDonorsResponse {
  success: boolean;
  items: QVDonorItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ─── Platform stats / health interfaces ────────────────────────────────────

export interface PlatformStatsResponse {
  success: boolean;
  stats: {
    campaigns: {
      total: number;
      active: number;
      totalGoalAmount: number;
      avgGoal: number;
      categories: Record<string, number>;
    };
    donations: {
      totalDonations: number;
      totalAmount: number;
      uniqueDonorCount: number;
      uniqueCampaignCount: number;
    };
    users: {
      total: number;
      byRole: Record<string, number>;
      byStatus?: Record<string, number>;
      pendingReview?: number;
    };
  };
}

export interface DonationsOverTimeResponse {
  success: boolean;
  data: { date: string; count: number; totalAmount: number }[];
}

export interface UserGrowthResponse {
  success: boolean;
  data: { date: string; count: number }[];
}

export interface CampaignCategoryBreakdownResponse {
  success: boolean;
  data: { category: string; count: number; totalGoal: number }[];
}

export interface RoleDistributionResponse {
  success: boolean;
  data: { role: string; count: number }[];
}

export interface ServiceHealth {
  status: "ok" | "degraded" | "down";
  message?: string;
  latencyMs?: number;
}

export interface PlatformHealthResponse {
  success: boolean;
  health: {
    mongodb: ServiceHealth;
    redis?: ServiceHealth;
    pinata?: ServiceHealth;
    cloudinary?: ServiceHealth;
    resend?: ServiceHealth;
    blockchainRpc?: ServiceHealth;
    notificationEngine?: ServiceHealth;
    overall: "ok" | "degraded" | "down";
    responseTimeMs?: number;
    checkedAt?: string;
  };
}

// ─── Admin Activity Interface ──────────────────────────────────────────────

export interface AdminActivityItem {
  id: string;
  type: "donation" | "campaign_flagged" | "campaign_created" | "user_registered" | "admin_action";
  title: string;
  message: string;
  timestamp: string;
  link: string;
}

export interface AdminActivityResponse {
  success: boolean;
  activities: AdminActivityItem[];
}

export interface AdminLedgerItem extends Omit<ApiDonation, "campaign"> {
  type?: "donation" | "refund" | "release";
  fromAddress?: string;
  toAddress?: string;
  eventName?: string;
  metadata?: Record<string, unknown>;
  campaign?: {
    title?: string;
    coverImageUrl?: string;
    category?: string;
  } | null;
}

export interface AdminLedgerResponse {
  success: boolean;
  items: AdminLedgerItem[];
  summary: {
    totalDonations: number;
    uniqueDonorCount: number;
    uniqueCampaignCount: number;
    totalAmountWei: string;
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export type PlatformLedgerItem = AdminLedgerItem & {
  type: "donation" | "refund" | "release";
  fromAddress: string;
  toAddress: string;
};

export interface PlatformLedgerResponse extends Omit<AdminLedgerResponse, "items"> {
  items: PlatformLedgerItem[];
}

export interface AdminAuditLogItem {
  _id: string;
  actorWalletAddress: string;
  action: string;
  resourceType: "user" | "campaign" | "platform";
  resourceId: string;
  targetWalletAddress?: string | null;
  outcome: "success" | "failed";
  beforeState: Record<string, unknown>;
  afterState: Record<string, unknown>;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface AdminAuditLogsResponse {
  success: boolean;
  items: AdminAuditLogItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ─── Notification interface ─────────────────────────────────────────────────

export interface ApiNotification {
  _id: string;
  walletAddress: string;
  type: string;
  title: string;
  message: string;
  readAt: string | null;
  createdAt: string;
}

// ─── User interfaces ────────────────────────────────────────────────────────

export interface ApiUserPreferences {
  notifications?: {
    email?: boolean;
    donations?: boolean;
    milestones?: boolean;
    votes?: boolean;
    updates?: boolean;
  };
  privacy?: {
    publicProfile?: boolean;
    showDonations?: boolean;
    showCampaigns?: boolean;
  };
  appearance?: {
    language?: string;
    currency?: string;
    theme?: string;
  };
}

export interface ApiUser {
  _id?: string;
  clerkUserId?: string | null;
  walletAddress: string;
  walletAddresses?: string[];
  displayName?: string;
  email?: string;
  role?: string;
  requestedRole?: string;
  accountStatus?: string;
  hasOnboarded?: boolean;
  actionHistory?: {
    donated?: boolean;
    createdCampaign?: boolean;
  };
  reviewNotes?: string;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  verificationStatus?: string;
  worldIdVerified?: boolean;
  gitcoinPassportScore?: number;
  preferences?: ApiUserPreferences;
  createdAt?: string;
}

export interface ApiAdminUser {
  walletAddress: string;
  displayName?: string;
  email?: string;
  role: string;
  requestedRole?: string;
  accountStatus?: string;
  verificationStatus: string;
  reviewNotes?: string;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
}

export interface AdminUserListResponse {
  success: boolean;
  items: ApiAdminUser[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ─── Helper: Auth headers ───────────────────────────────────────────────────

async function authHeaders(json = true): Promise<HeadersInit> {
  const headers: Record<string, string> = {};
  
  try {
    // Dynamically fetch token from Clerk window object if available
    const token = await (window as any).Clerk?.session?.getToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  } catch {
    // Ignore Clerk token fetch error cleanly without console warning
  }

  if (json) {
    headers["Content-Type"] = "application/json";
  }
  return headers;
}

function hasHeader(headers: HeadersInit, name: string): boolean {
  if (headers instanceof Headers) {
    return headers.has(name);
  }

  if (Array.isArray(headers)) {
    return headers.some(([key]) => key.toLowerCase() === name.toLowerCase());
  }

  return Object.keys(headers).some((key) => key.toLowerCase() === name.toLowerCase());
}

async function mergeAuthHeaders(headers: HeadersInit | undefined, json: boolean): Promise<HeadersInit> {
  const authH = await authHeaders(json);

  if (!headers) {
    return authH;
  }

  if (headers instanceof Headers) {
    const merged = new Headers(headers);
    for (const [key, value] of Object.entries(authH)) {
      if (!merged.has(key)) {
        merged.set(key, value);
      }
    }
    return merged;
  }

  if (Array.isArray(headers)) {
    const merged = new Headers(headers);
    for (const [key, value] of Object.entries(authH)) {
      if (!merged.has(key)) {
        merged.set(key, value);
      }
    }
    return merged;
  }

  return hasHeader(headers, "Authorization") ? headers : { ...headers, ...authH };
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const hasBody = options.body !== undefined && options.body !== null;
  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;
  const shouldUseJson = !isFormData && (!hasBody || typeof options.body === "string");

  options.headers = await mergeAuthHeaders(options.headers, shouldUseJson);

  const res = await fetch(`${BASE_URL}${path}`, options);

  if (!res.ok) {
    // Try to parse JSON error body for a user-friendly message
    let message = res.statusText;
    try {
      const body = await res.json();
      message = body?.message || body?.error || JSON.stringify(body);
    } catch {
      try { message = await res.text(); } catch { /* ignore */ }
    }
    throw new Error(`API ${res.status}: ${message}`);
  }

  return res.json() as Promise<T>;
}

// ─── Campaign Stats interfaces ─────────────────────────────────────────────

export interface CampaignStatsResponse {
  success: boolean;
  stats: {
    totalDonations: number;
    uniqueDonorCount: number;
    totalAmountWei: string;
  };
  recentDonations: {
    walletAddress: string;
    amount: string;
    txHash: string;
    createdAt: string;
  }[];
}

export interface CampaignDonorItem {
  walletAddress: string;
  totalAmount: string;
  totalAmountWei: string;
  donationCount: number;
  lastDonation: string;
  firstDonation: string;
}

export interface CampaignDonorsResponse {
  success: boolean;
  items: CampaignDonorItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface RecentDonationItem {
  walletAddress: string;
  amount: string;
  amountWei: string;
  txHash: string;
  createdAt: string;
}

export interface RecentDonationsResponse {
  success: boolean;
  items: RecentDonationItem[];
}

// ─── Public API ─────────────────────────────────────────────────────────────

export const api = {
  health: () => apiFetch<{ status: string; chainId: number }>("/health"),

  // ── Campaigns ──────────────────────────────────────────────────────────

  listCampaigns: (params?: {
    page?: number;
    limit?: number;
    category?: string;
    search?: string;
    creator?: string;
    status?: string;
  }): Promise<CampaignListResponse> => {
    const qs = new URLSearchParams();
    if (params?.page) qs.set("page", String(params.page));
    if (params?.limit) qs.set("limit", String(params.limit));
    if (params?.category) qs.set("category", params.category);
    if (params?.search) qs.set("search", params.search);
    if (params?.creator) qs.set("creator", params.creator);
    const query = qs.toString() ? `?${qs.toString()}` : "";
    return apiFetch<CampaignListResponse>(`/api/campaigns${query}`, {
      headers: { "Content-Type": "application/json" }
    });
  },

  listMilestoneReviews: (params?: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<MilestoneReviewsResponse> => {
    const qs = new URLSearchParams();
    if (params?.page) qs.set("page", String(params.page));
    if (params?.limit) qs.set("limit", String(params.limit));
    if (params?.search) qs.set("search", params.search);
    const query = qs.toString() ? `?${qs.toString()}` : "";
    return apiFetch<MilestoneReviewsResponse>(`/api/campaigns/milestone-reviews${query}`, {
      headers: { "Content-Type": "application/json" }
    });
  },

  getCampaign: (contractAddress: string): Promise<CampaignDetailResponse> =>
    apiFetch<CampaignDetailResponse>(`/api/campaigns/${contractAddress}`, {
      headers: { "Content-Type": "application/json" }
    }),

  createCampaign: (
    data: Omit<ApiCampaign, "contractAddress"> & { contractAddress: string }
  ): Promise<{ success: boolean; campaign: ApiCampaign }> =>
    // NOTE: auth token is auto-injected by apiFetch via authHeaders()
    apiFetch("/api/campaigns", {
      method: "POST",
      body: JSON.stringify(data)
    }),

  patchCampaign: (
    address: string,
    updates: {
      title?: string;
      descriptionMarkdown?: string;
      coverImageUrl?: string;
      tags?: string[];
      status?: string;
      category?: string;
    }
  ): Promise<{ success: boolean; campaign: ApiCampaign }> =>
    apiFetch(`/api/campaigns/${address}`, {
      method: "PATCH",
      body: JSON.stringify(updates)
    }),

  getCampaignStats: (
    contractAddress: string
  ): Promise<CampaignStatsResponse> =>
    apiFetch<CampaignStatsResponse>(
      `/api/campaigns/${contractAddress}/stats`,
      { headers: { "Content-Type": "application/json" } }
    ),

  getCampaignDonors: (
    contractAddress: string,
    params?: { page?: number; limit?: number }
  ): Promise<CampaignDonorsResponse> => {
    const qs = new URLSearchParams();
    if (params?.page) qs.set("page", String(params.page));
    if (params?.limit) qs.set("limit", String(params.limit));
    const query = qs.toString() ? `?${qs.toString()}` : "";
    return apiFetch<CampaignDonorsResponse>(
      `/api/campaigns/${contractAddress}/donors${query}`,
      { headers: { "Content-Type": "application/json" } }
    );
  },

  getRecentDonations: (
    campaignAddress: string,
    limit = 10
  ): Promise<RecentDonationsResponse> =>
    apiFetch<RecentDonationsResponse>(
      `/api/donations/campaign/${campaignAddress}/recent?limit=${limit}`,
      { headers: { "Content-Type": "application/json" } }
    ),

  getCreatorDashboard: (
    creatorAddress: string
  ): Promise<CreatorDashboardResponse> =>
    apiFetch<CreatorDashboardResponse>(
      `/api/campaigns/creator/${creatorAddress}/dashboard`,
      { headers: { "Content-Type": "application/json" } }
    ),

  // ── Uploads ────────────────────────────────────────────────────────────

  uploadProof: async (
    file: File,
    meta: { contractAddress: string; milestoneIndex: number }
  ): Promise<{ cid: string }> => {
    const form = new FormData();
    form.append("file", file);
    form.append("contractAddress", meta.contractAddress);
    form.append("milestoneIndex", String(meta.milestoneIndex));

    return apiFetch<{ cid: string }>(`/api/upload-proof`, {
      method: "POST",
      body: form,
      headers: new Headers()
    });
  },

  uploadCoverImage: async (
    file: File,
    meta?: { contractAddress?: string }
  ): Promise<{ coverImageUrl: string }> => {
    const form = new FormData();
    form.append("file", file);
    if (meta?.contractAddress) {
      form.append("contractAddress", meta.contractAddress);
    }

    return apiFetch<{ coverImageUrl: string }>(`/api/media/campaign-cover`, {
      method: "POST",
      body: form,
      headers: new Headers()
    });
  },

  // ── Users ──────────────────────────────────────────────────────────────

  upsertUser: (
    data: { walletAddress?: string; clerkUserId?: string; displayName?: string; email?: string; role?: string; requestedRole?: string; preferences?: ApiUserPreferences }
  ): Promise<{ success: boolean; user: ApiUser }> =>
    apiFetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    }),

  getCurrentUser: (): Promise<{ success: boolean; exists: boolean; user: ApiUser }> =>
    apiFetch(`/api/users/me`, {
      headers: { "Content-Type": "application/json" }
    }),

  getUser: (walletAddress: string): Promise<{ success: boolean; user: ApiUser }> =>
    apiFetch(`/api/users/${walletAddress}`, {
      headers: { "Content-Type": "application/json" }
    }),

  // ── Notifications ──────────────────────────────────────────────────────

  listNotifications: (
    walletAddress: string,
    unreadOnly = false
  ): Promise<{ success: boolean; notifications: ApiNotification[] }> =>
    apiFetch(
      `/api/notifications/${walletAddress}${unreadOnly ? "?unread=true" : ""}`,
      { headers: { "Content-Type": "application/json" } }
    ),

  markNotificationRead: (
    id: string
  ): Promise<{ success: boolean; notification: ApiNotification }> =>
    apiFetch(`/api/notifications/${id}/read`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" }
    }),

  markAllNotificationsRead: (
    walletAddress: string
  ): Promise<{ success: boolean; count: number }> =>
    apiFetch(`/api/notifications/${walletAddress}/read-all`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" }
    }),

  getNotificationStreamUrl: (walletAddress: string): string =>
    `${BASE_URL}/api/notifications/stream/${walletAddress}`,

  sendTestNotification: (
    payload: { walletAddress: string; title?: string; message?: string; recipientEmail?: string; type?: string }
  ): Promise<{ success: boolean; message?: string }> =>
    apiFetch(`/api/notifications/test`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    }),

  // ── Donations ──────────────────────────────────────────────────────────

  listDonationsByWallet: (
    walletAddress: string,
    params?: { page?: number; limit?: number }
  ): Promise<DonationListResponse> => {
    const qs = new URLSearchParams();
    if (params?.page) qs.set("page", String(params.page));
    if (params?.limit) qs.set("limit", String(params.limit));
    const query = qs.toString() ? `?${qs.toString()}` : "";
    return apiFetch<DonationListResponse>(`/api/donations/wallet/${walletAddress}${query}`, {
      headers: { "Content-Type": "application/json" }
    });
  },

  getDonationStats: (walletAddress: string): Promise<DonationStatsResponse> =>
    apiFetch<DonationStatsResponse>(`/api/donations/stats/${walletAddress}`, {
      headers: { "Content-Type": "application/json" }
    }),

  getWalletActivity: (
    walletAddress: string
  ): Promise<{
    success: boolean;
    stats: {
      totalSentCount: number;
      totalReceivedCount: number;
      totalSentAmount: string;
      totalReceivedAmount: string;
      netVolume: string;
      myCampaignsCount: number;
    };
    items: Array<ApiDonation & { direction: 'sent' | 'received'; campaign?: { title?: string; coverImageUrl?: string; category?: string; status?: string } }>;
  }> =>
    apiFetch(`/api/donations/activity/${walletAddress}`, {
      headers: { "Content-Type": "application/json" }
    }),

  getDonorPortfolio: (
    walletAddress: string
  ): Promise<DonorPortfolioResponse> =>
    apiFetch<DonorPortfolioResponse>(
      `/api/donations/donor/${walletAddress}/portfolio`,
      { headers: { "Content-Type": "application/json" } }
    ),

  listDonationsByCampaign: (
    campaignAddress: string,
    params?: { page?: number; limit?: number }
  ): Promise<DonationListResponse> => {
    const qs = new URLSearchParams();
    if (params?.page) qs.set("page", String(params.page));
    if (params?.limit) qs.set("limit", String(params.limit));
    const query = qs.toString() ? `?${qs.toString()}` : "";
    return apiFetch<DonationListResponse>(`/api/donations/campaign/${campaignAddress}${query}`, {
      headers: { "Content-Type": "application/json" }
    });
  },

  recordDonation: (
    data: { walletAddress: string; campaignAddress: string; amount: string; amountWei: string; txHash: string; chainId?: number }
  ): Promise<{ success: boolean; donation: ApiDonation }> =>
    apiFetch("/api/donations", {
      method: "POST",
      body: JSON.stringify(data)
    }),

  listPlatformLedger: (params?: { page?: number; limit?: number; search?: string; status?: string; type?: string }): Promise<PlatformLedgerResponse> => {
    const qs = new URLSearchParams();
    if (params?.page) qs.set("page", String(params.page));
    if (params?.limit) qs.set("limit", String(params.limit));
    if (params?.search) qs.set("search", params.search);
    if (params?.status) qs.set("status", params.status);
    if (params?.type) qs.set("type", params.type);
    const query = qs.toString() ? `?${qs.toString()}` : "";
    return apiFetch<PlatformLedgerResponse>(`/api/donations/ledger${query}`);
  },

  // ── Admin ──────────────────────────────────────────────────────────────

  getPlatformStats: (): Promise<PlatformStatsResponse> =>
    apiFetch<PlatformStatsResponse>("/api/admin/stats"),

  adminGetDonationsOverTime: (days?: number): Promise<DonationsOverTimeResponse> =>
    apiFetch<DonationsOverTimeResponse>(`/api/admin/analytics/donations-over-time${days ? `?days=${days}` : ''}`),

  adminGetUserGrowth: (days?: number): Promise<UserGrowthResponse> =>
    apiFetch<UserGrowthResponse>(`/api/admin/analytics/user-growth${days ? `?days=${days}` : ''}`),

  adminGetCampaignCategories: (): Promise<CampaignCategoryBreakdownResponse> =>
    apiFetch<CampaignCategoryBreakdownResponse>("/api/admin/analytics/campaign-categories"),

  adminGetRoleDistribution: (): Promise<RoleDistributionResponse> =>
    apiFetch<RoleDistributionResponse>("/api/admin/analytics/role-distribution"),

  adminGetPlatformHealth: (): Promise<PlatformHealthResponse> =>
    apiFetch<PlatformHealthResponse>("/api/admin/health"),

  adminGetActivity: (): Promise<AdminActivityResponse> =>
    apiFetch<AdminActivityResponse>("/api/admin/activity"),

  adminGetLedger: (params?: { page?: number; limit?: number; search?: string; status?: string }): Promise<AdminLedgerResponse> => {
    const qs = new URLSearchParams();
    if (params?.page) qs.set("page", String(params.page));
    if (params?.limit) qs.set("limit", String(params.limit));
    if (params?.search) qs.set("search", params.search);
    if (params?.status) qs.set("status", params.status);
    const query = qs.toString() ? `?${qs.toString()}` : "";
    return apiFetch<AdminLedgerResponse>(`/api/admin/ledger${query}`);
  },

  adminGetAuditLogs: (
    params?: { page?: number; limit?: number; action?: string; resourceType?: string; search?: string }
  ): Promise<AdminAuditLogsResponse> => {
    const qs = new URLSearchParams();
    if (params?.page) qs.set("page", String(params.page));
    if (params?.limit) qs.set("limit", String(params.limit));
    if (params?.action) qs.set("action", params.action);
    if (params?.resourceType) qs.set("resourceType", params.resourceType);
    if (params?.search) qs.set("search", params.search);
    const query = qs.toString() ? `?${qs.toString()}` : "";
    return apiFetch<AdminAuditLogsResponse>(`/api/admin/audit-logs${query}`);
  },

  adminListUsers: (
    params: { page?: number; limit?: number; search?: string; role?: string; accountStatus?: string }
  ): Promise<AdminUserListResponse> => {
    const qs = new URLSearchParams();
    if (params.page) qs.set("page", String(params.page));
    if (params.limit) qs.set("limit", String(params.limit));
    if (params.search) qs.set("search", params.search);
    if (params.role) qs.set("role", params.role);
    if (params.accountStatus) qs.set("accountStatus", params.accountStatus);
    const query = qs.toString() ? `?${qs.toString()}` : "";
    return apiFetch<AdminUserListResponse>(`/api/admin/users${query}`);
  },

  adminUpdateUserRole: (
    walletAddress: string,
    role: string
  ): Promise<{ success: boolean; user: ApiAdminUser }> =>
    apiFetch(`/api/admin/users/${walletAddress}/role`, {
      method: "PATCH",
      body: JSON.stringify({ role })
    }),

  adminReviewUser: (
    walletAddress: string,
    payload: { decision: "approve" | "reject"; role?: string; reviewNotes?: string }
  ): Promise<{ success: boolean; user: ApiAdminUser }> =>
    apiFetch(`/api/admin/users/${walletAddress}/review`, {
      method: "PATCH",
      body: JSON.stringify(payload)
    }),

  adminUpdateUserVerification: (
    walletAddress: string,
    verificationStatus: string
  ): Promise<{ success: boolean; user: ApiAdminUser }> =>
    apiFetch(`/api/admin/users/${walletAddress}/verify`, {
      method: "PATCH",
      body: JSON.stringify({ verificationStatus })
    }),

  adminFlagCampaign: (
    address: string,
    flagged: boolean,
    reason: string
  ): Promise<{ success: boolean; campaign: ApiCampaign }> =>
    apiFetch(`/api/admin/campaigns/${address}/flag`, {
      method: "PATCH",
      body: JSON.stringify({ flagged, flagReason: reason })
    }),

  adminListFlaggedCampaigns: (
    params: { page?: number; limit?: number }
  ): Promise<CampaignListResponse> => {
    const qs = new URLSearchParams();
    if (params.page) qs.set("page", String(params.page));
    if (params.limit) qs.set("limit", String(params.limit));
    const query = qs.toString() ? `?${qs.toString()}` : "";
    return apiFetch<CampaignListResponse>(`/api/admin/campaigns/flagged${query}`);
  },

  adminUpdateCampaignStatus: (
    address: string,
    status: string
  ): Promise<{ success: boolean; campaign: ApiCampaign }> =>
    apiFetch(`/api/admin/campaigns/${address}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status })
    }),

  // ── Quadratic Voting ────────────────────────────────────────────────────

  /**
   * Check if a wallet is eligible to vote on a campaign milestone.
   * Returns QV power, sybil check results, and eligibility reason.
   */
  getVotingEligibility: (
    campaignAddress: string,
    walletAddress: string,
    milestoneIndex: number
  ): Promise<QVEligibilityResponse> =>
    apiFetch<QVEligibilityResponse>(
      `/api/voting/eligibility/${campaignAddress}/${walletAddress}/${milestoneIndex}`,
      { headers: { "Content-Type": "application/json" } }
    ),

  /**
   * Lightweight check: has wallet voted and in which direction?
   */
  getVoteStatus: (
    campaignAddress: string,
    walletAddress: string,
    milestoneIndex: number
  ): Promise<QVVoteStatus> =>
    apiFetch<QVVoteStatus>(
      `/api/voting/status/${campaignAddress}/${walletAddress}/${milestoneIndex}`,
      { headers: { "Content-Type": "application/json" } }
    ),

  /**
   * Get aggregate QV stats for a campaign milestone.
   * Used for the real-time vote results display.
   */
  getCampaignVotingStats: (
    campaignAddress: string,
    milestoneIndex: number
  ): Promise<QVStatsResponse> =>
    apiFetch<QVStatsResponse>(
      `/api/voting/stats/${campaignAddress}/${milestoneIndex}`,
      { headers: { "Content-Type": "application/json" } }
    ),

  /**
   * Paginated anonymized vote list for a milestone.
   */
  listMilestoneVotes: (
    campaignAddress: string,
    milestoneIndex: number,
    params?: { page?: number; limit?: number }
  ): Promise<QVVotesListResponse> => {
    const qs = new URLSearchParams();
    if (params?.page) qs.set("page", String(params.page));
    if (params?.limit) qs.set("limit", String(params.limit));
    const query = qs.toString() ? `?${qs.toString()}` : "";
    return apiFetch<QVVotesListResponse>(
      `/api/voting/votes/${campaignAddress}/${milestoneIndex}${query}`,
      { headers: { "Content-Type": "application/json" } }
    );
  },

  /**
   * Donor QV leaderboard for a campaign.
   */
  getCampaignQVDonors: (
    campaignAddress: string,
    params?: { page?: number; limit?: number }
  ): Promise<QVDonorsResponse> => {
    const qs = new URLSearchParams();
    if (params?.page) qs.set("page", String(params.page));
    if (params?.limit) qs.set("limit", String(params.limit));
    const query = qs.toString() ? `?${qs.toString()}` : "";
    return apiFetch<QVDonorsResponse>(
      `/api/voting/donors/${campaignAddress}${query}`,
      { headers: { "Content-Type": "application/json" } }
    );
  }
};

// ─── Utility ────────────────────────────────────────────────────────────────

export function mapCampaignToCardData(
  campaign: ApiCampaign,
  blockchainState?: CampaignDetailResponse["blockchainState"] | null
): CampaignCardData {
  const raisedRaw = blockchainState?.totalFundsRaised ?? campaign.totalRaised ?? "0";
  const goalRaw = blockchainState?.fundraisingGoal ?? String(campaign.targetGoal);
  const raisedNum = Number.parseFloat(raisedRaw) || 0;
  const goalNum = Number.parseFloat(goalRaw) || campaign.targetGoal || 1;
  const progress = blockchainState
    ? Math.min(100, Math.round((raisedNum / goalNum) * 100))
    : campaign.progressPercentage ?? Math.min(100, Math.round((raisedNum / goalNum) * 100));

  return {
    id: campaign.contractAddress,
    title: campaign.title,
    description: campaign.descriptionMarkdown?.slice(0, 160),
    creator: `${campaign.creatorAddress.slice(0, 6)}…${campaign.creatorAddress.slice(-4)}`,
    creatorType: "human",
    category: campaign.category,
    imageUrl: campaign.coverImageUrl ?? null,
    raised: raisedNum.toLocaleString(undefined, { maximumFractionDigits: 2 }),
    goal: goalNum.toLocaleString(undefined, { maximumFractionDigits: 2 }),
    currency: "MATIC",
    progress,
    daysLeft: 30,
    donorCount: campaign.donorCount,
    milestoneCount: campaign.milestones.length,
    isVerified: campaign.status === "active"
  };
}
