import { motion, AnimatePresence } from "framer-motion";
import { ExternalLink, Heart } from "lucide-react";
import { GlassCard, Skeleton } from "@/components/ui";
import { useRecentCampaignDonations } from "@/hooks/useDonations";

interface DonationFeedProps {
  campaignAddress: string;
  limit?: number;
  className?: string;
}

function formatTimeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function truncateAddress(addr: string): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function DonationFeed({ campaignAddress, limit = 8, className }: DonationFeedProps) {
  const { data, isLoading } = useRecentCampaignDonations(campaignAddress, limit);

  if (isLoading) {
    return (
      <div className={`space-y-3 ${className || ""}`}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="flex-1">
              <Skeleton className="h-3 w-24 mb-1" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const items = data?.items || [];

  if (items.length === 0) {
    return (
      <div className={`text-center py-6 ${className || ""}`}>
        <Heart className="w-8 h-8 text-slate-400 mx-auto mb-2" />
        <p className="text-sm text-slate-500">No donations yet</p>
        <p className="text-xs text-slate-400 mt-1">Be the first to contribute!</p>
      </div>
    );
  }

  return (
    <div className={`space-y-1 ${className || ""}`}>
      <AnimatePresence mode="popLayout">
        {items.map((donation, index) => (
          <motion.div
            key={donation.txHash}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 12 }}
            transition={{ delay: index * 0.04, duration: 0.3 }}
            className="flex items-center gap-3 py-2.5 px-3 rounded-xl hover:bg-white/[0.03] transition-colors group"
          >
            {/* Avatar placeholder */}
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-primary-500/30 to-secondary-500/30 flex items-center justify-center">
              <span className="text-[10px] font-bold text-primary-300">
                {donation.walletAddress.slice(2, 4).toUpperCase()}
              </span>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-mono text-slate-300 truncate">
                  {truncateAddress(donation.walletAddress)}
                </span>
                <span className="text-xs text-slate-400">donated</span>
                <span className="text-xs font-semibold text-primary-300">
                  {parseFloat(donation.amount).toFixed(4)} POL
                </span>
              </div>
              <span className="text-[10px] text-slate-400">
                {formatTimeAgo(donation.createdAt)}
              </span>
            </div>

            {/* Tx link */}
            <a
              href={`https://amoy.polygonscan.com/tx/${donation.txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-500 hover:text-primary-400"
              title="View on Polygonscan"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
