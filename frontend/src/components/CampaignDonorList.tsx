import { useState } from "react";
import { ExternalLink, Heart, Clock, Search, ArrowLeft, ArrowRight } from "lucide-react";
import { GlassCard, Skeleton, Button, EmptyState } from "@/components/ui";
import { useCampaignDonors } from "@/hooks/useCampaigns";

interface CampaignDonorListProps {
  campaignAddress: string;
  className?: string;
}

function truncateAddress(addr: string): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "N/A";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

export function CampaignDonorList({ campaignAddress, className = "" }: CampaignDonorListProps) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const limit = 10;

  const { data, isLoading } = useCampaignDonors(campaignAddress, { page, limit });

  const items = data?.items || [];
  const pagination = data?.pagination || { page: 1, totalPages: 1, total: 0 };

  const filteredItems = items.filter((item) =>
    search === "" || item.walletAddress.toLowerCase().includes(search.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="flex justify-between items-center mb-4">
          <Skeleton className="h-8 w-48 rounded-lg" />
          <Skeleton className="h-10 w-64 rounded-lg" />
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <GlassCard key={i} className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Skeleton className="w-10 h-10 rounded-full" />
              <div>
                <Skeleton className="h-4 w-32 mb-1" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
            <Skeleton className="h-6 w-24" />
          </GlassCard>
        ))}
      </div>
    );
  }

  if (items.length === 0 && !search) {
    return (
      <EmptyState
        icon={<Heart className="w-12 h-12 text-primary-400" />}
        title="No donors yet"
        description="This campaign has not received any contributions yet. Be the first to donate and support this project!"
      />
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Top Header & Search Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <span>Campaign Donors</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary-500/20 text-primary-300 border border-primary-500/40 dark:border-primary-500/30">
              {pagination.total} total
            </span>
          </h3>
          <p className="text-sm text-slate-400 mt-1">Contributors supporting this project with milestone escrow</p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Filter by wallet address…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-100/60 dark:bg-slate-900/60 border border-white/[0.08] rounded-xl text-slate-200 placeholder:text-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition-all"
          />
        </div>
      </div>

      {/* Donors List Table / Card list */}
      {filteredItems.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-slate-200 dark:border-white/10 rounded-2xl bg-slate-900/30">
          <p className="text-slate-400 font-medium">No donor wallets matched your search query.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredItems.map((donor, index) => (
            <GlassCard
              key={donor.walletAddress}
              className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-white/[0.15] transition-all bg-slate-900/40"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center shadow-lg font-bold text-white text-sm">
                  #{((page - 1) * limit) + index + 1}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-semibold text-slate-200 text-sm">
                      {truncateAddress(donor.walletAddress)}
                    </span>
                    <a
                      href={`https://amoy.polygonscan.com/address/${donor.walletAddress}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-slate-500 hover:text-primary-400 transition-colors"
                      title="View wallet on Polygonscan"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-500" />
                      First contribution: {formatDate(donor.firstDonation)}
                    </span>
                    <span>•</span>
                    <span>{donor.donationCount} {donor.donationCount === 1 ? "contribution" : "contributions"}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 self-end sm:self-auto">
                <div className="text-right">
                  <div className="text-lg font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-secondary-300">
                    {parseFloat(donor.totalAmount).toFixed(4)} POL
                  </div>
                  <span className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">Total Contributed</span>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-white/[0.06]">
          <span className="text-xs text-slate-400">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              leadingIcon={<ArrowLeft className="w-4 h-4" />}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              disabled={page === pagination.totalPages}
              trailingIcon={<ArrowRight className="w-4 h-4" />}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
