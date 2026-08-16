/**
 * React Query hooks for donation data.
 */
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { DonationListResponse, DonationStatsResponse, RecentDonationsResponse, DonorPortfolioResponse } from "@/lib/api";

// --- Donations by wallet
export function useDonationsByWallet(
  walletAddress: string | undefined,
  params?: { page?: number; limit?: number }
) {
  return useQuery<DonationListResponse, Error>({
    queryKey: ["donations", walletAddress, params],
    queryFn: () => {
      if (!walletAddress) throw new Error("No wallet address");
      return api.listDonationsByWallet(walletAddress, params);
    },
    enabled: !!walletAddress,
    staleTime: 5_000,
    refetchInterval: 5_000,
    refetchOnWindowFocus: true,
    retry: false
  });
}

// --- Donation stats by wallet
export function useDonationStats(walletAddress: string | undefined) {
  return useQuery<DonationStatsResponse, Error>({
    queryKey: ["donationStats", walletAddress],
    queryFn: () => {
      if (!walletAddress) throw new Error("No wallet address");
      return api.getDonationStats(walletAddress);
    },
    enabled: !!walletAddress,
    staleTime: 5_000,
    refetchInterval: 5_000,
    refetchOnWindowFocus: true,
    retry: false
  });
}

// --- Donations by campaign
export function useDonationsByCampaign(
  campaignAddress: string | undefined,
  params?: { page?: number; limit?: number }
) {
  return useQuery<DonationListResponse, Error>({
    queryKey: ["campaignDonations", campaignAddress, params],
    queryFn: () => {
      if (!campaignAddress) throw new Error("No campaign address");
      return api.listDonationsByCampaign(campaignAddress, params);
    },
    enabled: !!campaignAddress,
    staleTime: 30_000,
    retry: false
  });
}

// --- Recent donations for a campaign (lightweight feed)
export function useRecentCampaignDonations(
  campaignAddress: string | undefined,
  limit = 10
) {
  return useQuery<RecentDonationsResponse, Error>({
    queryKey: ["recentDonations", campaignAddress, limit],
    queryFn: () => {
      if (!campaignAddress) throw new Error("No campaign address");
      return api.getRecentDonations(campaignAddress, limit);
    },
    enabled: !!campaignAddress,
    staleTime: 15_000,
    refetchInterval: 30_000, // Auto-refresh every 30s for live feed
    retry: false
  });
}

// --- Donor portfolio metrics and active governance gates
export function useDonorPortfolio(walletAddress: string | undefined) {
  return useQuery<DonorPortfolioResponse, Error>({
    queryKey: ["donorPortfolio", walletAddress],
    queryFn: () => {
      if (!walletAddress) throw new Error("No wallet address");
      return api.getDonorPortfolio(walletAddress);
    },
    enabled: !!walletAddress,
    staleTime: 5_000,
    refetchInterval: 5_000,
    refetchOnWindowFocus: true,
    retry: false,
    throwOnError: false
  });
}
