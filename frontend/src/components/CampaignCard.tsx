import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import clsx from "clsx";
import { Clock, Users, TrendingUp } from "lucide-react";
import { IdentityBadge, ProgressBar, Badge } from "@/components/ui";
import type { IdentityType } from "@/components/ui";

export interface CampaignCardData {
  id: string;
  title: string;
  description?: string;
  creator: string;
  creatorType: IdentityType;
  category?: string;
  /** Hero image URL — falls back to gradient placeholder */
  imageUrl?: string | null;
  /** Amount raised (display string) */
  raised: string;
  /** Funding goal (display string) */
  goal: string;
  /** Currency label */
  currency?: string;
  /** 0–100 */
  progress: number;
  daysLeft: number;
  donorCount?: number;
  milestoneCount?: number;
  isVerified?: boolean;
  isFeatured?: boolean;
}

interface CampaignCardProps {
  campaign: CampaignCardData;
  className?: string;
  /** Animate on mount via parent stagger */
  animate?: boolean;
}

/** Deterministic gradient per campaign id */
function getPlaceholderGradient(id: string): string {
  const gradients = [
    "from-primary-900 via-primary-800 to-secondary-900",
    "from-blockchain-900 via-blockchain-800 to-primary-900",
    "from-secondary-900 via-secondary-800 to-primary-900",
    "from-slate-800 via-primary-900 to-secondary-900"
  ];
  const index = id.split("").reduce((sum, c) => sum + c.charCodeAt(0), 0) % gradients.length;
  return gradients[index];
}

export function CampaignCard({ campaign, className, animate = true }: CampaignCardProps) {
  const currency = campaign.currency ?? "MATIC";
  const gradient = getPlaceholderGradient(campaign.id);

  const card = (
    <Link
      to={`/campaign/${campaign.id}`}
      className={clsx(
        "group relative flex flex-col overflow-hidden",
        "rounded-2xl border border-white/[0.08] bg-slate-800/50",
        "shadow-card transition-all duration-300",
        "hover:border-white/[0.16] hover:shadow-xl hover:-translate-y-1",
        campaign.isFeatured && "gradient-border",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-500/60",
        className
      )}
      aria-label={`View campaign: ${campaign.title}`}
    >
      {/* Hero image / placeholder */}
      <div className="relative h-48 overflow-hidden bg-slate-900">
        {campaign.imageUrl ? (
          <img
            src={campaign.imageUrl}
            alt={campaign.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className={clsx("h-full w-full bg-gradient-to-br", gradient)} />
        )}

        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/20 to-transparent" />

        {/* Top badges */}
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          {campaign.isFeatured && (
            <Badge variant="secondary" size="sm">Featured</Badge>
          )}
          {campaign.category && (
            <Badge variant="default" size="sm">{campaign.category}</Badge>
          )}
        </div>

        {/* Days left */}
        <div className="absolute bottom-3 right-3">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.12] bg-black/40 px-2.5 py-1 text-xs text-slate-300 backdrop-blur-sm">
            <Clock className="h-3 w-3" aria-hidden="true" />
            {campaign.daysLeft > 0 ? `${campaign.daysLeft}d left` : "Ended"}
          </span>
        </div>

        {/* Identity badge */}
        <div className="absolute bottom-3 left-3">
          <IdentityBadge type={campaign.creatorType} showTooltip />
        </div>
      </div>

      {/* Card body */}
      <div className="flex flex-1 flex-col gap-3 p-5">
        {/* Creator */}
        <p className="text-xs text-slate-500 truncate">by {campaign.creator}</p>

        {/* Title */}
        <h3 className="font-display text-base font-semibold text-slate-100 line-clamp-2 leading-snug group-hover:text-white transition-colors">
          {campaign.title}
        </h3>

        {/* Description */}
        {campaign.description && (
          <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
            {campaign.description}
          </p>
        )}

        {/* Progress */}
        <div className="mt-auto space-y-2.5 pt-2">
          <ProgressBar
            value={campaign.progress}
            variant={
              campaign.progress >= 100
                ? "success"
                : campaign.progress >= 66
                ? "primary"
                : "blockchain"
            }
            size="sm"
            animated
            glow={campaign.progress >= 100}
          />

          {/* Stats row */}
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-200 tabular-nums">
              {campaign.raised}{" "}
              <span className="font-normal text-slate-500">{currency} raised</span>
            </span>
            <span className="text-slate-500">{campaign.progress}%</span>
          </div>

          {/* Footer stats */}
          <div className="flex items-center gap-3 border-t border-white/[0.06] pt-2.5 text-xs text-slate-500">
            {campaign.donorCount != null && (
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" aria-hidden="true" />
                {campaign.donorCount.toLocaleString()}
              </span>
            )}
            {campaign.milestoneCount != null && (
              <span className="flex items-center gap-1">
                <TrendingUp className="h-3 w-3" aria-hidden="true" />
                {campaign.milestoneCount} milestones
              </span>
            )}
            <span className="ml-auto text-slate-500">
              Goal: {campaign.goal} {currency}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );

  if (!animate) return card;

  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 16 },
        show: { opacity: 1, y: 0 }
      }}
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
    >
      {card}
    </motion.div>
  );
}
