import React, { useState } from 'react';
import {
  Users,
  DollarSign,
  Target,
  Activity,
  BarChart3,
  AlertCircle,
  TrendingUp
} from 'lucide-react';
import { GlassCard, Badge, Skeleton } from '@/components/ui';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@clerk/clerk-react';
import { api } from '@/lib/api';

type TimeRange = '7d' | '30d' | '90d' | 'all';

export function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');
  const { isSignedIn } = useAuth();

  const { data: statsResponse, isLoading, isError } = useQuery({
    queryKey: ['platformStats'],
    queryFn: () => api.getPlatformStats(),
    enabled: !!isSignedIn
  });

  const stats = statsResponse?.stats;

  if (!isSignedIn) {
    return (
      <div className="page-container flex min-h-[60vh] items-center justify-center">
        <GlassCard className="p-8 max-w-md text-center">
          <AlertCircle className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2 text-slate-100">Authentication Required</h2>
          <p className="text-slate-400">Please sign in to view platform analytics.</p>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-slate-100">Analytics</h1>
          <p className="text-slate-400 mt-1">Platform metrics and insights</p>
        </div>
        <div className="flex gap-2">
          {(['7d', '30d', '90d', 'all'] as const).map((range) => (
            <button
              key={range}
              id={`analytics-range-${range}`}
              onClick={() => setTimeRange(range)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                timeRange === range
                  ? 'bg-primary-600 text-white shadow-glow-primary'
                  : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700/50 hover:text-slate-200 border border-white/[0.06]'
              }`}
            >
              {range === 'all' ? 'All Time' : range.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {[...Array(6)].map((_, i) => (
              <GlassCard key={i} className="p-4">
                <Skeleton className="h-16 w-full" />
              </GlassCard>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <GlassCard className="p-6"><Skeleton className="h-40 w-full" /></GlassCard>
            <GlassCard className="p-6"><Skeleton className="h-40 w-full" /></GlassCard>
          </div>
        </div>
      ) : isError || !stats ? (
        <GlassCard className="p-8 text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2 text-slate-100">Loading Error</h2>
          <p className="text-slate-400">
            Failed to load platform analytics. Please try again.
          </p>
        </GlassCard>
      ) : (
        <div className="space-y-8">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            <GlassCard className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-2 rounded-lg bg-primary-500/10">
                  <DollarSign className="w-4 h-4 text-primary-400" />
                </div>
                <span className="text-xs text-slate-500">Total Goal</span>
              </div>
              <div className="text-2xl font-bold text-slate-100">
                {stats.campaigns.totalGoalAmount.toLocaleString()}
              </div>
              <div className="text-xs text-slate-500 mt-1">MATIC</div>
            </GlassCard>

            <GlassCard className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-2 rounded-lg bg-secondary-500/10">
                  <Target className="w-4 h-4 text-secondary-400" />
                </div>
                <span className="text-xs text-slate-500">Campaigns</span>
              </div>
              <div className="text-2xl font-bold text-slate-100">
                {stats.campaigns.active}
                <span className="text-base text-slate-500">/{stats.campaigns.total}</span>
              </div>
              <div className="text-xs text-slate-500 mt-1">Active / Total</div>
            </GlassCard>

            <GlassCard className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Users className="w-4 h-4 text-blue-400" />
                </div>
                <span className="text-xs text-slate-500">Donors</span>
              </div>
              <div className="text-2xl font-bold text-slate-100">
                {stats.donations.uniqueDonorCount.toLocaleString()}
              </div>
              <div className="text-xs text-slate-500 mt-1">Unique wallets</div>
            </GlassCard>

            <GlassCard className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-2 rounded-lg bg-yellow-500/10">
                  <Activity className="w-4 h-4 text-yellow-400" />
                </div>
                <span className="text-xs text-slate-500">Avg Goal</span>
              </div>
              <div className="text-2xl font-bold text-slate-100">
                {stats.campaigns.avgGoal.toFixed(1)}
              </div>
              <div className="text-xs text-slate-500 mt-1">MATIC / campaign</div>
            </GlassCard>

            <GlassCard className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-2 rounded-lg bg-emerald-500/10">
                  <BarChart3 className="w-4 h-4 text-emerald-400" />
                </div>
                <span className="text-xs text-slate-500">Donations</span>
              </div>
              <div className="text-2xl font-bold text-slate-100">
                {stats.donations.totalDonations.toLocaleString()}
              </div>
              <div className="text-xs text-slate-500 mt-1">Total transactions</div>
            </GlassCard>

            <GlassCard className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-2 rounded-lg bg-violet-500/10">
                  <Users className="w-4 h-4 text-violet-400" />
                </div>
                <span className="text-xs text-slate-500">Users</span>
              </div>
              <div className="text-2xl font-bold text-slate-100">
                {stats.users.total.toLocaleString()}
              </div>
              <div className="text-xs text-slate-500 mt-1">Registered</div>
            </GlassCard>
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Campaign Categories */}
            <GlassCard className="p-6">
              <div className="mb-5">
                <h2 className="text-lg font-semibold text-slate-100">Campaign Categories</h2>
                <p className="text-sm text-slate-500 mt-1">Distribution across platform</p>
              </div>
              {Object.keys(stats.campaigns.categories || {}).length === 0 ? (
                <div className="text-center text-slate-500 py-8">No category data yet.</div>
              ) : (
                <div className="space-y-3">
                  {Object.entries(stats.campaigns.categories)
                    .sort((a, b) => b[1] - a[1])
                    .map(([category, count]) => {
                      const total = Object.values(stats.campaigns.categories).reduce((a, b) => a + b, 0);
                      const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                      return (
                        <div key={category}>
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span className="text-slate-300 capitalize">{category}</span>
                            <span className="text-slate-400">{count} ({pct}%)</span>
                          </div>
                          <div className="h-2 bg-slate-700/60 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-primary-600 to-secondary-600 rounded-full transition-all duration-700"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </GlassCard>

            {/* User Roles */}
            <GlassCard className="p-6">
              <div className="mb-5">
                <h2 className="text-lg font-semibold text-slate-100">User Role Distribution</h2>
                <p className="text-sm text-slate-500 mt-1">Breakdown by role type</p>
              </div>
              {Object.keys(stats.users.byRole || {}).length === 0 ? (
                <div className="text-center text-slate-500 py-8">No role data yet.</div>
              ) : (
                <div className="space-y-3">
                  {Object.entries(stats.users.byRole)
                    .sort((a, b) => b[1] - a[1])
                    .map(([role, count]) => {
                      const pct = stats.users.total > 0
                        ? Math.round((count / stats.users.total) * 100) : 0;
                      const colorMap: Record<string, string> = {
                        admin: 'from-red-500 to-orange-500',
                        creator: 'from-secondary-500 to-primary-500',
                        donor: 'from-emerald-500 to-teal-500'
                      };
                      return (
                        <div key={role}>
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span className="text-slate-300 capitalize">{role}</span>
                            <span className="text-slate-400">{count} ({pct}%)</span>
                          </div>
                          <div className="h-2 bg-slate-700/60 rounded-full overflow-hidden">
                            <div
                              className={`h-full bg-gradient-to-r ${colorMap[role] ?? 'from-primary-600 to-secondary-600'} rounded-full transition-all duration-700`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </GlassCard>
          </div>

          {/* Donation funnel */}
          <GlassCard className="p-6">
            <div className="mb-5">
              <h2 className="text-lg font-semibold text-slate-100">Donation Reach</h2>
              <p className="text-sm text-slate-500 mt-1">
                How many campaigns received at least one donation
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
              <div className="p-4 rounded-xl bg-slate-800/50 border border-white/[0.05]">
                <div className="text-3xl font-bold text-slate-100 mb-1">
                  {stats.campaigns.total}
                </div>
                <div className="text-sm text-slate-400">Total Campaigns</div>
              </div>
              <div className="p-4 rounded-xl bg-slate-800/50 border border-white/[0.05]">
                <div className="text-3xl font-bold text-emerald-400 mb-1">
                  {stats.donations.uniqueCampaignCount}
                </div>
                <div className="text-sm text-slate-400">Campaigns Funded</div>
              </div>
              <div className="p-4 rounded-xl bg-slate-800/50 border border-white/[0.05]">
                <div className="text-3xl font-bold text-primary-400 mb-1">
                  {stats.campaigns.total > 0
                    ? Math.round((stats.donations.uniqueCampaignCount / stats.campaigns.total) * 100)
                    : 0}%
                </div>
                <div className="text-sm text-slate-400">Funding Rate</div>
              </div>
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
}

