import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Search, ExternalLink, TrendingUp, Heart, Clock, Sparkles, ShieldCheck, Zap, Layers, DollarSign, Download, Filter, CheckCircle2, AlertCircle, ShieldAlert, Award
} from 'lucide-react';
import { motion } from 'framer-motion';
import { GlassCard, Button, Badge, EmptyState, Skeleton, StatusChip, ProgressBar } from '@/components/ui';
import { useAccount } from 'wagmi';
import { useDonorPortfolio } from '@/hooks/useDonations';
import type { EnrichedDonation } from '@/lib/api';

type DonationFilter = 'all' | 'confirmed' | 'active_votes' | string;
type SortOption = 'recent' | 'highest_amount' | 'highest_qv' | 'oldest';

const CATEGORY_COLORS: Record<string, { bg: string; border: string; text: string; dot: string }> = {
  medical:    { bg: 'bg-rose-500/10',    border: 'border-rose-500/30',    text: 'text-rose-400',    dot: 'bg-rose-500' },
  general:    { bg: 'bg-blue-500/10',    border: 'border-blue-500/30',    text: 'text-blue-400',    dot: 'bg-blue-500' },
  startup:    { bg: 'bg-violet-500/10',  border: 'border-violet-500/30',  text: 'text-violet-400',  dot: 'bg-violet-500' },
  charity:    { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400', dot: 'bg-emerald-500' },
  education:  { bg: 'bg-amber-500/10',   border: 'border-amber-500/30',   text: 'text-amber-400',   dot: 'bg-amber-500' },
  community:  { bg: 'bg-cyan-500/10',    border: 'border-cyan-500/30',    text: 'text-cyan-400',    dot: 'bg-cyan-500' },
};

function getCategoryColor(cat: string) {
  const normalized = (cat || 'general').toLowerCase();
  return CATEGORY_COLORS[normalized] || CATEGORY_COLORS.general;
}

export function MyDonationsPage() {
  const { address } = useAccount();
  const [filter, setFilter] = useState<DonationFilter>('all');
  const [sortOption, setSortOption] = useState<SortOption>('recent');
  const [searchQuery, setSearchQuery] = useState('');
  const [exporting, setExporting] = useState(false);

  // Single optimized portfolio API query
  const { data: portfolio, isLoading } = useDonorPortfolio(address);

  const allDonations = useMemo(() => portfolio?.donations ?? [], [portfolio]);
  const stats = portfolio?.portfolioStats ?? {
    totalContributions: allDonations.length,
    vaultsSupported: new Set(allDonations.map(d => d.campaignAddress)).size,
    totalContributed: "0.0000",
    totalQuadraticVotingPower: "0.00",
    activeGovernanceGatesCount: 0,
    categoryBreakdown: {}
  };

  // Dynamic filter lists including discovered categories
  const categoriesPresent = useMemo(() => {
    const cats = new Set<string>();
    allDonations.forEach(d => {
      if (d.campaign?.category) cats.add(d.campaign.category.toLowerCase());
    });
    return Array.from(cats);
  }, [allDonations]);

  const filterOptions = useMemo(() => {
    const activeVoteCount = allDonations.filter(d => d.campaign?.isVotingActive).length;
    const base: { value: string; label: string; count: number }[] = [
      { value: 'all',          label: 'All Receipts',      count: allDonations.length },
      { value: 'active_votes', label: 'Active Vote Gates', count: activeVoteCount },
      { value: 'confirmed',    label: 'Confirmed Only',    count: allDonations.filter(d => d.status === 'confirmed').length }
    ];

    categoriesPresent.forEach(cat => {
      base.push({
        value: `cat_${cat}`,
        label: `${cat.charAt(0).toUpperCase() + cat.slice(1)} Vaults`,
        count: allDonations.filter(d => d.campaign?.category?.toLowerCase() === cat).length
      });
    });
    return base;
  }, [allDonations, categoriesPresent]);

  // Apply filters and sort options
  const filteredAndSortedDonations = useMemo(() => {
    return allDonations.filter((d) => {
      let matchesFilter = true;
      if (filter === 'confirmed') matchesFilter = d.status === 'confirmed';
      if (filter === 'active_votes') matchesFilter = !!d.campaign?.isVotingActive;
      if (filter.startsWith('cat_')) {
        const catName = filter.replace('cat_', '');
        matchesFilter = d.campaign?.category?.toLowerCase() === catName;
      }

      const matchesSearch =
        searchQuery === '' ||
        (d.campaign?.title && d.campaign.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
        d.campaignAddress.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.txHash.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesFilter && matchesSearch;
    }).sort((a, b) => {
      if (sortOption === 'highest_amount') {
        return (parseFloat(b.amount) || 0) - (parseFloat(a.amount) || 0);
      }
      if (sortOption === 'highest_qv') {
        return (parseFloat(b.qvPower || '0')) - (parseFloat(a.qvPower || '0'));
      }
      if (sortOption === 'oldest') {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      // Default: recent first
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [allDonations, filter, sortOption, searchQuery]);

  // Cryptographic Tax Receipt CSV Generator
  const handleExportTaxReceipt = () => {
    setExporting(true);
    try {
      const headers = [
        "Contribution Date",
        "Transaction Hash",
        "Campaign Contract Address",
        "Campaign Title",
        "Project Category",
        "POL Contributed",
        "Acquired Quadratic Voting Power (√POL)",
        "On-Chain Status"
      ];

      const rows = allDonations.map(d => [
        `"${new Date(d.createdAt).toISOString()}"`,
        d.txHash,
        d.campaignAddress,
        `"${(d.campaign?.title || "").replace(/"/g, '""')}"`,
        d.campaign?.category || "general",
        d.amount || "0",
        d.qvPower || "0.00",
        d.status || "confirmed"
      ]);

      const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `web3_donation_tax_receipts_${new Date().toISOString().split("T")[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } finally {
      setTimeout(() => setExporting(false), 500);
    }
  };

  if (!address) {
    return (
      <div className="page-container flex min-h-[65vh] items-center justify-center">
        <GlassCard className="p-10 max-w-lg text-center space-y-4 bg-slate-900/80 border-primary-500/40 dark:border-primary-500/30 shadow-2xl">
          <div className="w-16 h-16 rounded-full bg-primary-500/10 border border-primary-500/40 dark:border-primary-500/30 flex items-center justify-center mx-auto text-primary-400">
            <Award className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-display font-extrabold text-slate-100">Connect Web3 Wallet</h2>
          <p className="text-slate-400 text-sm leading-relaxed">
            Please connect your Polygon compatible Web3 wallet to access your cryptographic donation ledger, download immutable tax receipts, and exert quadratic governance voting power over active milestone gates.
          </p>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="page-container max-w-6xl space-y-8 pb-24">
      {/* Hero Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-300 text-xs font-semibold mb-2">
            <ShieldCheck className="w-3.5 h-3.5 text-violet-400" />
            <span>Quadratic Governance & Escrow Ledger</span>
          </div>
          <h1 className="text-4xl font-display font-extrabold text-slate-100 tracking-tight">My Donations & Governance</h1>
          <p className="text-slate-400 text-base mt-1.5">
            Audit your contributed tranches, monitor escrow protections, and wield quadratic voting power across supported vaults.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {allDonations.length > 0 && (
            <Button
              variant="outline"
              size="md"
              onClick={handleExportTaxReceipt}
              disabled={exporting || isLoading}
              leadingIcon={<Download className="w-4 h-4 text-violet-400" />}
              className="border-slate-200 dark:border-white/10 hover:border-violet-500/50 bg-slate-900 font-semibold text-xs"
            >
              {exporting ? "Generating…" : "Download Tax Receipts (CSV)"}
            </Button>
          )}
          <Link to="/explore">
            <Button id="my-donations-explore-btn" variant="primary" size="lg" leadingIcon={<Sparkles className="w-5 h-5" />} className="shadow-glow-primary font-extrabold px-6">
              Discover Verified Vaults
            </Button>
          </Link>
        </div>
      </div>

      {/* Governance Action Center Banner */}
      {stats.activeGovernanceGatesCount > 0 && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <GlassCard className="p-6 bg-gradient-to-r from-violet-950/70 via-slate-50 dark:via-slate-900 to-primary-950/50 border-violet-500/50 shadow-xl shadow-violet-500/10">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="p-3.5 rounded-2xl bg-violet-500/20 border border-violet-500/40 text-violet-300 flex-shrink-0 animate-bounce-short">
                  <Zap className="w-7 h-7 text-violet-300 fill-violet-400/20" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white flex items-center gap-2">
                    <span>Active Governance Gates Open!</span>
                    <span className="bg-violet-500 text-white font-black text-xs px-2.5 py-0.5 rounded-full shadow-md">
                      {stats.activeGovernanceGatesCount} {stats.activeGovernanceGatesCount === 1 ? "Vault Ready" : "Vaults Ready"}
                    </span>
                  </h3>
                  <p className="text-xs md:text-sm text-slate-300 mt-1 leading-relaxed">
                    Milestone completion proofs have been submitted for community vaults you fund. Exert your quadratic voting power now to authorize or reject fund disbursement.
                  </p>
                </div>
              </div>
              <Button
                variant={filter === 'active_votes' ? "outline" : "primary"}
                size="sm"
                onClick={() => setFilter(filter === 'active_votes' ? 'all' : 'active_votes')}
                className="whitespace-nowrap font-black bg-violet-600 hover:bg-violet-500 text-white shadow-glow-sm px-5"
              >
                {filter === 'active_votes' ? "Show All Receipts" : "Review Active Vote Gates"}
              </Button>
            </div>
          </GlassCard>
        </motion.div>
      )}

      {/* Elite Hero Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <GlassCard className="p-5 bg-gradient-to-br from-slate-900 to-primary-950/20 border-white/[0.08] shadow-lg">
          <div className="flex items-center gap-3.5">
            <div className="p-3.5 rounded-2xl bg-primary-500/10 border border-primary-500/40 dark:border-primary-500/30 text-primary-400 flex-shrink-0">
              <DollarSign className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <div className="text-2xl lg:text-3xl font-black font-mono text-white truncate">
                {isLoading ? "…" : stats.totalContributed} <span className="text-xs font-sans font-normal text-slate-400">POL</span>
              </div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider truncate">Total Contributed</div>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-5 bg-gradient-to-br from-slate-900 to-violet-950/30 border-white/[0.08] shadow-lg">
          <div className="flex items-center gap-3.5">
            <div className="p-3.5 rounded-2xl bg-violet-500/10 border border-violet-500/20 text-violet-300 flex-shrink-0">
              <Zap className="w-6 h-6 text-violet-400 fill-violet-400/10" />
            </div>
            <div className="min-w-0">
              <div className="text-2xl lg:text-3xl font-black font-mono text-violet-300 truncate">
                {isLoading ? "…" : stats.totalQuadraticVotingPower} <span className="text-xs font-sans font-normal text-slate-400">Votes</span>
              </div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider truncate">Quadratic Voting Power</div>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-5 bg-gradient-to-br from-slate-900 to-emerald-950/20 border-white/[0.08] shadow-lg">
          <div className="flex items-center gap-3.5">
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex-shrink-0">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <div className="text-3xl font-black text-emerald-400 truncate">
                {isLoading ? "…" : stats.vaultsSupported}
              </div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider truncate">Vaults Supported</div>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-5 bg-gradient-to-br from-slate-900 to-secondary-950/20 border-white/[0.08] shadow-lg">
          <div className="flex items-center gap-3.5">
            <div className="p-3.5 rounded-2xl bg-secondary-500/10 border border-secondary-500/20 text-secondary-400 flex-shrink-0">
              <Layers className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <div className="text-3xl font-black text-slate-200 truncate">
                {isLoading ? "…" : stats.totalContributions}
              </div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider truncate">On-Chain Receipts</div>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Philanthropic Cause Distribution Meter */}
      {Object.keys(stats.categoryBreakdown || {}).length > 0 && (
        <GlassCard className="p-6 bg-slate-900/50 border-white/[0.08] space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <Heart className="w-4 h-4 text-primary-400" />
              <span>Philanthropic Cause Portfolio Breakdown</span>
            </h3>
            <span className="text-xs font-mono text-slate-400">100% On-Chain Transparent</span>
          </div>

          <div className="flex h-3.5 w-full rounded-full overflow-hidden bg-slate-800 gap-1 p-0.5">
            {Object.entries(stats.categoryBreakdown || {}).map(([cat, data], idx) => {
              const color = getCategoryColor(cat);
              return (
                <div
                  key={cat}
                  style={{ width: `${Math.max(5, data.percentage)}%` }}
                  className={`h-full ${color.dot} rounded-sm transition-all duration-500 shadow-sm`}
                  title={`${cat}: ${data.percentage}% (${data.amount} POL)`}
                />
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-4 pt-1">
            {Object.entries(stats.categoryBreakdown || {}).map(([cat, data]) => {
              const color = getCategoryColor(cat);
              return (
                <div key={cat} className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border ${color.border} ${color.bg}`}>
                  <span className={`w-2.5 h-2.5 rounded-full ${color.dot}`} />
                  <span className="text-xs font-extrabold text-white capitalize">{cat}:</span>
                  <span className={`text-xs font-mono font-bold ${color.text}`}>{data.percentage}% ({data.amount} POL)</span>
                </div>
              );
            })}
          </div>
        </GlassCard>
      )}

      {/* Filtering & Sorting Controls Bar */}
      <div className="space-y-4 pt-2">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          {/* Filter Chips */}
          <div className="flex gap-2 overflow-x-auto pb-1.5 sm:pb-0 scrollbar-none">
            {filterOptions.map((opt) => (
              <button
                key={opt.value}
                id={`my-donations-filter-${opt.value}`}
                onClick={() => setFilter(opt.value)}
                className={`px-4 py-2.5 rounded-xl whitespace-nowrap text-xs font-bold transition-all flex items-center gap-2 ${
                  filter === opt.value
                    ? opt.value === 'active_votes'
                      ? 'bg-violet-600 text-white font-black shadow-glow-sm scale-105'
                      : 'bg-primary-600 text-white shadow-glow-sm scale-105'
                    : 'bg-slate-900/80 text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-white/[0.08]'
                }`}
              >
                <span>{opt.label}</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                  filter === opt.value
                    ? 'bg-black/20 text-white font-mono'
                    : 'bg-white/05 text-slate-300 font-mono'
                }`}>
                  {opt.count}
                </span>
              </button>
            ))}
          </div>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-xs font-bold text-slate-400 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-violet-400" />
              <span>Sort by:</span>
            </span>
            <select
              aria-label="Sort donations by"
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value as SortOption)}
              className="bg-slate-900 border border-slate-200 dark:border-white/15 rounded-xl px-3 py-2 text-xs font-bold text-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500/50 shadow-inner"
            >
              <option value="recent">Recent First</option>
              <option value="highest_amount">Largest Amount (POL)</option>
              <option value="highest_qv">Highest Voting Power (QV)</option>
              <option value="oldest">Oldest First</option>
            </select>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative max-w-xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            id="my-donations-search"
            type="text"
            placeholder="Search receipts by project title, contract address, or transaction hash…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-slate-900/90 border border-white/[0.12] rounded-xl text-slate-100 placeholder:text-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all shadow-inner"
          />
        </div>
      </div>

      {/* Donation Ledgers Render */}
      {isLoading ? (
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <GlassCard key={i} className="p-6">
              <div className="flex gap-6">
                <Skeleton className="w-28 h-24 rounded-2xl flex-shrink-0" />
                <div className="flex-1 space-y-3">
                  <Skeleton className="h-6 w-2/3" />
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-4 w-full" />
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      ) : filteredAndSortedDonations.length === 0 ? (
        <GlassCard className="p-16 text-center space-y-6 max-w-2xl mx-auto border-dashed border-slate-200 dark:border-white/15 bg-slate-50/50 dark:bg-slate-950/40">
          <div className="w-20 h-20 rounded-full bg-violet-500/10 text-violet-400 flex items-center justify-center mx-auto border border-violet-500/20 shadow-inner">
            <Heart className="w-10 h-10" />
          </div>
          <div className="space-y-2">
            <h3 className="text-2xl font-bold text-white">{allDonations.length === 0 ? "No contributions recorded" : "No matching donation receipts"}</h3>
            <p className="text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
              {allDonations.length === 0
                ? "You have not made any on-chain contributions to verified crowdfunding projects yet. Discover active initiatives and earn quadratic governance power today."
                : "No donation receipts matched your search keyword or selected filter category. Try clearing filters to see all transactions."}
            </p>
          </div>
          {allDonations.length === 0 && (
            <Link to="/explore" className="inline-block">
              <Button variant="primary" size="lg" leadingIcon={<Sparkles className="w-5 h-5" />} className="px-8 shadow-glow-primary font-bold">
                Explore Active Campaigns
              </Button>
            </Link>
          )}
        </GlassCard>
      ) : (
        <div className="space-y-4">
          {filteredAndSortedDonations.map((donation, index) => {
            const amountNum = parseFloat(donation.amount) || 0;
            const qvPower = donation.qvPower ?? Math.sqrt(amountNum).toFixed(2);
            const isActiveGate = donation.campaign?.isVotingActive;

            return (
              <motion.div
                key={donation._id || donation.txHash}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
              >
                <GlassCard className={`p-6 md:p-7 transition-all duration-300 bg-slate-900/40 shadow-xl ${
                  isActiveGate 
                    ? 'border-violet-500/40 hover:border-violet-400 shadow-violet-500/05' 
                    : 'hover:border-primary-500/40 dark:border-primary-500/30'
                }`}>
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                    <div className="flex items-start gap-5 flex-1 min-w-0 w-full">
                      {/* Thumbnail */}
                      <Link
                        to={`/campaign/${donation.campaignAddress}`}
                        className="w-24 h-24 sm:w-28 sm:h-24 rounded-2xl overflow-hidden flex-shrink-0 bg-gradient-to-br from-slate-800 to-primary-950 border border-slate-200 dark:border-white/10 relative group shadow-inner"
                      >
                        {donation.campaign?.coverImageUrl ? (
                          <img
                            src={donation.campaign.coverImageUrl}
                            alt={donation.campaign.title || "Campaign"}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-primary-400/40">
                            <Heart className="w-8 h-8" />
                          </div>
                        )}
                      </Link>

                      {/* Details */}
                      <div className="space-y-2.5 min-w-0 flex-1 w-full">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-2.5 min-w-0">
                            <Link
                              to={`/campaign/${donation.campaignAddress}`}
                              className="text-lg font-extrabold text-slate-100 hover:text-primary-300 transition-colors truncate max-w-sm"
                            >
                              {donation.campaign?.title || `Vault (${donation.campaignAddress.slice(0, 8)}…)`}
                            </Link>
                            <StatusChip status={(donation.status ?? "confirmed") as any} />
                            {donation.campaign?.category && (
                              <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-white/05">
                                {donation.campaign.category}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Escrow & QV Badge Row */}
                        <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
                          <span className="text-slate-300 bg-slate-950/80 px-2.5 py-1 rounded-lg border border-white/05 flex items-center gap-1.5">
                            <span>Contributed:</span>
                            <strong className="text-emerald-400 font-bold text-sm">{donation.amount} POL</strong>
                          </span>

                          <span className="text-violet-200 font-bold flex items-center gap-1.5 bg-violet-950/80 px-3 py-1 rounded-lg border border-violet-500/30 shadow-inner">
                            <Zap className="w-4 h-4 text-violet-400 fill-violet-400/20" />
                            <span className="text-sm font-black">+{qvPower}</span>
                            <span className="text-[11px] font-sans text-violet-300 font-normal">QV Power</span>
                          </span>

                          {isActiveGate && (
                            <span className="inline-flex items-center gap-1.5 bg-violet-600 text-white font-black text-[11px] px-2.5 py-1 rounded-lg animate-pulse shadow-glow-sm">
                              <ShieldAlert className="w-3.5 h-3.5" />
                              Vote Gate Open
                            </span>
                          )}
                        </div>

                        {/* Timestamp & Tx Explorer Link */}
                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 pt-0.5 font-mono">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-slate-500" />
                            <span>{new Date(donation.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                          </span>
                          <span>·</span>
                          <a
                            href={`https://amoy.polygonscan.com/tx/${donation.txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-slate-400 hover:text-primary-300 underline decoration-slate-600 transition-colors"
                          >
                            <span>Tx: {donation.txHash.slice(0, 10)}…{donation.txHash.slice(-8)}</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </div>
                    </div>

                    {/* Governance Action */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full md:w-44 flex-shrink-0">
                      <Link to={`/campaign/${donation.campaignAddress}`} className="flex-1 md:flex-none w-full">
                        <Button
                          variant={isActiveGate ? "primary" : "outline"}
                          size="sm"
                          leadingIcon={isActiveGate ? <Zap className="w-4 h-4 text-violet-200 fill-violet-200" /> : <ShieldCheck className="w-4 h-4" />}
                          className={isActiveGate ? "w-full font-black shadow-glow-sm bg-violet-600 hover:bg-violet-500 text-white" : "w-full font-bold"}
                        >
                          {isActiveGate ? "Cast QV Vote" : "View Vault"}
                        </Button>
                      </Link>
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Explainer Banner */}
      <GlassCard className="p-6 md:p-8 bg-gradient-to-r from-slate-900 via-slate-50 dark:via-slate-900 to-primary-950/30 border-white/[0.08] shadow-inner">
        <div className="flex flex-col sm:flex-row items-start gap-5">
          <div className="p-3.5 rounded-2xl bg-primary-500/10 border border-primary-500/40 dark:border-primary-500/30 text-primary-400 flex-shrink-0">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <div className="space-y-2">
            <h3 className="text-base font-extrabold text-slate-100 flex items-center gap-2">
              <span>How Escrow Protection & Quadratic Governance Work</span>
            </h3>
            <p className="text-xs md:text-sm text-slate-400 leading-relaxed">
              When you contribute to a campaign, your POL is secured inside an immutable smart contract community vault instead of being transferred immediately to the creator. As the project reaches milestones and submits cryptographic IPFS completion proofs, you wield quadratic voting power (where your influence scales by <strong className="text-violet-300 font-mono">√POL Contributed</strong> to prevent whale domination and empower grassroots supporters). If a milestone fails community verification, remaining escrow funds stay protected.
            </p>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
