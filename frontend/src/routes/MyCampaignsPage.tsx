import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus, Search, Edit, Eye, TrendingUp, Clock, CheckCircle, AlertCircle, Sparkles, DollarSign, Users, Download, Copy, Check, Filter, AlertTriangle, ArrowUpRight
} from 'lucide-react';
import { motion } from 'framer-motion';
import { GlassCard, Button, Badge, EmptyState, Skeleton, StatusChip, ProgressBar } from '@/components/ui';
import { useCreatorDashboard } from '@/hooks/useCampaigns';
import { useAccount } from 'wagmi';
import type { EnrichedCampaign } from '@/lib/api';

type CampaignFilter = 'all' | 'active' | 'completed' | 'action' | 'paused';
type SortOption = 'newest' | 'highest_raised' | 'progress' | 'title';

function CampaignRowItem({ campaign, index }: { campaign: EnrichedCampaign; index: number }) {
  const [copied, setCopied] = useState(false);

  const raised = parseFloat(campaign.totalRaised || '0');
  const goal = campaign.targetGoal || 1;
  const progress = campaign.progressPercentage ?? Math.min(100, Math.round((raised / goal) * 100));
  const donorCount = campaign.donorCount || 0;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/campaign/${campaign.contractAddress}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <GlassCard className={`p-6 md:p-8 transition-all duration-300 bg-slate-900/40 shadow-xl ${
        campaign.requiresProofUpload 
          ? 'border-amber-500/40 hover:border-amber-500 shadow-amber-500/05' 
          : 'hover:border-primary-500/40 dark:border-primary-500/30'
      }`}>
        <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-center">
          {/* Cover Artwork Thumbnail */}
          <div className="w-full lg:w-56 h-36 rounded-2xl overflow-hidden flex-shrink-0 bg-gradient-to-br from-primary-950 to-slate-50 dark:to-slate-900 border border-slate-200 dark:border-white/10 relative shadow-inner group">
            {campaign.coverImageUrl ? (
              <img
                src={campaign.coverImageUrl}
                alt={campaign.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 gap-1 p-3 text-center">
                <TrendingUp className="w-8 h-8 text-primary-400/50" />
                <span className="text-[11px] font-mono">No Artwork</span>
              </div>
            )}
            <div className="absolute top-3 left-3 flex flex-col gap-1.5">
              <Badge variant="blockchain" dot className="bg-slate-950/90 border-slate-300 dark:border-white/20 text-[10px] font-mono uppercase">
                {campaign.category}
              </Badge>
              {campaign.requiresProofUpload && (
                <span className="inline-flex items-center gap-1 bg-amber-500 text-slate-950 font-black text-[10px] px-2 py-0.5 rounded-full shadow-lg animate-pulse">
                  <AlertTriangle className="w-3 h-3" />
                  Proof Needed
                </span>
              )}
            </div>
          </div>

          {/* Core Info */}
          <div className="flex-1 min-w-0 space-y-4 w-full">
            <div>
              <div className="flex items-center justify-between gap-2 flex-wrap mb-1.5">
                <div className="flex items-center gap-3 min-w-0">
                  <h3 className="text-xl font-extrabold text-slate-100 truncate max-w-md">
                    {campaign.title}
                  </h3>
                  <StatusChip status={(campaign.status ?? 'active') as any} />
                </div>
                <button
                  onClick={handleCopyLink}
                  title="Copy share link"
                  className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white bg-white/05 px-2.5 py-1 rounded-lg border border-white/05 hover:border-slate-200 dark:border-white/15 transition-all"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Share'}</span>
                </button>
              </div>
              <p className="text-sm text-slate-400 line-clamp-2 leading-relaxed">
                {campaign.descriptionMarkdown || "No project description available."}
              </p>
            </div>

            {/* Live Escrow & Governance Progress Metrics */}
            <div className="p-4 rounded-2xl bg-white/60 dark:bg-slate-950/60 border border-white/[0.06] space-y-2">
              <div className="flex flex-wrap items-center justify-between text-xs font-mono gap-y-1">
                <span className="text-slate-400 flex items-center gap-1">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Escrow Raised: <strong className="text-emerald-400 text-sm font-bold">{raised} POL</strong></span>
                </span>
                <span className="text-slate-400">
                  Target: <strong className="text-white text-sm font-bold">{campaign.targetGoal} POL</strong>
                </span>
                <span className="text-primary-300 flex items-center gap-1.5 font-bold bg-primary-500/10 px-2 py-0.5 rounded border border-primary-500/40 dark:border-primary-500/30">
                  <Users className="w-3.5 h-3.5 text-primary-400" />
                  <span>{donorCount} {donorCount === 1 ? "Contributor" : "Contributors"}</span>
                </span>
              </div>
              <ProgressBar value={progress} variant={progress >= 100 ? "success" : "primary"} showValue />
            </div>

            {/* Metadata Footer & Actions */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-1 border-t border-white/05">
              <div className="flex items-center gap-2 text-xs font-mono text-slate-500 truncate">
                <span>Contract:</span>
                <a
                  href={`https://amoy.polygonscan.com/address/${campaign.contractAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded border border-white/05 hover:text-primary-300 flex items-center gap-1 transition-colors"
                >
                  <span>{campaign.contractAddress.slice(0, 8)}…{campaign.contractAddress.slice(-6)}</span>
                  <ArrowUpRight className="w-3 h-3" />
                </a>
                <span>·</span>
                <span className="text-secondary-400">{campaign.milestones?.length || 0} Milestones</span>
              </div>

              <div className="flex gap-2.5 w-full sm:w-auto">
                <Link to={`/campaign/${campaign.contractAddress}`} className="flex-1 sm:flex-none">
                  <Button variant="ghost" size="sm" leadingIcon={<Eye className="w-4 h-4" />} className="w-full">
                    Public View
                  </Button>
                </Link>
                <Link to={`/campaign/${campaign.contractAddress}/manage`} className="flex-1 sm:flex-none">
                  <Button
                    variant={campaign.requiresProofUpload ? "primary" : "outline"}
                    size="sm"
                    leadingIcon={campaign.requiresProofUpload ? <AlertTriangle className="w-4 h-4" /> : <Edit className="w-4 h-4" />}
                    className={campaign.requiresProofUpload ? "shadow-glow-sm font-black bg-amber-600 hover:bg-amber-500 text-slate-950 w-full" : "w-full font-bold"}
                  >
                    {campaign.requiresProofUpload ? "Submit Proof" : "Creator Studio"}
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </GlassCard>
    </motion.div>
  );
}

export function MyCampaignsPage() {
  const { address } = useAccount();
  const [filter, setFilter] = useState<CampaignFilter>('all');
  const [sortOption, setSortOption] = useState<SortOption>('newest');
  const [searchQuery, setSearchQuery] = useState('');
  const [exporting, setExporting] = useState(false);

  // High-performance single dashboard request (Zero N+1 queries)
  const { data: dashboard, isLoading } = useCreatorDashboard(address);

  const allCampaigns = useMemo(() => dashboard?.campaigns ?? [], [dashboard]);
  const creatorStats = dashboard?.creatorStats ?? {
    totalCampaigns: allCampaigns.length,
    activeCampaigns: allCampaigns.filter(c => c.status === 'active').length,
    completedCampaigns: allCampaigns.filter(c => c.status === 'completed').length,
    totalTargetGoal: allCampaigns.reduce((sum, c) => sum + (c.targetGoal || 0), 0),
    totalRaised: "0.000",
    totalUniqueDonors: 0,
    pendingProofCount: 0
  };

  // Filter and sort items cleanly
  const filteredAndSortedCampaigns = useMemo(() => {
    return allCampaigns.filter((campaign) => {
      const status = campaign.status ?? 'active';
      let matchesFilter = true;
      if (filter === 'active') matchesFilter = status === 'active';
      if (filter === 'completed') matchesFilter = status === 'completed';
      if (filter === 'paused') matchesFilter = status === 'paused';
      if (filter === 'action') matchesFilter = !!campaign.requiresProofUpload;

      const matchesSearch =
        searchQuery === '' ||
        campaign.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        campaign.descriptionMarkdown.toLowerCase().includes(searchQuery.toLowerCase()) ||
        campaign.contractAddress.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesFilter && matchesSearch;
    }).sort((a, b) => {
      if (sortOption === 'highest_raised') {
        return parseFloat(b.totalRaised || '0') - parseFloat(a.totalRaised || '0');
      }
      if (sortOption === 'progress') {
        const progA = a.progressPercentage || 0;
        const progB = b.progressPercentage || 0;
        return progB - progA;
      }
      if (sortOption === 'title') {
        return a.title.localeCompare(b.title);
      }
      // Default: newest first
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    });
  }, [allCampaigns, filter, sortOption, searchQuery]);

  const actionCount = allCampaigns.filter(c => c.requiresProofUpload).length;

  const filterOptions: { value: CampaignFilter; label: string; count: number; badge?: string }[] = [
    { value: 'all',       label: 'All Projects',   count: creatorStats.totalCampaigns },
    { value: 'active',    label: 'Active Gates',   count: creatorStats.activeCampaigns },
    { value: 'action',    label: 'Action Needed',  count: actionCount },
    { value: 'completed', label: 'Fully Funded',   count: creatorStats.completedCampaigns },
    { value: 'paused',    label: 'Paused',         count: allCampaigns.filter((c) => c.status === 'paused').length },
  ];

  // CSV Accounting & Audit Export Utility
  const handleExportCSV = () => {
    setExporting(true);
    try {
      const headers = [
        "Contract Address",
        "Title",
        "Category",
        "Status",
        "Target Goal (POL)",
        "Total Raised (POL)",
        "Progress (%)",
        "Unique Donors",
        "Milestones Count",
        "Proof Needed"
      ];

      const rows = allCampaigns.map(c => [
        c.contractAddress,
        `"${(c.title || "").replace(/"/g, '""')}"`,
        c.category || "general",
        c.status || "active",
        c.targetGoal || 0,
        c.totalRaised || "0",
        c.progressPercentage || 0,
        c.donorCount || 0,
        c.milestones?.length || 0,
        c.requiresProofUpload ? "Yes" : "No"
      ]);

      const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `creator_campaigns_report_${new Date().toISOString().split("T")[0]}.csv`);
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
          <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto text-amber-400">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-display font-extrabold text-slate-100">Web3 Wallet Required</h2>
          <p className="text-slate-400 text-sm leading-relaxed">
            Please connect your verified creator Web3 wallet to access aggregated escrow metrics, execute milestone disbursements, and submit IPFS completion evidence.
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
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-500/10 border border-primary-500/40 dark:border-primary-500/30 text-primary-300 text-xs font-semibold mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Creator Studio Suite</span>
          </div>
          <h1 className="text-4xl font-display font-extrabold text-slate-100 tracking-tight">My Deployed Campaigns</h1>
          <p className="text-slate-400 text-base mt-1.5">
            Real-time analytics across all your community vaults, escrow accounting, and governance proof management.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {allCampaigns.length > 0 && (
            <Button
              variant="outline"
              size="md"
              onClick={handleExportCSV}
              disabled={exporting || isLoading}
              leadingIcon={<Download className="w-4 h-4 text-emerald-400" />}
              className="border-slate-200 dark:border-white/10 hover:border-emerald-500/50 bg-slate-900 font-semibold text-xs"
            >
              {exporting ? "Exporting…" : "Export CSV Report"}
            </Button>
          )}
          <Link to="/create-campaign">
            <Button id="my-campaigns-create-btn" variant="primary" size="lg" leadingIcon={<Plus className="w-5 h-5" />} className="shadow-glow-primary font-extrabold px-6">
              Deploy New Campaign
            </Button>
          </Link>
        </div>
      </div>

      {/* High-Priority Action Alert Banner */}
      {actionCount > 0 && (
        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}>
          <GlassCard className="p-6 bg-gradient-to-r from-amber-950/60 via-slate-50 dark:via-slate-900 to-slate-50 dark:to-slate-900 border-amber-500/50 shadow-lg shadow-amber-500/05">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="p-3.5 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex-shrink-0 animate-pulse">
                  <AlertTriangle className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-100 flex items-center gap-2">
                    <span>Action Required: Milestone Proof Submission</span>
                    <span className="bg-amber-500 text-slate-950 font-black text-xs px-2.5 py-0.5 rounded-full">
                      {actionCount} {actionCount === 1 ? "Project" : "Projects"}
                    </span>
                  </h3>
                  <p className="text-xs md:text-sm text-slate-300 mt-0.5 leading-relaxed">
                    You have active campaigns awaiting cryptographic completion evidence. Upload your IPFS documents now to open community voting gates and unlock escrow tranches.
                  </p>
                </div>
              </div>
              <Button
                variant={filter === 'action' ? "outline" : "primary"}
                size="sm"
                onClick={() => setFilter(filter === 'action' ? 'all' : 'action')}
                className="whitespace-nowrap font-extrabold bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-lg px-5"
              >
                {filter === 'action' ? "Show All Projects" : "Filter Action Required"}
              </Button>
            </div>
          </GlassCard>
        </motion.div>
      )}

      {/* Aggregated Overview Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <GlassCard className="p-5 bg-gradient-to-br from-slate-900 to-emerald-950/30 border-white/[0.08] shadow-lg">
          <div className="flex items-center gap-3.5">
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex-shrink-0">
              <DollarSign className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <div className="text-2xl lg:text-3xl font-black font-mono text-emerald-400 truncate">
                {isLoading ? "…" : creatorStats.totalRaised} <span className="text-xs font-sans font-normal text-slate-400">POL</span>
              </div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider truncate">Total Escrow Raised</div>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-5 bg-gradient-to-br from-slate-900 to-primary-950/20 border-white/[0.08] shadow-lg">
          <div className="flex items-center gap-3.5">
            <div className="p-3.5 rounded-2xl bg-primary-500/10 border border-primary-500/40 dark:border-primary-500/30 text-primary-400 flex-shrink-0">
              <Users className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <div className="text-3xl font-black text-slate-100 truncate">
                {isLoading ? "…" : creatorStats.totalUniqueDonors}
              </div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider truncate">Community Donors</div>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-5 bg-gradient-to-br from-slate-900 to-blue-950/20 border-white/[0.08] shadow-lg">
          <div className="flex items-center gap-3.5">
            <div className="p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex-shrink-0">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <div className="text-3xl font-black text-blue-400 truncate">
                {isLoading ? "…" : creatorStats.activeCampaigns}
              </div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider truncate">Active Vaults</div>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-5 bg-gradient-to-br from-slate-900 to-violet-950/20 border-white/[0.08] shadow-lg">
          <div className="flex items-center gap-3.5">
            <div className="p-3.5 rounded-2xl bg-violet-500/10 border border-violet-500/20 text-violet-400 flex-shrink-0">
              <Clock className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <div className="text-2xl font-black font-mono text-slate-200 truncate">
                {isLoading ? "…" : creatorStats.totalTargetGoal.toLocaleString()} <span className="text-xs font-sans font-normal text-slate-400">POL</span>
              </div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider truncate">Aggregate Goal</div>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Search, Filter Chips & Sorting Control Bar */}
      <div className="space-y-4 pt-2">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          {/* Filter Chips */}
          <div className="flex gap-2 overflow-x-auto pb-1.5 sm:pb-0 scrollbar-none">
            {filterOptions.map((opt) => (
              <button
                key={opt.value}
                id={`my-campaigns-filter-${opt.value}`}
                onClick={() => setFilter(opt.value)}
                className={`px-4 py-2.5 rounded-xl whitespace-nowrap text-xs font-bold transition-all flex items-center gap-2 ${
                  filter === opt.value
                    ? opt.value === 'action'
                      ? 'bg-amber-500 text-slate-950 font-black shadow-lg shadow-amber-500/20 scale-105'
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
              <Filter className="w-3.5 h-3.5 text-primary-400" />
              <span>Sort by:</span>
            </span>
            <select
              aria-label="Sort campaigns by"
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value as SortOption)}
              className="bg-slate-900 border border-slate-200 dark:border-white/15 rounded-xl px-3 py-2 text-xs font-bold text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500/50 shadow-inner"
            >
              <option value="newest">Newest First</option>
              <option value="highest_raised">Highest Raised (POL)</option>
              <option value="progress">Closest to Goal (%)</option>
              <option value="title">Title (A-Z)</option>
            </select>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative max-w-xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            id="my-campaigns-search"
            type="text"
            placeholder="Search your campaigns by project title, keyword, or contract address…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-slate-900/90 border border-white/[0.12] rounded-xl text-slate-100 placeholder:text-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition-all shadow-inner"
          />
        </div>
      </div>

      {/* Campaign List Render */}
      {isLoading ? (
        <div className="space-y-6">
          {[...Array(3)].map((_, i) => (
            <GlassCard key={i} className="p-8">
              <div className="flex gap-6">
                <Skeleton className="w-56 h-36 rounded-2xl flex-shrink-0" />
                <div className="flex-1 space-y-4">
                  <Skeleton className="h-7 w-2/3" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-14 w-full rounded-xl" />
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      ) : filteredAndSortedCampaigns.length === 0 ? (
        <GlassCard className="p-16 text-center space-y-6 max-w-2xl mx-auto border-dashed border-slate-200 dark:border-white/15 bg-slate-50/50 dark:bg-slate-950/40">
          <div className="w-20 h-20 rounded-full bg-primary-500/10 text-primary-400 flex items-center justify-center mx-auto border border-primary-500/40 dark:border-primary-500/30 shadow-inner">
            <TrendingUp className="w-10 h-10" />
          </div>
          <div className="space-y-2">
            <h3 className="text-2xl font-bold text-white">No campaigns match your filters</h3>
            <p className="text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
              {searchQuery
                ? 'No projects matched your search keywords. Try removing filters or searching by contract address.'
                : filter === 'action'
                ? 'Great job! You have zero projects awaiting milestone proof uploads at this time.'
                : filter !== 'all'
                ? `You currently do not have any campaigns under the "${filter}" filter.`
                : "You haven't launched an on-chain crowdfunding campaign yet. Turn your vision into reality with decentralized community escrow funding today."}
            </p>
          </div>
          {filter === 'all' && !searchQuery && (
            <Link to="/create-campaign" className="inline-block">
              <Button variant="primary" size="lg" leadingIcon={<Plus className="w-5 h-5" />} className="px-8 shadow-glow-primary font-bold">
                Deploy First Campaign
              </Button>
            </Link>
          )}
        </GlassCard>
      ) : (
        <div className="space-y-6">
          {filteredAndSortedCampaigns.map((campaign, index) => (
            <CampaignRowItem key={campaign.contractAddress} campaign={campaign} index={index} />
          ))}
        </div>
      )}
    </div>
  );
}
