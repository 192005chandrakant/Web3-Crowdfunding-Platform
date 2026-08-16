/**
 * QVVotingPanel — The main premium voting interaction panel
 *
 * Integrates with useQuadraticVoting hook to show:
 * - User's QV power with animated display
 * - Formula: "Your donation: X POL → √X = Y votes"
 * - Approve / Reject buttons with QV weight preview
 * - Sybil resistance badge
 * - Eligibility states (not donated, below threshold, already voted)
 * - Real-time vote submission feedback
 */

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ThumbsUp, ThumbsDown, Zap, Shield, CheckCircle, XCircle,
  AlertTriangle, Loader2, Lock, Info, FileCheck, ExternalLink
} from "lucide-react";
import { GlassCard, Badge, Button } from "@/components/ui";
import { useQuadraticVoting, formatQVPower, MIN_CONTRIBUTION_POL } from "@/hooks/useQuadraticVoting";
import toast from "react-hot-toast";
import { useAccount } from "wagmi";

interface QVVotingPanelProps {
  campaignAddress: string;
  milestoneIndex: number;
  milestoneTitle?: string;
  ipfsProofHash?: string;
  /** Callback after successful vote */
  onVoted?: (support: boolean, txHash: string) => void;
  className?: string;
}

type VoteIntent = "approve" | "reject" | null;

export function QVVotingPanel({
  campaignAddress,
  milestoneIndex,
  milestoneTitle,
  ipfsProofHash,
  onVoted,
  className = ""
}: QVVotingPanelProps) {
  const [voteIntent, setVoteIntent] = useState<VoteIntent>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { address: walletAddress } = useAccount();

  const {
    eligibility,
    isLoadingEligibility,
    canVote,
    hasVoted,
    userVoteDirection,
    userQVPower,
    castVote,
    isVotePending,
    isEligibilityError,
    eligibilityError
  } = useQuadraticVoting({ campaignAddress, milestoneIndex });

  const isLoading = isLoadingEligibility || isVotePending || isSubmitting;

  const handleVote = async (support: boolean) => {
    if (isLoading) return;
    setIsSubmitting(true);
    const toastId = toast.loading(
      `Submitting ${support ? "Approve" : "Reject"} vote on-chain…`,
      { icon: "⚡" }
    );

    try {
      const hash = await castVote(support);
      toast.dismiss(toastId);
      toast.success(
        `Vote cast! ${support ? "✅ Approved" : "❌ Rejected"} with ${formatQVPower(userQVPower)} QV votes`,
        { duration: 6000 }
      );
      setVoteIntent(null);
      onVoted?.(support, hash);
    } catch (err: any) {
      toast.dismiss(toastId);
      const msg = err?.shortMessage ?? err?.message ?? "Vote failed";
      if (!msg.toLowerCase().includes("user rejected")) {
        toast.error(msg, { duration: 5000 });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── Render states ────────────────────────────────────────────────────────

  if (isLoadingEligibility) {
    return (
      <GlassCard className={`p-6 ${className}`}>
        <div className="flex items-center justify-center gap-3 py-4">
          <Loader2 className="w-5 h-5 text-violet-400 animate-spin" />
          <span className="text-sm text-slate-400">Checking voting eligibility…</span>
        </div>
      </GlassCard>
    );
  }

  if (!walletAddress) {
    return (
      <GlassCard className={`p-6 ${className}`}>
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-blue-500/15 flex-shrink-0">
            <Lock className="w-5 h-5 text-blue-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-slate-100 text-sm">Connect Wallet to Vote</p>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Everyone can review this milestone proof publicly. Connect the wallet you donated with to see your QV power and cast a vote.
            </p>
          </div>
        </div>
      </GlassCard>
    );
  }

  if (isEligibilityError) {
    return (
      <GlassCard className={`p-6 ${className}`}>
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-red-500/15 flex-shrink-0">
            <AlertTriangle className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <p className="font-semibold text-slate-100 text-sm">Voting Power Unavailable</p>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              {eligibilityError instanceof Error
                ? eligibilityError.message
                : "Unable to load your voting eligibility. Please try again."}
            </p>
          </div>
        </div>
      </GlassCard>
    );
  }

  // Already voted
  if (hasVoted) {
    return (
      <GlassCard className={`p-6 ${className}`}>
        <div className="flex items-center gap-3 mb-4">
          <div className={`p-2 rounded-lg ${
            userVoteDirection ? "bg-emerald-500/20" : "bg-red-500/20"
          }`}>
            {userVoteDirection ? (
              <CheckCircle className="w-5 h-5 text-emerald-400" />
            ) : (
              <XCircle className="w-5 h-5 text-red-400" />
            )}
          </div>
          <div>
            <p className="font-semibold text-slate-100 text-sm">
              You voted{" "}
              <span className={userVoteDirection ? "text-emerald-400" : "text-red-400"}>
                {userVoteDirection ? "Approve" : "Reject"}
              </span>
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              {milestoneTitle && `on ${milestoneTitle} · `}
              QV power used: <span className="font-mono text-violet-300">{formatQVPower(userQVPower)}</span> votes
            </p>
          </div>
        </div>

        {/* QV power breakdown */}
        <div className="p-3 rounded-xl bg-slate-800/40 border border-white/[0.06]">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Zap className="w-3.5 h-3.5 text-violet-400" />
            <span>
              √({eligibility?.donationTotalPOL || "0"} POL) ={" "}
              <span className="text-violet-300 font-semibold font-mono">
                {formatQVPower(userQVPower)} QV votes
              </span>{" "}
              cast
            </span>
          </div>
        </div>
      </GlassCard>
    );
  }

  // Not eligible
  if (eligibility && !eligibility.eligible) {
    return (
      <GlassCard className={`p-6 ${className}`}>
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-amber-500/15 flex-shrink-0">
            <Lock className="w-5 h-5 text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-slate-100 text-sm">Cannot Vote</p>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              {eligibility.reason}
            </p>
            {!eligibility.isSybilSafe && (
              <div className="mt-3 p-2.5 rounded-lg bg-red-500/10 border border-red-500/20">
                <div className="flex items-center gap-1.5 text-xs text-red-300">
                  <Shield className="w-3.5 h-3.5" />
                  Sybil resistance check failed. Verify your identity to participate.
                </div>
              </div>
            )}
            {BigInt(eligibility.donationTotalWei || "0") === 0n && (
              <div className="mt-3 p-2.5 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <p className="text-xs text-blue-300">
                  Donate at least <span className="font-mono font-semibold">{MIN_CONTRIBUTION_POL} POL</span> to
                  gain voting rights on this campaign.
                </p>
              </div>
            )}
          </div>
        </div>
      </GlassCard>
    );
  }

  // ─── Main voting panel (eligible) ─────────────────────────────────────────
  const donationPOL = parseFloat(eligibility?.donationTotalPOL || "0");

  return (
    <GlassCard className={`overflow-hidden ${className}`}>
      {/* QV Power header */}
      <div className="p-5 bg-gradient-to-br from-violet-500/15 to-purple-500/5 border-b border-white/[0.06]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-widest text-slate-500">Your Voting Power</p>
            <div className="flex items-baseline gap-2 mt-1">
              <motion.span
                className="text-3xl font-bold text-white font-mono"
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                {formatQVPower(userQVPower)}
              </motion.span>
              <span className="text-sm text-violet-300 font-medium">votes</span>
            </div>
          </div>

          <div className="text-right">
            {/* Sybil badge */}
            <Badge
              variant={eligibility?.verificationLevel === "world_id" ? "success" : "default"}
              className="flex items-center gap-1 text-xs"
            >
              <Shield className="w-3 h-3" />
              {eligibility?.verificationLevel === "world_id"
                ? "World ID"
                : eligibility?.verificationLevel === "gitcoin"
                ? "Gitcoin"
                : "Testnet"}
            </Badge>
          </div>
        </div>

        {/* Formula breakdown */}
        <div className="mt-3 flex items-center gap-2 font-mono text-xs text-slate-400">
          <span>{donationPOL.toFixed(4)} POL</span>
          <span className="text-slate-400">→</span>
          <span className="text-violet-400">√({donationPOL.toFixed(2)})</span>
          <span className="text-slate-400">=</span>
          <span className="text-white font-semibold">{formatQVPower(userQVPower)} votes</span>
        </div>
      </div>

      <div className="p-5 space-y-4">
        {milestoneTitle && (
          <p className="text-sm text-slate-300">
            Cast your vote for <span className="font-semibold text-slate-100">"{milestoneTitle}"</span>
          </p>
        )}

        {/* Inline Evidence Viewer */}
        {ipfsProofHash ? (
          <div className="p-4 rounded-xl border border-blue-500/30 bg-blue-500/10 space-y-3">
            <div className="flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-blue-400" />
              <h4 className="text-sm font-semibold text-blue-100">Cryptographic Completion Proof</h4>
            </div>
            <p className="text-xs text-blue-200/80 leading-relaxed">
              The creator has submitted evidence for this milestone. Review the proof before making your voting decision.
            </p>
            <a
              href={`https://ipfs.io/ipfs/${ipfsProofHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium transition-colors shadow-glow-sm"
            >
              <span>View Evidence Document</span>
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        ) : (
          <div className="p-3 rounded-lg bg-slate-800/50 border border-white/[0.06] text-xs text-slate-400 italic text-center">
            No completion proof submitted yet.
          </div>
        )}

        {/* Confirmation step */}
        <AnimatePresence>
          {voteIntent && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`p-4 rounded-xl border ${
                voteIntent === "approve"
                  ? "bg-emerald-500/10 border-emerald-500/30"
                  : "bg-red-500/10 border-red-500/50 dark:border-red-500/40 dark:border-red-500/30"
              }`}
            >
              <div className="flex items-start gap-3">
                <Info className={`w-4 h-4 flex-shrink-0 mt-0.5 ${
                  voteIntent === "approve" ? "text-emerald-400" : "text-red-400"
                }`} />
                <div>
                  <p className={`text-sm font-semibold ${
                    voteIntent === "approve" ? "text-emerald-300" : "text-red-300"
                  }`}>
                    Confirm {voteIntent === "approve" ? "Approval" : "Rejection"}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    You will cast <span className="font-mono text-white font-semibold">
                      {formatQVPower(userQVPower)} QV votes
                    </span> to {voteIntent === "approve" ? "approve" : "reject"} this milestone.
                    This action is permanent and recorded on-chain.
                  </p>
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setVoteIntent(null)}
                  disabled={isLoading}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  variant={voteIntent === "approve" ? "primary" : "ghost"}
                  className={`flex-1 ${
                    voteIntent === "reject"
                      ? "border border-red-500/50 dark:border-red-500/40 text-red-300 hover:bg-red-500/10"
                      : ""
                  }`}
                  leadingIcon={isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : undefined}
                  onClick={() => handleVote(voteIntent === "approve")}
                  disabled={isLoading}
                >
                  {isLoading ? "Confirming…" : `Yes, ${voteIntent === "approve" ? "Approve" : "Reject"}`}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Vote buttons */}
        {!voteIntent && (
          <div className="grid grid-cols-2 gap-3">
            <button
              id={`qv-approve-${campaignAddress}-${milestoneIndex}`}
              onClick={() => setVoteIntent("approve")}
              disabled={isLoading || !canVote}
              className={`
                group relative p-4 rounded-xl border-2 transition-all duration-200
                flex flex-col items-center gap-2
                ${canVote
                  ? "border-emerald-500/40 bg-emerald-500/5 hover:bg-emerald-500/15 hover:border-emerald-400/60 cursor-pointer"
                  : "border-slate-700/50 bg-slate-800/20 cursor-not-allowed opacity-50"
                }
              `}
            >
              <div className={`p-2.5 rounded-full transition-colors ${
                canVote ? "bg-emerald-500/20 group-hover:bg-emerald-500/30" : "bg-slate-700/30"
              }`}>
                <ThumbsUp className={`w-6 h-6 ${canVote ? "text-emerald-400" : "text-slate-500"}`} />
              </div>
              <span className={`text-sm font-semibold ${canVote ? "text-emerald-300" : "text-slate-500"}`}>
                Approve
              </span>
              <span className={`text-xs font-mono ${canVote ? "text-emerald-400/70" : "text-slate-400"}`}>
                +{formatQVPower(userQVPower)} QV
              </span>
            </button>

            <button
              id={`qv-reject-${campaignAddress}-${milestoneIndex}`}
              onClick={() => setVoteIntent("reject")}
              disabled={isLoading || !canVote}
              className={`
                group relative p-4 rounded-xl border-2 transition-all duration-200
                flex flex-col items-center gap-2
                ${canVote
                  ? "border-red-500/50 dark:border-red-500/40 bg-red-500/5 hover:bg-red-500/15 hover:border-red-400/60 cursor-pointer"
                  : "border-slate-700/50 bg-slate-800/20 cursor-not-allowed opacity-50"
                }
              `}
            >
              <div className={`p-2.5 rounded-full transition-colors ${
                canVote ? "bg-red-500/20 group-hover:bg-red-500/30" : "bg-slate-700/30"
              }`}>
                <ThumbsDown className={`w-6 h-6 ${canVote ? "text-red-400" : "text-slate-500"}`} />
              </div>
              <span className={`text-sm font-semibold ${canVote ? "text-red-300" : "text-slate-500"}`}>
                Reject
              </span>
              <span className={`text-xs font-mono ${canVote ? "text-red-400/70" : "text-slate-400"}`}>
                +{formatQVPower(userQVPower)} QV
              </span>
            </button>
          </div>
        )}

        {/* QV disclaimer */}
        <div className="flex items-start gap-2 text-xs text-slate-500">
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-amber-500/60" />
          <span>
            Votes are permanent and gas-cost on Polygon Amoy. Each voter gets exactly one vote per milestone.
          </span>
        </div>
      </div>
    </GlassCard>
  );
}
