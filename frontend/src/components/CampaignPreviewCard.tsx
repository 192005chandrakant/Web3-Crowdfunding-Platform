import { Link } from "react-router-dom";
import { TrendingUp, Shield, Calendar, Users, Target, CheckCircle2 } from "lucide-react";
import { GlassCard, Badge, ProgressBar } from "@/components/ui";

export interface CampaignPreviewProps {
  title: string;
  category: string;
  descriptionMarkdown: string;
  targetGoal: number;
  coverImageUrl?: string;
  milestoneCount: number;
  creatorAddress?: string;
  daysLeft?: number;
  className?: string;
}

export function CampaignPreviewCard({
  title = "Untitled Campaign",
  category = "general",
  descriptionMarkdown = "",
  targetGoal = 0,
  coverImageUrl,
  milestoneCount = 1,
  creatorAddress = "0x0000...0000",
  daysLeft = 30,
  className = ""
}: CampaignPreviewProps) {
  const cleanDesc = descriptionMarkdown
    ? descriptionMarkdown.replace(/[#*`~>]/g, "").slice(0, 140)
    : "No description provided yet.";

  const truncatedCreator = creatorAddress.length > 12
    ? `${creatorAddress.slice(0, 6)}…${creatorAddress.slice(-4)}`
    : creatorAddress;

  return (
    <GlassCard className={`overflow-hidden border border-white/[0.1] hover:border-primary-500/40 dark:border-primary-500/30 transition-all duration-300 ${className}`}>
      {/* Image Banner */}
      <div className="relative h-48 w-full overflow-hidden bg-gradient-to-br from-slate-900 via-primary-950/40 to-slate-50 dark:to-slate-900">
        {coverImageUrl ? (
          <img
            src={coverImageUrl}
            alt={title}
            className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 gap-2">
            <TrendingUp className="w-10 h-10 text-primary-500/40 animate-pulse" />
            <span className="text-xs uppercase tracking-wider font-semibold text-slate-400">Campaign Preview</span>
          </div>
        )}
        
        {/* Category & Verification Badges */}
        <div className="absolute top-3 left-3 flex items-center gap-2">
          <Badge variant="secondary" className="capitalize bg-slate-900/80 backdrop-blur-md text-slate-200 border-slate-200 dark:border-white/10">
            {category}
          </Badge>
          <Badge variant="success" className="bg-emerald-500/20 backdrop-blur-md text-emerald-300 border-emerald-500/30 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>Escrow Protected</span>
          </Badge>
        </div>

        <div className="absolute bottom-3 right-3">
          <Badge variant="primary" className="bg-primary-900/80 backdrop-blur-md text-primary-800 dark:text-primary-200 border-primary-500/40 dark:border-primary-500/30 font-mono text-xs">
            {milestoneCount} {milestoneCount === 1 ? "Milestone" : "Milestones"}
          </Badge>
        </div>
      </div>

      {/* Content Area */}
      <div className="p-6 flex flex-col justify-between flex-1">
        <div>
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2 font-mono">
            <div className="flex items-center gap-1">
              <Shield className="w-3.5 h-3.5 text-secondary-400" />
              <span>By {truncatedCreator}</span>
            </div>
            <div className="flex items-center gap-1 text-slate-400">
              <Calendar className="w-3.5 h-3.5" />
              <span>{daysLeft}d left</span>
            </div>
          </div>

          <h3 className="text-lg font-bold text-slate-100 hover:text-primary-300 transition-colors line-clamp-1 mb-2">
            {title || "Campaign Title"}
          </h3>
          <p className="text-sm text-slate-400 line-clamp-2 leading-relaxed mb-6">
            {cleanDesc}
          </p>
        </div>

        {/* Financial / Progress Summary */}
        <div className="space-y-3 pt-4 border-t border-white/[0.06]">
          <div className="flex items-center justify-between text-sm">
            <div className="flex flex-col">
              <span className="text-xs text-slate-500">Raised so far</span>
              <span className="font-bold text-slate-200">0.00 MATIC</span>
            </div>
            <div className="flex flex-col text-right">
              <span className="text-xs text-slate-500">Target Goal</span>
              <span className="font-bold text-primary-400">{targetGoal > 0 ? targetGoal.toLocaleString() : "0"} MATIC</span>
            </div>
          </div>

          <ProgressBar value={0} variant="primary" className="h-2" />

          <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
            <span className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-slate-400" />
              0 Donors
            </span>
            <span className="flex items-center gap-1 font-medium text-emerald-400">
              <Target className="w-3.5 h-3.5" />
              Ready to deploy
            </span>
          </div>
        </div>
      </div>
    </GlassCard>
  );
}
