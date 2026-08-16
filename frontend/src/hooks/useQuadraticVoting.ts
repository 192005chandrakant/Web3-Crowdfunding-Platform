/**
 * useQuadraticVoting — Central QV data hook
 * ───────────────────────────────────────────
 * Orchestrates all QV-related data fetching and math for the frontend.
 *
 * Usage:
 *   const { eligibility, stats, voteStatus, castVote, qvMath } =
 *     useQuadraticVoting({ campaignAddress, milestoneIndex });
 */

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { useAccount, usePublicClient } from "wagmi";
import { api, type QVEligibilityResponse, type QVVoteStatus } from "@/lib/api";
import { CAMPAIGN_ABI } from "@/lib/contracts";
import { TARGET_CHAIN_ID } from "@/lib/chain";
import { useCampaignContractActions } from "@/hooks/useCampaignContract";

// ─── Pure QV Math utilities (client-side, no BigInt needed) ──────────────────

/**
 * Compute QV display power from POL amount (as decimal string or number).
 * Formula: √(polAmount) = votes
 * Example: 100 POL → √100 = 10.00 votes
 */
export function computeQVDisplay(polAmount: number | string): string {
  const amount = typeof polAmount === "string" ? parseFloat(polAmount) : polAmount;
  if (!amount || amount <= 0) return "0.00";
  return Math.sqrt(amount).toFixed(4);
}

/**
 * Compute QV power from amountWei (BigInt-as-string).
 * Returns human-readable votes string.
 */
export function computeQVFromWei(amountWei: string): string {
  try {
    // Convert wei to POL: amountWei / 1e18
    const polAmount = Number(BigInt(amountWei)) / 1e18;
    return computeQVDisplay(polAmount);
  } catch {
    return "0.00";
  }
}

/**
 * Parse QV display string back to number.
 */
export function parseQVDisplay(qvDisplay: string): number {
  return parseFloat(qvDisplay) || 0;
}

/**
 * Format QV power for display — trims trailing zeros but keeps at least 2dp.
 * e.g.: "10.0000" → "10.00", "3.1623" → "3.16"
 */
export function formatQVPower(qvDisplay: string): string {
  const num = parseFloat(qvDisplay);
  if (isNaN(num)) return "0.00";
  if (num === 0) return "0.00";
  // 2 decimal places for clean display
  return num.toFixed(2);
}

/**
 * Estimate QV power for an amount the user is about to donate.
 * Takes current total donation + new amount.
 */
export function estimateNewQVPower(
  currentTotalPOL: number,
  additionalPOL: number
): { current: string; new: string; gain: string } {
  const current = Math.sqrt(Math.max(0, currentTotalPOL));
  const newTotal = Math.sqrt(Math.max(0, currentTotalPOL + additionalPOL));
  const gain = newTotal - current;
  return {
    current: current.toFixed(2),
    new: newTotal.toFixed(2),
    gain: gain.toFixed(2)
  };
}

// ─── Minimum threshold constant (mirrors backend / contract) ─────────────────
export const MIN_CONTRIBUTION_POL = 0.001; // 0.001 POL on testnet

// ─── Query keys ──────────────────────────────────────────────────────────────
export const QV_QUERY_KEYS = {
  eligibility: (campaign: string, wallet: string, milestone: number) =>
    ["qv-eligibility", campaign, wallet, milestone] as const,
  stats: (campaign: string, milestone: number) =>
    ["qv-stats", campaign, milestone] as const,
  voteStatus: (campaign: string, wallet: string, milestone: number) =>
    ["qv-vote-status", campaign, wallet, milestone] as const,
  votes: (campaign: string, milestone: number) =>
    ["qv-votes", campaign, milestone] as const,
  donors: (campaign: string) =>
    ["qv-donors", campaign] as const
};

// ─── Main hook ────────────────────────────────────────────────────────────────

interface UseQVOptions {
  campaignAddress: string;
  milestoneIndex: number;
  /** Auto-refresh interval for live stats in ms (default: 15000) */
  statsRefreshInterval?: number;
}

export function useQuadraticVoting({
  campaignAddress,
  milestoneIndex,
  statsRefreshInterval = 15_000
}: UseQVOptions) {
  const { address: walletAddress } = useAccount();
  const queryClient = useQueryClient();
  const publicClient = usePublicClient({ chainId: TARGET_CHAIN_ID });
  const { voteOnMilestone, isPending: isVotePending } = useCampaignContractActions(
    campaignAddress as `0x${string}`
  );

  // ─── Eligibility (checks QV power + sybil) ───────────────────────────────
  const eligibilityQuery = useQuery({
    queryKey: QV_QUERY_KEYS.eligibility(campaignAddress, walletAddress || "", milestoneIndex),
    queryFn: () =>
      api.getVotingEligibility(campaignAddress, walletAddress!, milestoneIndex),
    enabled: Boolean(walletAddress && campaignAddress),
    staleTime: 30_000
  });

  // ─── Live QV stats (auto-refresh) ────────────────────────────────────────
  const statsQuery = useQuery({
    queryKey: QV_QUERY_KEYS.stats(campaignAddress, milestoneIndex),
    queryFn: () => api.getCampaignVotingStats(campaignAddress, milestoneIndex),
    enabled: Boolean(campaignAddress),
    refetchInterval: statsRefreshInterval,
    staleTime: 5_000
  });

  // ─── Vote status (lightweight) ────────────────────────────────────────────
  const voteStatusQuery = useQuery({
    queryKey: QV_QUERY_KEYS.voteStatus(campaignAddress, walletAddress || "", milestoneIndex),
    queryFn: async () => {
      let apiStatus: QVVoteStatus | null = null;

      try {
        apiStatus = await api.getVoteStatus(campaignAddress, walletAddress!, milestoneIndex);
        if (apiStatus.hasVoted) {
          return apiStatus;
        }
      } catch {
        // The contract is the source of truth if the event indexer/API is behind.
      }

      if (publicClient) {
        try {
          const [voted, votedApprove] = await publicClient.readContract({
            address: campaignAddress as `0x${string}`,
            abi: CAMPAIGN_ABI,
            functionName: "getVoterStatus",
            args: [BigInt(milestoneIndex), walletAddress as `0x${string}`]
          }) as readonly [boolean, boolean];

          if (voted) {
            return {
              success: true,
              hasVoted: true,
              support: votedApprove,
              qvPower: apiStatus?.qvPower || eligibilityQuery.data?.qvPower || "0",
              qvPowerDisplay:
                apiStatus?.qvPowerDisplay || eligibilityQuery.data?.qvPowerDisplay || "0.0000",
              txHash: apiStatus?.txHash || null
            };
          }
        } catch {
          return apiStatus || {
            success: true,
            hasVoted: false,
            support: null,
            qvPower: "0",
            qvPowerDisplay: "0.0000",
            txHash: null
          };
        }
      }

      return apiStatus || {
        success: true,
        hasVoted: false,
        support: null,
        qvPower: "0",
        qvPowerDisplay: "0.0000",
        txHash: null
      };
    },
    enabled: Boolean(walletAddress && campaignAddress),
    staleTime: 30_000
  });

  // ─── Cast vote (on-chain + cache invalidation) ────────────────────────────
  const castVote = useCallback(
    async (support: boolean): Promise<string> => {
      if (!walletAddress) {
        throw new Error("Wallet not connected");
      }

      const eligibility = eligibilityQuery.data;
      if (eligibility && !eligibility.eligible) {
        throw new Error(eligibility.reason || "Not eligible to vote");
      }

      const hash = await voteOnMilestone(milestoneIndex, support);
      const voteStatusKey = QV_QUERY_KEYS.voteStatus(campaignAddress, walletAddress, milestoneIndex);
      const eligibilityKey = QV_QUERY_KEYS.eligibility(campaignAddress, walletAddress, milestoneIndex);

      queryClient.setQueryData<QVVoteStatus>(voteStatusKey, {
        success: true,
        hasVoted: true,
        support,
        qvPower: eligibilityQuery.data?.qvPower || "0",
        qvPowerDisplay: eligibilityQuery.data?.qvPowerDisplay || "0.0000",
        txHash: hash
      });

      queryClient.setQueryData<QVEligibilityResponse | undefined>(eligibilityKey, old =>
        old
          ? {
              ...old,
              eligible: false,
              hasVoted: true,
              voteDirection: support ? "approve" : "reject",
              reason: "You have already voted on this milestone."
            }
          : old
      );

      // Refresh aggregate data while preserving the just-cast wallet status.
      queryClient.invalidateQueries({
        queryKey: QV_QUERY_KEYS.stats(campaignAddress, milestoneIndex)
      });
      queryClient.invalidateQueries({
        queryKey: QV_QUERY_KEYS.votes(campaignAddress, milestoneIndex)
      });
      queryClient.invalidateQueries({ queryKey: ["donations", walletAddress] });

      return hash;
    },
    [
      walletAddress,
      eligibilityQuery.data,
      voteOnMilestone,
      milestoneIndex,
      campaignAddress,
      queryClient
    ]
  );

  // ─── Computed derived state ────────────────────────────────────────────────
  const eligibility = eligibilityQuery.data;
  const stats = statsQuery.data;
  const voteStatus = voteStatusQuery.data;
  const hasVoted = voteStatus?.hasVoted || eligibility?.hasVoted || false;
  const userVoteDirection =
    voteStatus?.support ??
    (eligibility?.voteDirection ? eligibility.voteDirection === "approve" : null);

  // QV math utilities exposed for components to use
  const qvMath = {
    computeQVDisplay,
    computeQVFromWei,
    formatQVPower,
    estimateNewQVPower,
    MIN_CONTRIBUTION_POL
  };

  return {
    // Data
    eligibility,
    stats,
    voteStatus,
    // Loading states
    isLoadingEligibility: eligibilityQuery.isLoading,
    isLoadingStats: statsQuery.isLoading,
    isLoadingVoteStatus: voteStatusQuery.isLoading,
    isEligibilityError: eligibilityQuery.isError,
    eligibilityError: eligibilityQuery.error,
    // Derived convenience booleans
    canVote: eligibility?.eligible === true && !hasVoted,
    hasVoted,
    userVoteDirection,
    userQVPower: eligibility?.qvPowerDisplay || "0.00",
    // Actions
    castVote,
    isVotePending,
    // Math utils
    qvMath,
    // Refetch
    refetchAll: () => {
      eligibilityQuery.refetch();
      statsQuery.refetch();
      voteStatusQuery.refetch();
    }
  };
}

// ─── Votes list hook ──────────────────────────────────────────────────────────

export function useQVVotesList(
  campaignAddress: string,
  milestoneIndex: number,
  params?: { page?: number; limit?: number }
) {
  return useQuery({
    queryKey: [...QV_QUERY_KEYS.votes(campaignAddress, milestoneIndex), params],
    queryFn: () => api.listMilestoneVotes(campaignAddress, milestoneIndex, params),
    enabled: Boolean(campaignAddress),
    staleTime: 15_000,
    refetchInterval: 20_000
  });
}

// ─── Donors leaderboard hook ──────────────────────────────────────────────────

export function useQVDonors(
  campaignAddress: string,
  params?: { page?: number; limit?: number }
) {
  return useQuery({
    queryKey: [...QV_QUERY_KEYS.donors(campaignAddress), params],
    queryFn: () => api.getCampaignDonors(campaignAddress, params),
    enabled: Boolean(campaignAddress),
    staleTime: 30_000
  });
}
