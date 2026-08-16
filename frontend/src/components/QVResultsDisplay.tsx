/**
 * QVResultsDisplay — Real-time Quadratic Voting results visualization
 *
 * Shows:
 * - Animated approval/rejection bars (QV weight, not voter count)
 * - Voter count vs QV weight comparison
 * - Participation rate
 * - Live "Approved" / "Rejected" verdict badge
 */

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, XCircle, Users, Zap, TrendingUp, RefreshCw } from "lucide-react";
import { GlassCard, Badge } from "@/components/ui";
import type { QVStatsResponse } from "@/lib/api";

interface QVResultsDisplayProps {
  stats: QVStatsResponse | undefined;
  isLoading?: boolean;
  milestoneTitle?: string;
  className?: string;
}

export function QVResultsDisplay({
  stats,
  isLoading,
  milestoneTitle,
  className = ""
}: QVResultsDisplayProps) {
  if (isLoading) {
    return (
      <GlassCard className={`p-6 ${className}`}>
        <div className="space-y-4 animate-pulse">
          <div className="h-4 bg-slate-700/50 rounded w-1/3" />
          <div className="h-8 bg-slate-700/50 rounded" />
          <div className="h-8 bg-slate-700/50 rounded" />
          <div className="h-16 bg-slate-700/50 rounded" />
        </div>
      </GlassCard>
    );
  }

  if (!stats) {
    return (
      <GlassCard className={`p-6 text-center ${className}`}>
        <div className="flex flex-col items-center gap-3 py-4">
          <RefreshCw className="w-8 h-8 text-slate-500" />
          <p className="text-sm text-slate-400">No voting data yet for this milestone.</p>
        </div>
      </GlassCard>
    );
  }

  const totalVotedQV = parseFloat(stats.approvalQVDisplay || "0") + parseFloat(stats.rejectionQVDisplay || "0");
  const approvalPct = totalVotedQV > 0 ? (parseFloat(stats.approvalQVDisplay || "0") / totalVotedQV) * 100 : 0;
  const rejectionPct = totalVotedQV > 0 ? (parseFloat(stats.rejectionQVDisplay || "0") / totalVotedQV) * 100 : 0;

  return (
    <GlassCard className={`overflow-hidden ${className}`}>
      {/* Header */}
      <div className="p-5 border-b border-white/[0.06]">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="text-xs uppercase tracking-widest text-slate-500 mb-1">QV Vote Results</p>
            {milestoneTitle && (
              <h3 className="font-semibold text-slate-100 text-sm">{milestoneTitle}</h3>
            )}
          </div>

          {stats.totalVoters > 0 && (
            <AnimatePresence mode="wait">
              {stats.approved ? (
                <motion.div
                  key="approved"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                >
                  <Badge variant="success" className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold">
                    <CheckCircle className="w-3.5 h-3.5" />
                    APPROVED
                  </Badge>
                </motion.div>
              ) : (
                <motion.div
                  key="rejected"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                >
                  <Badge variant="danger" className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold">
                    <XCircle className="w-3.5 h-3.5" />
                    REJECTED
                  </Badge>
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>
      </div>

      <div className="p-5 space-y-5">
        {/* QV Weight Bars */}
        {stats.totalVoters === 0 ? (
          <div className="text-center py-6">
            <p className="text-slate-500 text-sm">Waiting for votes…</p>
            <p className="text-slate-400 text-xs mt-1">
              {stats.eligibleVoterCount} eligible voter{stats.eligibleVoterCount !== 1 ? "s" : ""}
            </p>
          </div>
        ) : (
          <>
            {/* Approve bar */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  <span className="text-sm font-medium text-slate-200">Approve</span>
                  <span className="text-xs text-slate-500">({stats.approvalVoterCount} voters)</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold text-emerald-400">
                    {parseFloat(stats.approvalQVDisplay || "0").toFixed(2)} votes
                  </span>
                  <span className="text-xs text-slate-500 ml-2">
                    {approvalPct.toFixed(1)}%
                  </span>
                </div>
              </div>
              <div className="relative h-3 bg-slate-800/60 rounded-full overflow-hidden">
                <motion.div
                  className="absolute left-0 top-0 h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${approvalPct}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                />
              </div>
            </div>

            {/* Reject bar */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-red-400" />
                  <span className="text-sm font-medium text-slate-200">Reject</span>
                  <span className="text-xs text-slate-500">({stats.rejectionVoterCount} voters)</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold text-red-400">
                    {parseFloat(stats.rejectionQVDisplay || "0").toFixed(2)} votes
                  </span>
                  <span className="text-xs text-slate-500 ml-2">
                    {rejectionPct.toFixed(1)}%
                  </span>
                </div>
              </div>
              <div className="relative h-3 bg-slate-800/60 rounded-full overflow-hidden">
                <motion.div
                  className="absolute left-0 top-0 h-full bg-gradient-to-r from-red-600 to-red-400 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${rejectionPct}%` }}
                  transition={{ duration: 0.8, ease: "easeOut", delay: 0.1 }}
                />
              </div>
            </div>
          </>
        )}

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-3 pt-2 border-t border-white/[0.06]">
          <div className="text-center p-3 rounded-xl bg-slate-800/30">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Users className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <div className="text-lg font-bold text-slate-100">{stats.totalVoters}</div>
            <div className="text-xs text-slate-500">Voted</div>
          </div>
          <div className="text-center p-3 rounded-xl bg-slate-800/30">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Zap className="w-3.5 h-3.5 text-violet-400" />
            </div>
            <div className="text-lg font-bold text-slate-100">{stats.eligibleVoterCount}</div>
            <div className="text-xs text-slate-500">Eligible</div>
          </div>
          <div className="text-center p-3 rounded-xl bg-slate-800/30">
            <div className="flex items-center justify-center gap-1 mb-1">
              <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
            </div>
            <div className="text-lg font-bold text-slate-100">
              {stats.participationPercent.toFixed(0)}%
            </div>
            <div className="text-xs text-slate-500">Participation</div>
          </div>
        </div>

        {/* QV fairness note */}
        <div className="px-3 py-2.5 rounded-lg bg-violet-500/10 border border-violet-500/20">
          <p className="text-xs text-violet-300 leading-relaxed">
            <span className="font-semibold">Quadratic Voting:</span> Each vote is weighted by √(your POL donation).
            Broad community support outweighs concentrated whale influence.
          </p>
        </div>
      </div>
    </GlassCard>
  );
}
