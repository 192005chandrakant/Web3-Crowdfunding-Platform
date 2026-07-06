import { motion, useReducedMotion } from "framer-motion";
import clsx from "clsx";
import {
  Lock,
  Play,
  Eye,
  Vote,
  CheckCircle2,
  XCircle,
  ArrowUpCircle,
  Star,
  ExternalLink,
  Calendar,
  Target,
  FileText,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { useState } from "react";
import { StatusChip } from "@/components/ui/StatusChip";
import type { MilestoneStatus } from "@/components/ui/StatusChip";
import { ProgressBar, Badge } from "@/components/ui";

export interface MilestoneData {
  id: string;
  index: number;
  title: string;
  description: string;
  targetAmount: string;
  currency?: string;
  status: MilestoneStatus;
  deadline?: string;
  /** 0–100 */
  progress?: number;
  /** Votes for approval */
  votesFor?: number;
  /** Votes against */
  votesAgainst?: number;
  fundsReleased?: string;
  evidenceLinks?: Array<{ label: string; url: string }>;
  txHash?: string;
}

const STATUS_ICON: Record<MilestoneStatus, React.ComponentType<{ className?: string }>> = {
  "locked":         Lock,
  "in-progress":    Play,
  "under-review":   Eye,
  "voting":         Vote,
  "approved":       CheckCircle2,
  "rejected":       XCircle,
  "funds-released": ArrowUpCircle,
  "completed":      Star
};

const STATUS_LINE_COLOR: Record<MilestoneStatus, string> = {
  "locked":         "bg-slate-700",
  "in-progress":    "bg-blockchain-500",
  "under-review":   "bg-warning-500",
  "voting":         "bg-secondary-500",
  "approved":       "bg-success-500",
  "rejected":       "bg-danger-500",
  "funds-released": "bg-primary-500",
  "completed":      "bg-success-400"
};

const STATUS_ICON_BG: Record<MilestoneStatus, string> = {
  "locked":         "bg-slate-800 border-slate-700 text-slate-500",
  "in-progress":    "bg-blockchain-500/20 border-blockchain-500/50 text-blockchain-400",
  "under-review":   "bg-warning-500/20 border-warning-500/50 text-warning-400",
  "voting":         "bg-secondary-500/20 border-secondary-500/50 text-secondary-400",
  "approved":       "bg-success-500/20 border-success-500/50 text-success-400",
  "rejected":       "bg-danger-500/20 border-danger-500/50 text-danger-400",
  "funds-released": "bg-primary-500/20 border-primary-500/50 text-primary-400",
  "completed":      "bg-success-400/25 border-success-400/60 text-success-300"
};

function VoteBar({ votesFor, votesAgainst }: { votesFor: number; votesAgainst: number }) {
  const total = votesFor + votesAgainst;
  const forPct = total === 0 ? 50 : Math.round((votesFor / total) * 100);

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs text-slate-400">
        <span className="text-success-400 font-medium">{votesFor} For</span>
        <span className="text-danger-400 font-medium">{votesAgainst} Against</span>
      </div>
      <div className="flex h-2 overflow-hidden rounded-full bg-danger-500/30">
        <div
          className="h-full rounded-l-full bg-success-500 transition-all duration-700"
          style={{ width: `${forPct}%` }}
        />
      </div>
      <p className="text-[10px] text-slate-500 text-right">{total} total votes</p>
    </div>
  );
}

function MilestoneItem({
  milestone,
  isLast,
  defaultExpanded
}: {
  milestone: MilestoneData;
  isLast: boolean;
  defaultExpanded?: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded ?? false);
  const prefersReducedMotion = useReducedMotion();
  const Icon = STATUS_ICON[milestone.status];
  const currency = milestone.currency ?? "MATIC";
  const isActive = milestone.status !== "locked";
  const hasDetails =
    milestone.description ||
    milestone.deadline ||
    milestone.votesFor != null ||
    (milestone.evidenceLinks?.length ?? 0) > 0 ||
    milestone.txHash;

  return (
    <div className="relative flex gap-4">
      {/* Connector line */}
      {!isLast && (
        <div
          className={clsx(
            "absolute left-5 top-10 bottom-0 w-0.5 -mb-4",
            isActive ? STATUS_LINE_COLOR[milestone.status] : "bg-slate-800"
          )}
          aria-hidden="true"
        />
      )}

      {/* Step icon */}
      <div
        className={clsx(
          "relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2",
          STATUS_ICON_BG[milestone.status]
        )}
        aria-label={`Milestone ${milestone.index + 1} status: ${milestone.status}`}
      >
        <Icon className="h-4 w-4" aria-hidden="true" />
      </div>

      {/* Content */}
      <div className="flex-1 pb-8">
        <div
          className={clsx(
            "rounded-xl border border-white/[0.08] bg-slate-800/50",
            isActive && "shadow-sm"
          )}
        >
          {/* Header */}
          <div
            className={clsx(
              "flex items-start justify-between gap-3 p-4",
              hasDetails && "cursor-pointer"
            )}
            onClick={() => hasDetails && setExpanded((v) => !v)}
            role={hasDetails ? "button" : undefined}
            aria-expanded={hasDetails ? expanded : undefined}
            tabIndex={hasDetails ? 0 : undefined}
            onKeyDown={(e) => {
              if (hasDetails && (e.key === "Enter" || e.key === " ")) {
                e.preventDefault();
                setExpanded((v) => !v);
              }
            }}
          >
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600">
                  Milestone {milestone.index + 1}
                </span>
                <StatusChip status={milestone.status} animated />
              </div>
              <h4 className="text-sm font-semibold text-slate-200 leading-snug">
                {milestone.title}
              </h4>
              <p className="mt-1 text-xs text-slate-500">
                Target: {milestone.targetAmount} {currency}
                {milestone.fundsReleased && (
                  <span className="ml-2 text-success-400">
                    · {milestone.fundsReleased} {currency} released
                  </span>
                )}
              </p>
            </div>

            {/* Right side */}
            <div className="flex items-center gap-2 shrink-0">
              {milestone.progress != null && (
                <div className="hidden sm:block">
                  <ProgressBar value={milestone.progress} size="sm" className="w-20" />
                </div>
              )}
              {hasDetails && (
                expanded
                  ? <ChevronUp className="h-4 w-4 text-slate-500" />
                  : <ChevronDown className="h-4 w-4 text-slate-500" />
              )}
            </div>
          </div>

          {/* Expandable details */}
          {hasDetails && (
            <motion.div
              initial={false}
              animate={{ height: expanded ? "auto" : 0, opacity: expanded ? 1 : 0 }}
              transition={
                prefersReducedMotion
                  ? { duration: 0 }
                  : { duration: 0.2, ease: "easeInOut" }
              }
              className="overflow-hidden"
            >
              <div className="border-t border-white/[0.06] px-4 pb-4 pt-3 space-y-3">
                {/* Description */}
                {milestone.description && (
                  <p className="text-xs leading-relaxed text-slate-400">
                    {milestone.description}
                  </p>
                )}

                {/* Deadline */}
                {milestone.deadline && (
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Deadline: {milestone.deadline}</span>
                  </div>
                )}

                {/* Voting */}
                {milestone.votesFor != null && milestone.votesAgainst != null && (
                  <VoteBar
                    votesFor={milestone.votesFor}
                    votesAgainst={milestone.votesAgainst}
                  />
                )}

                {/* Evidence */}
                {(milestone.evidenceLinks?.length ?? 0) > 0 && (
                  <div className="space-y-1.5">
                    <p className="flex items-center gap-1.5 text-xs font-medium text-slate-400">
                      <FileText className="h-3.5 w-3.5" />
                      Evidence
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {milestone.evidenceLinks!.map((link) => (
                        <a
                          key={link.url}
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-lg border border-blockchain-500/25 bg-blockchain-500/10 px-2.5 py-1 text-xs text-blockchain-400 hover:bg-blockchain-500/20 transition-colors"
                        >
                          {link.label}
                          <ExternalLink className="h-3 w-3" aria-hidden="true" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* TX Hash */}
                {milestone.txHash && (
                  <div className="rounded-lg bg-slate-900/60 px-3 py-2">
                    <p className="text-[10px] uppercase tracking-widest text-slate-600 mb-1">
                      Transaction
                    </p>
                    <code className="font-mono text-[11px] text-slate-400 break-all">
                      {milestone.txHash}
                    </code>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

interface MilestoneTimelineProps {
  milestones: MilestoneData[];
  className?: string;
}

export function MilestoneTimeline({ milestones, className }: MilestoneTimelineProps) {
  if (milestones.length === 0) {
    return (
      <div className={clsx("text-center py-8 text-sm text-slate-500", className)}>
        No milestones defined for this campaign.
      </div>
    );
  }

  const activeIndex = milestones.findIndex(
    (m) => m.status !== "completed" && m.status !== "funds-released"
  );

  return (
    <div className={clsx("space-y-0", className)} aria-label="Milestone timeline">
      {milestones.map((milestone, idx) => (
        <MilestoneItem
          key={milestone.id}
          milestone={milestone}
          isLast={idx === milestones.length - 1}
          defaultExpanded={idx === activeIndex}
        />
      ))}
    </div>
  );
}
