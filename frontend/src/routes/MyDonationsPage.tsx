import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Search, ExternalLink, TrendingUp, Heart, Clock, AlertTriangle, RefreshCw
} from 'lucide-react';
import { motion } from 'framer-motion';
import { GlassCard, Button, Badge, EmptyState, Skeleton, StatusChip } from '@/components/ui';
import { useAccount } from 'wagmi';
import { formatEther } from 'viem';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function MyDonationsPage() {
  const { address } = useAccount();
  const [searchQuery, setSearchQuery] = useState('');

  const { data: donationsResponse, isLoading: isLoadingDonations } = useQuery({
    queryKey: ['donations', address],
    queryFn: () => api.listDonationsByWallet(address!),
    enabled: !!address,
  });

  const { data: statsResponse, isLoading: isLoadingStats } = useQuery({
    queryKey: ['donationStats', address],
    queryFn: () => api.getDonationStats(address!),
    enabled: !!address,
  });

  const donations = donationsResponse?.items || [];
  const stats = statsResponse?.stats || {
    totalDonations: 0,
    uniqueCampaignCount: 0,
    totalAmountWei: '0'
  };

  const isLoading = isLoadingDonations || isLoadingStats;

  // Apply search filter
  const filteredDonations = donations.filter((donation) =>
    searchQuery === '' ||
    donation.campaign?.title?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Derived stats
  const totalDonated = parseFloat(formatEther(BigInt(stats.totalAmountWei || 0)));
  const campaignsSupported = stats.uniqueCampaignCount;
  const totalCount = stats.totalDonations;

  return (
    <div className="page-container">
      {/* Header */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-slate-100">My Donations</h1>
          <p className="text-slate-400 mt-1">Track your contributions and campaign progress</p>
        </div>
        <Link to="/explore">
          <Button id="my-donations-explore-btn" variant="primary" leadingIcon={<Heart className="w-4 h-4" />}>
            Discover Campaigns
          </Button>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary-500/10">
              <Heart className="w-5 h-5 text-primary-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-100">
                {totalDonated.toFixed(4)}
              </div>
              <div className="text-sm text-slate-400">MATIC Donated</div>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-secondary-500/10">
              <TrendingUp className="w-5 h-5 text-secondary-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-100">{campaignsSupported}</div>
              <div className="text-sm text-slate-400">Campaigns Supported</div>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10">
              <Clock className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-100">{totalCount}</div>
              <div className="text-sm text-slate-400">Total Transactions</div>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            id="my-donations-search"
            type="text"
            placeholder="Search donations by campaign name…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-800/50 border border-white/[0.08] rounded-lg text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition-colors"
          />
        </div>
      </div>

      {/* Donation List */}
      {isLoading ? (
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <GlassCard key={i} className="p-6">
              <div className="flex gap-6">
                <Skeleton className="w-24 h-24 rounded-lg flex-shrink-0" />
                <div className="flex-1 space-y-3">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      ) : filteredDonations.length === 0 ? (
        <EmptyState
          icon={<Heart className="w-12 h-12" />}
          title={donations.length === 0 ? 'No donations yet' : 'No donations found'}
          description={
            donations.length === 0
              ? 'Start supporting meaningful projects and make a difference.'
              : 'No donations match your search. Try different keywords.'
          }
          action={
            donations.length === 0 ? (
              <Link to="/explore">
                <Button variant="primary" leadingIcon={<Heart className="w-4 h-4" />}>
                  Explore Campaigns
                </Button>
              </Link>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-4">
          {filteredDonations.map((donation, index) => (
            <motion.div
              key={donation._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <GlassCard className="p-6 hover:border-white/[0.12] transition-all">
                <div className="flex flex-col lg:flex-row gap-6">
                  {/* Campaign Image */}
                  <Link
                    to={`/campaign/${donation.campaignAddress}`}
                    className="w-full lg:w-24 h-24 rounded-lg overflow-hidden flex-shrink-0 bg-gradient-to-br from-primary-600/20 to-secondary-600/20 hover:opacity-80 transition-opacity"
                  >
                    {donation.campaign?.coverImageUrl ? (
                      <img
                        src={donation.campaign.coverImageUrl}
                        alt={donation.campaign.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <TrendingUp className="w-8 h-8 text-primary-500/40" />
                      </div>
                    )}
                  </Link>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex-1">
                        <Link
                          to={`/campaign/${donation.campaignAddress}`}
                          className="text-xl font-semibold text-slate-100 hover:text-primary-300 transition-colors"
                        >
                          {donation.campaign?.title || 'Unknown Campaign'}
                        </Link>
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          <Badge variant="primary">{donation.amount} MATIC</Badge>
                          <StatusChip status={donation.status as any} />
                          {donation.campaign?.category && (
                            <Badge variant="secondary" className="capitalize">
                              {donation.campaign.category}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Transaction & Actions */}
                    <div className="flex flex-wrap items-center justify-between gap-4 mt-4">
                      <div className="flex flex-wrap items-center gap-4 text-sm text-slate-400">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          {new Date(donation.createdAt).toLocaleDateString('en-US', {
                            year: 'numeric', month: 'short', day: 'numeric'
                          })}
                        </div>
                        <a
                          href={`https://amoy.polygonscan.com/tx/${donation.txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 hover:text-primary-400 transition-colors"
                          title="View on Polygonscan"
                        >
                          <span className="font-mono text-xs">
                            {donation.txHash.slice(0, 10)}…{donation.txHash.slice(-8)}
                          </span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>

                      <div className="flex gap-2">
                        <Link to={`/campaign/${donation.campaignAddress}`}>
                          <Button variant="outline" size="sm">View Campaign</Button>
                        </Link>
                        {donation.status === 'failed' && (
                          <Button variant="ghost" size="sm" leadingIcon={<RefreshCw className="w-4 h-4" />} disabled>
                            Refunded
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      )}

      {/* Info card */}
      {donations.length > 0 && (
        <GlassCard className="mt-8 p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-lg bg-blue-500/10 flex-shrink-0">
              <AlertTriangle className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-200 mb-2">About Refunds</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Your donations are held in secure smart contract escrow until milestones are completed.
                If a campaign is cancelled before milestone completion, you may be eligible for a refund.
                Refund eligibility depends on campaign status and milestone verification.
              </p>
            </div>
          </div>
        </GlassCard>
      )}
    </div>
  );
}
