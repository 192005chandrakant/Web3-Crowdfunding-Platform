import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Search, ThumbsUp, ThumbsDown, FileText, ExternalLink,
  Clock, CheckCircle, XCircle, AlertCircle, Loader2
} from 'lucide-react';
import { motion } from 'framer-motion';
import { GlassCard, Button, Badge, EmptyState, Skeleton } from '@/components/ui';
import { useAccount } from 'wagmi';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useCampaignContractActions } from '@/hooks/useCampaignContract';
import toast from 'react-hot-toast';

type ReviewFilter = 'pending' | 'voted' | 'all';

// Inner component so we can call hooks per campaign
function VoteButtons({
  contractAddress,
  milestoneIndex,
  hasVoted,
  userVote,
  onVoted
}: {
  contractAddress: string;
  milestoneIndex: number;
  hasVoted: boolean;
  userVote?: 'approve' | 'reject';
  onVoted: () => void;
}) {
  const { voteOnMilestone, isPending } = useCampaignContractActions(contractAddress as `0x${string}`);

  const handleVote = async (support: boolean) => {
    try {
      const hash = await voteOnMilestone(milestoneIndex, support);
      toast.success(`Vote submitted! Tx: ${hash.slice(0, 10)}…`);
      onVoted();
    } catch (err: any) {
      toast.error(err?.shortMessage ?? err?.message ?? 'Transaction failed');
    }
  };

  if (hasVoted) {
    return (
      <div className="flex items-center gap-2">
        {userVote === 'approve' ? (
          <Badge variant="success" className="flex items-center gap-1">
            <CheckCircle className="w-3 h-3" /> Approved
          </Badge>
        ) : (
          <Badge variant="danger" className="flex items-center gap-1">
            <XCircle className="w-3 h-3" /> Rejected
          </Badge>
        )}
        <span className="text-xs text-slate-500">You already voted</span>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <Button
        id={`vote-approve-${contractAddress}-${milestoneIndex}`}
        variant="primary"
        size="sm"
        leadingIcon={isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ThumbsUp className="w-4 h-4" />}
        onClick={() => handleVote(true)}
        disabled={isPending}
      >
        Approve
      </Button>
      <Button
        id={`vote-reject-${contractAddress}-${milestoneIndex}`}
        variant="ghost"
        size="sm"
        leadingIcon={<ThumbsDown className="w-4 h-4" />}
        onClick={() => handleVote(false)}
        disabled={isPending}
        className="border border-red-500/30 text-red-400 hover:bg-red-500/10"
      >
        Reject
      </Button>
    </div>
  );
}

export function MilestoneReviewsPage() {
  const { address } = useAccount();
  const [filter, setFilter] = useState<ReviewFilter>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const queryClient = useQueryClient();

  // Fetch campaigns the user has donated to
  const { data: donationsData, isLoading } = useQuery({
    queryKey: ['donations', address],
    queryFn: () => api.listDonationsByWallet(address!),
    enabled: !!address
  });

  const donations = donationsData?.items ?? [];

  // Derive unique campaigns with active milestones from donation data
  // (In a production build, a dedicated backend endpoint would be more efficient)
  const uniqueCampaignAddresses = [...new Set(donations.map((d) => d.campaignAddress))];

  // Build review items from donation data — each unique campaign/milestone combo
  type ReviewItem = {
    id: string;
    campaignAddress: string;
    campaignTitle: string;
    milestoneIndex: number;
    hasVoted: boolean;
    userVote?: 'approve' | 'reject';
  };

  // For now, show a summary per campaign (blockchain detail would require per-campaign RPC calls)
  const reviewItems: ReviewItem[] = uniqueCampaignAddresses.map((addr) => {
    const donation = donations.find((d) => d.campaignAddress === addr)!;
    return {
      id: addr,
      campaignAddress: addr,
      campaignTitle: donation.campaign?.title ?? `Campaign ${addr.slice(0, 8)}…`,
      milestoneIndex: 0, // Default to current milestone index 0
      hasVoted: false,
      userVote: undefined
    };
  });

  const filteredReviews = reviewItems.filter((r) => {
    const matchesFilter =
      filter === 'all' ||
      (filter === 'pending' && !r.hasVoted) ||
      (filter === 'voted' && r.hasVoted);
    const matchesSearch =
      searchQuery === '' ||
      r.campaignTitle.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const stats = {
    pending: reviewItems.filter((r) => !r.hasVoted).length,
    voted: reviewItems.filter((r) => r.hasVoted).length,
    total: reviewItems.length,
  };

  if (!address) {
    return (
      <div className="page-container flex min-h-[60vh] items-center justify-center">
        <GlassCard className="p-8 max-w-md text-center">
          <AlertCircle className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2 text-slate-100">Wallet Not Connected</h2>
          <p className="text-slate-400">Connect your wallet to review milestones.</p>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold text-slate-100">Milestone Reviews</h1>
        <p className="text-slate-400 mt-1">Review milestone evidence and vote on fund releases</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-yellow-500/10">
              <Clock className="w-5 h-5 text-yellow-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-100">{stats.pending}</div>
              <div className="text-sm text-slate-400">Pending Reviews</div>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10">
              <CheckCircle className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-100">{stats.voted}</div>
              <div className="text-sm text-slate-400">Already Voted</div>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary-500/10">
              <FileText className="w-5 h-5 text-primary-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-100">{stats.total}</div>
              <div className="text-sm text-slate-400">Campaigns Supported</div>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            id="milestone-reviews-search"
            type="text"
            placeholder="Search by campaign name…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-800/50 border border-white/[0.08] rounded-lg text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition-colors"
          />
        </div>
        <div className="flex gap-2">
          {(['pending', 'voted', 'all'] as const).map((f) => (
            <button
              key={f}
              id={`milestone-filter-${f}`}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
                filter === f
                  ? 'bg-primary-600 text-white shadow-glow-primary'
                  : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700/50 border border-white/[0.06]'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <GlassCard key={i} className="p-6">
              <Skeleton className="h-32 w-full" />
            </GlassCard>
          ))}
        </div>
      ) : filteredReviews.length === 0 ? (
        <EmptyState
          icon={<CheckCircle className="w-12 h-12" />}
          title={reviewItems.length === 0 ? 'No campaigns to review' : 'All caught up!'}
          description={
            reviewItems.length === 0
              ? 'Donate to campaigns to become eligible to vote on their milestone approvals.'
              : 'No reviews match your current filter.'
          }
          action={
            reviewItems.length === 0 ? (
              <Link to="/explore">
                <Button variant="primary">Explore Campaigns</Button>
              </Link>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-4">
          {filteredReviews.map((review, index) => (
            <motion.div
              key={review.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <GlassCard className="p-6 hover:border-white/[0.12] transition-all">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <h3 className="text-lg font-semibold text-slate-100">
                        {review.campaignTitle}
                      </h3>
                      <Badge variant={review.hasVoted ? 'success' : 'warning'}>
                        {review.hasVoted ? 'Voted' : 'Pending'}
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-400 mb-3">
                      Milestone #{review.milestoneIndex + 1} — Vote to approve or reject this milestone's proof submission
                    </p>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                      <span className="font-mono">
                        {review.campaignAddress.slice(0, 12)}…{review.campaignAddress.slice(-8)}
                      </span>
                      <a
                        href={`https://amoy.polygonscan.com/address/${review.campaignAddress}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 hover:text-primary-400 transition-colors"
                      >
                        Polygonscan <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 flex-shrink-0">
                    <Link to={`/campaign/${review.campaignAddress}`}>
                      <Button variant="outline" size="sm">View Campaign</Button>
                    </Link>
                    <VoteButtons
                      contractAddress={review.campaignAddress}
                      milestoneIndex={review.milestoneIndex}
                      hasVoted={review.hasVoted}
                      userVote={review.userVote}
                      onVoted={() => queryClient.invalidateQueries({ queryKey: ['donations', address] })}
                    />
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      )}

      {/* Info callout */}
      <GlassCard className="mt-8 p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-lg bg-blue-500/10 flex-shrink-0">
            <AlertCircle className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-200 mb-2">How Milestone Voting Works</h3>
            <ul className="text-sm text-slate-400 space-y-1 leading-relaxed">
              <li>• Donors who contributed to a campaign can vote on milestone approvals</li>
              <li>• The campaign creator submits proof of milestone completion (uploaded to IPFS)</li>
              <li>• If the majority approves, funds are released to the creator for that milestone</li>
              <li>• If rejected, the proof can be revised and resubmitted</li>
              <li>• Voting is gas-free on Polygon Amoy testnet</li>
            </ul>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
