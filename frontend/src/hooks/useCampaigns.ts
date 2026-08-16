/**
 * React Query hooks for campaign data.
 * Falls back gracefully when the backend is offline.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { CampaignListResponse, CampaignDetailResponse, CampaignStatsResponse, CampaignDonorsResponse, ApiCampaign, CreatorDashboardResponse } from "@/lib/api";

// ─── Campaign list ─────────────────────────────────────────────────────────
interface UseCampaignListParams {
  page?: number;
  limit?: number;
  category?: string;
  search?: string;
  creator?: string;
}

export function useCampaignList(params?: UseCampaignListParams) {
  return useQuery<CampaignListResponse, Error>({
    queryKey: ["campaigns", params],
    queryFn:  () => api.listCampaigns(params),
    staleTime: 30_000,        // 30 s
    refetchInterval: 15_000,
    refetchOnWindowFocus: true,
    retry:     1,
    // Don't throw — let the component handle isError gracefully
    throwOnError: false
  });
}

// ─── Campaign detail ───────────────────────────────────────────────────────
export function useCampaignDetail(contractAddress: string | undefined) {
  return useQuery<CampaignDetailResponse, Error>({
    queryKey: ["campaign", contractAddress],
    queryFn:  () => {
      if (!contractAddress) throw new Error("No contract address");
      return api.getCampaign(contractAddress);
    },
    enabled:   !!contractAddress,
    staleTime: 15_000,
    retry:     1,
    throwOnError: false
  });
}

// ─── Campaign stats (donor count, total raised, recent donations) ──────────
export function useCampaignStats(contractAddress: string | undefined) {
  return useQuery<CampaignStatsResponse, Error>({
    queryKey: ["campaignStats", contractAddress],
    queryFn: () => {
      if (!contractAddress) throw new Error("No contract address");
      return api.getCampaignStats(contractAddress);
    },
    enabled: !!contractAddress,
    staleTime: 30_000,
    retry: 1,
    throwOnError: false
  });
}

// ─── Campaign donors (paginated) ───────────────────────────────────────────
export function useCampaignDonors(
  contractAddress: string | undefined,
  params?: { page?: number; limit?: number }
) {
  return useQuery<CampaignDonorsResponse, Error>({
    queryKey: ["campaignDonors", contractAddress, params],
    queryFn: () => {
      if (!contractAddress) throw new Error("No contract address");
      return api.getCampaignDonors(contractAddress, params);
    },
    enabled: !!contractAddress,
    staleTime: 30_000,
    retry: 1,
    throwOnError: false
  });
}

// ─── Campaign update mutation ──────────────────────────────────────────────
export function useCampaignUpdate(contractAddress: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (updates: {
      title?: string;
      descriptionMarkdown?: string;
      coverImageUrl?: string;
      tags?: string[];
      status?: string;
      category?: string;
    }) => {
      if (!contractAddress) throw new Error("No contract address");
      return api.patchCampaign(contractAddress, updates);
    },
    onSuccess: () => {
      // Invalidate relevant caches
      queryClient.invalidateQueries({ queryKey: ["campaign", contractAddress] });
      queryClient.invalidateQueries({ queryKey: ["campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["creatorDashboard"] });
    }
  });
}

// ─── Creator Dashboard summary (optimized) ──────────────────────────────────
export function useCreatorDashboard(creatorAddress: string | undefined) {
  return useQuery<CreatorDashboardResponse, Error>({
    queryKey: ["creatorDashboard", creatorAddress],
    queryFn: () => {
      if (!creatorAddress) throw new Error("No creator address");
      return api.getCreatorDashboard(creatorAddress);
    },
    enabled: !!creatorAddress,
    staleTime: 30_000,
    retry: false,
    throwOnError: false
  });
}
