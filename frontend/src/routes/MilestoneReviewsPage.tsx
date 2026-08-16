/**
 * Public milestone review hub.
 *
 * Milestone proofs are visible to every platform visitor. Wallet connection is
 * only required for personalized voting power and for casting a vote.
 */

import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import { motion } from "framer-motion";
import {
  AlertCircle,
  CheckCircle,
  ExternalLink,
  FileText,
  Search,
  TrendingUp,
  Users,
  Zap
} from "lucide-react";
import { api, type MilestoneReviewItem, type QVEligibilityResponse } from "@/lib/api";
import { QVVotingPanel } from "@/components/QVVotingPanel";
import { QVResultsDisplay } from "@/components/QVResultsDisplay";
import { QVPowerExplainer } from "@/components/QVPowerExplainer";
import { QV_QUERY_KEYS, formatQVPower } from "@/hooks/useQuadraticVoting";
import { Badge, Button, EmptyState, GlassCard, Skeleton } from "@/components/ui";

type ReviewFilter = "open" | "pending" | "voted" | "all";

function shortAddress(address: string) {
  return `${address.slice(0, 10)}...${address.slice(-6)}`;
}

function QVMilestoneResults({
  campaignAddress,
  milestoneIndex,
  milestoneTitle
}: {
  campaignAddress: string;
  milestoneIndex: number;
  milestoneTitle?: string;
}) {
  const { data: stats, isLoading } = useQuery({
    queryKey: QV_QUERY_KEYS.stats(campaignAddress, milestoneIndex),
    queryFn: () => api.getCampaignVotingStats(campaignAddress, milestoneIndex),
    refetchInterval: 15_000,
    staleTime: 5_000
  });

  return <QVResultsDisplay stats={stats} isLoading={isLoading} milestoneTitle={milestoneTitle} />;
}

function CampaignReviewCard({
  review,
  eligibility
}: {
  review: MilestoneReviewItem;
  eligibility?: QVEligibilityResponse;
}) {
  const [showExplainer, setShowExplainer] = useState(false);
  const queryClient = useQueryClient();

  const userDonationPOL = Number.parseFloat(eligibility?.donationTotalPOL || "0");
  const userQVPowerDisplay = eligibility?.qvPowerDisplay || "0.0000";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <GlassCard className="overflow-hidden hover:border-white/[0.12] transition-all">
        <div className="p-5 border-b border-white/[0.06]">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h3 className="text-lg font-semibold text-slate-100 truncate">
                  {review.campaignTitle}
                </h3>
                <Badge variant={eligibility?.hasVoted ? "success" : "primary"}>
                  {eligibility?.hasVoted ? "Vote Recorded" : "Review Open"}
                </Badge>
              </div>
              <p className="text-sm text-slate-400">
                Milestone #{review.milestoneIndex + 1}: {review.milestoneTitle}
              </p>
              <div className="flex items-center gap-3 mt-2 text-xs text-slate-500 flex-wrap">
                <a
                  href={`https://amoy.polygonscan.com/address/${review.campaignAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 hover:text-primary-400"
                >
                  {shortAddress(review.campaignAddress)}
                  <ExternalLink className="w-3 h-3" />
                </a>
                <a
                  href={`https://gateway.pinata.cloud/ipfs/${review.proofCid}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-cyan-500 hover:text-cyan-400"
                >
                  <FileText className="w-3 h-3" />
                  View Proof
                </a>
              </div>
            </div>
            <Link to={`/campaign/${review.campaignAddress}`}>
              <Button variant="outline" size="sm">View Campaign</Button>
            </Link>
          </div>

          {eligibility && userDonationPOL > 0 && (
            <div className="mt-3 flex items-center gap-2 p-2.5 rounded-lg bg-violet-500/10 border border-violet-500/20">
              <Zap className="w-4 h-4 text-violet-400 flex-shrink-0" />
              <span className="text-xs text-violet-300">
                Your voting power on this campaign:{" "}
                <span className="font-mono font-semibold text-white">
                  {formatQVPower(userQVPowerDisplay)} votes
                </span>
                <span className="text-violet-400/60 ml-1">
                  (sqrt {userDonationPOL.toFixed(4)} POL)
                </span>
              </span>
            </div>
          )}
        </div>

        <div className="p-5 grid grid-cols-1 lg:grid-cols-2 gap-5">
          <QVVotingPanel
            campaignAddress={review.campaignAddress}
            milestoneIndex={review.milestoneIndex}
            milestoneTitle={review.milestoneTitle}
            ipfsProofHash={review.proofCid}
            onVoted={() => {
              queryClient.invalidateQueries({
                queryKey: QV_QUERY_KEYS.stats(review.campaignAddress, review.milestoneIndex)
              });
              queryClient.invalidateQueries({
                queryKey: QV_QUERY_KEYS.votes(review.campaignAddress, review.milestoneIndex)
              });
            }}
          />
          <QVMilestoneResults
            campaignAddress={review.campaignAddress}
            milestoneIndex={review.milestoneIndex}
            milestoneTitle={review.milestoneTitle}
          />
        </div>

        <div className="px-5 pb-5">
          <button
            onClick={() => setShowExplainer(!showExplainer)}
            className="flex items-center gap-2 text-xs text-slate-500 hover:text-slate-300 transition-colors"
          >
            <TrendingUp className="w-3.5 h-3.5" />
            {showExplainer ? "Hide" : "Show"} how Quadratic Voting works for this campaign
          </button>
          {showExplainer && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="mt-4"
            >
              <QVPowerExplainer currentDonationPOL={userDonationPOL || 1} compact />
            </motion.div>
          )}
        </div>
      </GlassCard>
    </motion.div>
  );
}

export function MilestoneReviewsPage() {
  const { address } = useAccount();
  const [filter, setFilter] = useState<ReviewFilter>("open");
  const [searchQuery, setSearchQuery] = useState("");

  const reviewsQuery = useQuery({
    queryKey: ["milestone-reviews", searchQuery],
    queryFn: () => api.listMilestoneReviews({ limit: 50, search: searchQuery || undefined }),
    staleTime: 20_000,
    refetchInterval: 30_000
  });

  const reviews = reviewsQuery.data?.items ?? [];

  const eligibilityQueries = useQueries({
    queries: reviews.map((review) => ({
      queryKey: QV_QUERY_KEYS.eligibility(
        review.campaignAddress,
        address || "",
        review.milestoneIndex
      ),
      queryFn: () => api.getVotingEligibility(review.campaignAddress, address!, review.milestoneIndex),
      enabled: Boolean(address),
      staleTime: 30_000,
      retry: 1
    }))
  });

  const eligibilityByReviewId = useMemo(() => {
    const map = new Map<string, QVEligibilityResponse>();
    reviews.forEach((review, index) => {
      const data = eligibilityQueries[index]?.data;
      if (data) {
        map.set(review.id, data);
      }
    });
    return map;
  }, [reviews, eligibilityQueries]);

  const filteredReviews = reviews.filter((review) => {
    const eligibility = eligibilityByReviewId.get(review.id);

    if (filter === "pending" && (!address || !eligibility?.eligible)) {
      return false;
    }

    if (filter === "voted" && (!address || !eligibility?.hasVoted)) {
      return false;
    }

    return true;
  });

  const stats = {
    total: reviews.length,
    pending: address
      ? reviews.filter((review) => eligibilityByReviewId.get(review.id)?.eligible).length
      : 0,
    voted: address
      ? reviews.filter((review) => eligibilityByReviewId.get(review.id)?.hasVoted).length
      : 0
  };

  return (
    <div className="page-container">
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold text-slate-100">Milestone Reviews</h1>
        <p className="text-slate-400 mt-1">
          Public milestone proof review board. Connect your wallet only when you are ready to vote.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-500/10">
              <FileText className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-100">{stats.total}</div>
              <div className="text-sm text-slate-400">Open Reviews</div>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10">
              <CheckCircle className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-100">{stats.pending}</div>
              <div className="text-sm text-slate-400">Your Pending Votes</div>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-violet-500/10">
              <Users className="w-5 h-5 text-violet-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-100">{stats.voted}</div>
              <div className="text-sm text-slate-400">Your Votes Cast</div>
            </div>
          </div>
        </GlassCard>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            id="milestone-reviews-search"
            type="text"
            placeholder="Search by campaign name or address..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-800/50 border border-white/[0.08] rounded-lg text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition-colors"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0">
          {(["open", "pending", "voted", "all"] as const).map((item) => (
            <button
              key={item}
              id={`milestone-filter-${item}`}
              onClick={() => setFilter(item)}
              className={`px-4 py-2 rounded-lg text-sm font-medium capitalize whitespace-nowrap transition-colors ${
                filter === item
                  ? "bg-primary-600 text-white shadow-glow-primary"
                  : "bg-slate-800/50 text-slate-400 hover:bg-slate-700/50 border border-white/[0.06]"
              }`}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      {!address && (
        <GlassCard className="mb-6 p-4 border-blue-500/20 bg-blue-500/5">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-400 mt-0.5" />
            <p className="text-sm text-slate-300">
              You are viewing public milestone proofs. Connect a donor wallet to see your voting
              eligibility and use the pending or voted filters.
            </p>
          </div>
        </GlassCard>
      )}

      {reviewsQuery.isLoading ? (
        <div className="space-y-4">
          {[...Array(2)].map((_, index) => (
            <GlassCard key={index} className="p-6">
              <Skeleton className="h-56 w-full" />
            </GlassCard>
          ))}
        </div>
      ) : reviewsQuery.isError ? (
        <EmptyState
          icon={<AlertCircle className="w-12 h-12" />}
          title="Milestone reviews unavailable"
          description={reviewsQuery.error instanceof Error ? reviewsQuery.error.message : "Unable to load public milestone reviews."}
        />
      ) : filteredReviews.length === 0 ? (
        <EmptyState
          icon={<CheckCircle className="w-12 h-12" />}
          title={reviews.length === 0 ? "No milestone proofs submitted yet" : "No reviews match this filter"}
          description={
            reviews.length === 0
              ? "When creators submit milestone proof, it will appear here for public review."
              : "Try another filter or search term."
          }
          action={
            reviews.length === 0 ? (
              <Link to="/explore">
                <Button variant="primary">Explore Campaigns</Button>
              </Link>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-6">
          {filteredReviews.map((review, index) => (
            <motion.div
              key={review.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04 }}
            >
              <CampaignReviewCard
                review={review}
                eligibility={eligibilityByReviewId.get(review.id)}
              />
            </motion.div>
          ))}
        </div>
      )}

      <div className="mt-10">
        <QVPowerExplainer currentDonationPOL={1} />
      </div>
    </div>
  );
}
