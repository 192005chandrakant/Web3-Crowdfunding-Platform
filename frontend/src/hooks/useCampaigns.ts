/**
 * React Query hooks for campaign data.
 * Falls back gracefully when the backend is offline.
 */
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { CampaignListResponse, CampaignDetailResponse } from "@/lib/api";

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
