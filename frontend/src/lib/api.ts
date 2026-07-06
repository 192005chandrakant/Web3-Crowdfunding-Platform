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
  isFlagged?: boolean;
  flagReason?: string;
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
      uniqueDonorCount: number;
      uniqueCampaignCount: number;
    };
    users: {
      total: number;
      byRole: Record<string, number>;
    };
  };
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
    overall: "ok" | "degraded" | "down";
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

export interface ApiUser {
  walletAddress: string;
  displayName?: string;
  email?: string;
  role?: string;
  verificationStatus?: string;
  createdAt?: string;
}

export interface ApiAdminUser {
  walletAddress: string;
  displayName?: string;
  email?: string;
  role: string;
  verificationStatus: string;
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
  } catch (err) {
    console.warn("Failed to fetch Clerk token", err);
  }

  if (json) {
    headers["Content-Type"] = "application/json";
  }
  return headers;
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  // If headers aren't provided, auto-inject them
  if (!options.headers) {
    options.headers = await authHeaders(true);
  } else if (!(options.headers instanceof Headers) && !("Authorization" in options.headers)) {
    const authH = await authHeaders(false);
    options.headers = { ...options.headers, ...authH };
  }

  const res = await fetch(`${BASE_URL}${path}`, options);

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`API ${res.status}: ${text}`);
  }

  return res.json() as Promise<T>;
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

  getCampaign: (contractAddress: string): Promise<CampaignDetailResponse> =>
    apiFetch<CampaignDetailResponse>(`/api/campaigns/${contractAddress}`, {
      headers: { "Content-Type": "application/json" }
    }),

  createCampaign: (
    data: Omit<ApiCampaign, "contractAddress"> & { contractAddress: string }
  ): Promise<{ success: boolean; campaign: ApiCampaign }> =>
    apiFetch("/api/campaigns", {
      method: "POST",
      body: JSON.stringify(data)
    }),

  // ── Uploads ────────────────────────────────────────────────────────────

  uploadProof: async (
    file: File,
    meta: { contractAddress: string; milestoneIndex: number }
  ): Promise<{ cid: string }> => {
    const form = new FormData();
    form.append("file", file);
    form.append("contractAddress", meta.contractAddress);
    form.append("milestoneIndex", String(meta.milestoneIndex));

    const res = await apiFetch<{ cid: string }>(`/api/upload-proof`, {
      method: "POST",
      body: form,
      headers: new Headers() // will be injected by apiFetch without content type json
    });

    return res;
  },

  uploadCoverImage: async (
    file: File
  ): Promise<{ coverImageUrl: string }> => {
    const form = new FormData();
    form.append("file", file);

    const res = await apiFetch<{ coverImageUrl: string }>(`/api/media/campaign-cover`, {
      method: "POST",
      body: form,
      headers: new Headers()
    });

    return res;
  },

  // ── Users ──────────────────────────────────────────────────────────────

  upsertUser: (
    data: { walletAddress: string; displayName?: string; email?: string; role?: string }
  ): Promise<{ success: boolean; user: ApiUser }> =>
    apiFetch("/api/users", {
      method: "POST",
      body: JSON.stringify(data)
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

  // ── Admin ──────────────────────────────────────────────────────────────

  getPlatformStats: (): Promise<PlatformStatsResponse> =>
    apiFetch<PlatformStatsResponse>("/api/admin/stats"),

  adminGetPlatformHealth: (): Promise<PlatformHealthResponse> =>
    apiFetch<PlatformHealthResponse>("/api/admin/health"),

  adminListUsers: (
    params: { page?: number; limit?: number; search?: string; role?: string }
  ): Promise<AdminUserListResponse> => {
    const qs = new URLSearchParams();
    if (params.page) qs.set("page", String(params.page));
    if (params.limit) qs.set("limit", String(params.limit));
    if (params.search) qs.set("search", params.search);
    if (params.role) qs.set("role", params.role);
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

  adminFlagCampaign: (
    address: string,
    flagged: boolean,
    reason: string
  ): Promise<{ success: boolean; campaign: ApiCampaign }> =>
    apiFetch(`/api/admin/campaigns/${address}/flag`, {
      method: "PATCH",
      body: JSON.stringify({ flagged, reason })
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
    })
};

// ─── Utility ────────────────────────────────────────────────────────────────

export function mapCampaignToCardData(
  campaign: ApiCampaign,
  blockchainState?: CampaignDetailResponse["blockchainState"] | null
): CampaignCardData {
  const raisedRaw = blockchainState?.totalFundsRaised ?? "0";
  const goalRaw = blockchainState?.fundraisingGoal ?? String(campaign.targetGoal);
  const raisedNum = Number.parseFloat(raisedRaw) || 0;
  const goalNum = Number.parseFloat(goalRaw) || campaign.targetGoal || 1;
  const progress = Math.min(100, Math.round((raisedNum / goalNum) * 100));

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
    milestoneCount: campaign.milestones.length,
    isVerified: campaign.status === "active"
  };
}
