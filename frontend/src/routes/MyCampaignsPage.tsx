import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus, Search, Edit, Eye, TrendingUp, Clock, CheckCircle, AlertCircle
} from 'lucide-react';
import { motion } from 'framer-motion';
import { GlassCard, Button, Badge, EmptyState, Skeleton, StatusChip, ProgressBar } from '@/components/ui';
import { useCampaignList } from '@/hooks/useCampaigns';
import { useAccount } from 'wagmi';

type CampaignFilter = 'all' | 'active' | 'completed' | 'paused';

export function MyCampaignsPage() {
  const { address } = useAccount();
  const [filter, setFilter] = useState<CampaignFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch campaigns filtered by the connected wallet address
  const { data: campaignsResponse, isLoading } = useCampaignList(
    address ? { creator: address, limit: 50 } : undefined
  );

  const allCampaigns = campaignsResponse?.items ?? [];

  // Apply local filter + search
  const filteredCampaigns = allCampaigns.filter((campaign) => {
    const matchesFilter = filter === 'all' || campaign.status === filter;
    const matchesSearch =
      searchQuery === '' ||
      campaign.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      campaign.descriptionMarkdown.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const stats = {
    total: allCampaigns.length,
    active: allCampaigns.filter((c) => c.status === 'active').length,
    completed: allCampaigns.filter((c) => c.status === 'completed').length,
    totalGoal: allCampaigns.reduce((sum, c) => sum + (c.targetGoal || 0), 0),
  };

  const filterOptions: { value: CampaignFilter; label: string; count: number }[] = [
    { value: 'all',       label: 'All Campaigns', count: stats.total },
    { value: 'active',    label: 'Active',         count: stats.active },
    { value: 'completed', label: 'Completed',      count: stats.completed },
    { value: 'paused',    label: 'Paused',         count: allCampaigns.filter((c) => c.status === 'paused').length },
  ];

  if (!address) {
    return (
      <div className="page-container flex min-h-[60vh] items-center justify-center">
        <GlassCard className="p-8 max-w-md text-center">
          <AlertCircle className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2 text-slate-100">Wallet Not Connected</h2>
          <p className="text-slate-400">Connect your wallet to see your campaigns.</p>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-slate-100">My Campaigns</h1>
          <p className="text-slate-400 mt-1">Manage your fundraising campaigns</p>
        </div>
        <Link to="/create-campaign">
          <Button id="my-campaigns-create-btn" variant="primary" leadingIcon={<Plus className="w-4 h-4" />}>
            Create Campaign
          </Button>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary-500/10">
              <TrendingUp className="w-5 h-5 text-primary-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-100">{stats.total}</div>
              <div className="text-sm text-slate-400">Total</div>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10">
              <Clock className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-100">{stats.active}</div>
              <div className="text-sm text-slate-400">Active</div>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <CheckCircle className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-100">{stats.completed}</div>
              <div className="text-sm text-slate-400">Completed</div>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-secondary-500/10">
              <TrendingUp className="w-5 h-5 text-secondary-400" />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-100">
                {stats.totalGoal.toFixed(1)}
              </div>
              <div className="text-sm text-slate-400">MATIC Goal</div>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            id="my-campaigns-search"
            type="text"
            placeholder="Search campaigns…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-800/50 border border-white/[0.08] rounded-lg text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition-colors"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0">
          {filterOptions.map((opt) => (
            <button
              key={opt.value}
              id={`my-campaigns-filter-${opt.value}`}
              onClick={() => setFilter(opt.value)}
              className={`px-4 py-2 rounded-lg whitespace-nowrap text-sm font-medium transition-colors ${
                filter === opt.value
                  ? 'bg-primary-600 text-white shadow-glow-primary'
                  : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700/50 hover:text-slate-200 border border-white/[0.06]'
              }`}
            >
              {opt.label} ({opt.count})
            </button>
          ))}
        </div>
      </div>

      {/* Campaign List */}
      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <GlassCard key={i} className="p-6">
              <div className="flex gap-6">
                <Skeleton className="w-48 h-32 rounded-lg flex-shrink-0" />
                <div className="flex-1 space-y-3">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                  <div className="flex gap-2 mt-4">
                    <Skeleton className="h-8 w-20" />
                    <Skeleton className="h-8 w-20" />
                  </div>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      ) : filteredCampaigns.length === 0 ? (
        <EmptyState
          icon={<TrendingUp className="w-12 h-12" />}
          title="No campaigns found"
          description={
            searchQuery
              ? 'No campaigns match your search. Try different keywords.'
              : filter !== 'all'
              ? `You don't have any ${filter} campaigns.`
              : "You haven't created any campaigns yet. Start your first fundraising campaign today."
          }
          action={
            filter === 'all' && !searchQuery ? (
              <Link to="/create-campaign">
                <Button variant="primary" leadingIcon={<Plus className="w-4 h-4" />}>
                  Create Your First Campaign
                </Button>
              </Link>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-4">
          {filteredCampaigns.map((campaign, index) => (
            <motion.div
              key={campaign.contractAddress}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <GlassCard className="p-6 hover:border-white/[0.12] transition-all">
                <div className="flex flex-col lg:flex-row gap-6">
                  {/* Image */}
                  <div className="w-full lg:w-44 h-28 rounded-lg overflow-hidden flex-shrink-0 bg-gradient-to-br from-primary-600/20 to-secondary-600/20">
                    {campaign.coverImageUrl ? (
                      <img
                        src={campaign.coverImageUrl}
                        alt={campaign.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <TrendingUp className="w-10 h-10 text-primary-500/40" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="text-lg font-semibold text-slate-100 truncate">
                            {campaign.title}
                          </h3>
                          <StatusChip status={(campaign.status ?? 'active') as any} />
                        </div>
                        <p className="text-sm text-slate-400 line-clamp-2">
                          {campaign.descriptionMarkdown?.slice(0, 160)}
                        </p>
                      </div>
                    </div>

                    {/* Milestones + Category */}
                    <div className="flex flex-wrap items-center gap-3 mb-4">
                      <Badge variant="blockchain">{campaign.milestones.length} Milestones</Badge>
                      <Badge variant="secondary" className="capitalize">{campaign.category}</Badge>
                      <span className="text-xs text-slate-500 font-mono">
                        {campaign.contractAddress.slice(0, 8)}…{campaign.contractAddress.slice(-6)}
                      </span>
                    </div>

                    {/* Goal progress (target only — no on-chain data here) */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-slate-500">Funding Goal</span>
                        <span className="font-medium text-slate-300">{campaign.targetGoal} MATIC</span>
                      </div>
                      <ProgressBar value={0} max={campaign.targetGoal} variant="success" />
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Link to={`/campaign/${campaign.contractAddress}/manage`}>
                        <Button variant="outline" size="sm" leadingIcon={<Edit className="w-4 h-4" />}>
                          Manage
                        </Button>
                      </Link>
                      <Link to={`/campaign/${campaign.contractAddress}`}>
                        <Button variant="ghost" size="sm" leadingIcon={<Eye className="w-4 h-4" />}>
                          View Page
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
