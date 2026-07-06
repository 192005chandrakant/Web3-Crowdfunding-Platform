import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Activity, Users, Target, ShieldCheck, Database, 
  Server, Cloud, Mail, AlertTriangle, CheckCircle, 
  ChevronRight, BarChart3, TrendingUp
} from 'lucide-react';
import { GlassCard, Skeleton, StatusChip } from '@/components/ui';
import { api } from '@/lib/api';

function HealthIndicator({ status, name }: { status?: 'ok' | 'degraded' | 'down', name: string }) {
  const colorMap = {
    ok: 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]',
    degraded: 'bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.5)]',
    down: 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]'
  };

  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50 border border-white/[0.04]">
      <span className="text-sm font-medium text-slate-300 capitalize">{name}</span>
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-500 capitalize">{status || 'Unknown'}</span>
        <div className={`w-2.5 h-2.5 rounded-full ${colorMap[status || 'down']}`} />
      </div>
    </div>
  );
}

export function AdminDashboardPage() {
  const { address } = useAccount(); const { isSignedIn: siwe, getToken } = useAuth();

  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['adminStats'],
    queryFn: () => api.getPlatformStats(siwe!),
    enabled: !!siwe
  });

  const { data: healthData, isLoading: healthLoading } = useQuery({
    queryKey: ['adminHealth'],
    queryFn: () => api.adminGetPlatformHealth(siwe!),
    enabled: !!siwe,
    refetchInterval: 30000 // auto refresh health every 30s
  });

  const stats = statsData?.stats;
  const health = healthData?.health;

  return (
    <div className="page-container">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-3xl font-display font-bold text-slate-100">Admin Dashboard</h1>
          <ShieldCheck className="w-6 h-6 text-primary-400" />
        </div>
        <p className="text-slate-400">Platform overview, system health, and quick actions</p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Link to="/admin/users" className="block group">
          <GlassCard className="p-5 flex items-center justify-between hover:border-blue-500/30 hover:bg-blue-500/5 transition-all">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-blue-500/10 text-blue-400 group-hover:scale-110 transition-transform">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-200">Manage Users</h3>
                <p className="text-xs text-slate-400">View roles & verification</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-blue-400 transition-colors" />
          </GlassCard>
        </Link>
        <Link to="/admin/campaigns" className="block group">
          <GlassCard className="p-5 flex items-center justify-between hover:border-emerald-500/30 hover:bg-emerald-500/5 transition-all">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-emerald-500/10 text-emerald-400 group-hover:scale-110 transition-transform">
                <Target className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-200">Moderate Campaigns</h3>
                <p className="text-xs text-slate-400">Flag or pause activity</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-emerald-400 transition-colors" />
          </GlassCard>
        </Link>
        <Link to="/ledger" className="block group">
          <GlassCard className="p-5 flex items-center justify-between hover:border-purple-500/30 hover:bg-purple-500/5 transition-all">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-purple-500/10 text-purple-400 group-hover:scale-110 transition-transform">
                <BarChart3 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-200">View Ledger</h3>
                <p className="text-xs text-slate-400">Platform-wide tx history</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-purple-400 transition-colors" />
          </GlassCard>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: KPI Stats */}
        <div className="lg:col-span-2 space-y-6">
          <GlassCard className="p-6">
            <h2 className="text-lg font-bold text-slate-100 mb-6">Platform Metrics</h2>
            
            {statsLoading ? (
              <div className="grid grid-cols-2 gap-4">
                {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
              </div>
            ) : !stats ? (
              <div className="p-6 text-center text-slate-500 bg-slate-800/30 rounded-lg">Data unavailable</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-5 rounded-xl bg-slate-800/50 border border-white/[0.04]">
                  <div className="text-sm text-slate-400 mb-1">Total Campaigns</div>
                  <div className="text-3xl font-bold text-slate-100 flex items-end gap-2">
                    {stats.campaigns.total}
                    <span className="text-sm font-normal text-emerald-400 mb-1">({stats.campaigns.active} active)</span>
                  </div>
                </div>
                
                <div className="p-5 rounded-xl bg-slate-800/50 border border-white/[0.04]">
                  <div className="text-sm text-slate-400 mb-1">Platform Goal Volume</div>
                  <div className="text-3xl font-bold text-slate-100 flex items-end gap-2">
                    {stats.campaigns.totalGoalAmount.toLocaleString()}
                    <span className="text-sm font-normal text-slate-500 mb-1">MATIC</span>
                  </div>
                </div>

                <div className="p-5 rounded-xl bg-slate-800/50 border border-white/[0.04]">
                  <div className="text-sm text-slate-400 mb-1">Registered Users</div>
                  <div className="text-3xl font-bold text-slate-100 flex items-end gap-2">
                    {stats.users.total}
                    <span className="text-sm font-normal text-blue-400 mb-1">
                      ({stats.users.byRole?.creator || 0} creators)
                    </span>
                  </div>
                </div>

                <div className="p-5 rounded-xl bg-slate-800/50 border border-white/[0.04]">
                  <div className="text-sm text-slate-400 mb-1">Total Donations</div>
                  <div className="text-3xl font-bold text-slate-100 flex items-end gap-2">
                    {stats.donations.totalDonations}
                    <span className="text-sm font-normal text-slate-500 mb-1">transactions</span>
                  </div>
                </div>
              </div>
            )}
          </GlassCard>

          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-slate-100">Recent Activity</h2>
              <span className="text-xs text-slate-500 border border-white/[0.08] px-2 py-1 rounded">Live</span>
            </div>
            {/* In a real app, this would be wired to a websocket or recent events endpoint */}
            <div className="flex flex-col items-center justify-center py-8 text-slate-500">
              <Activity className="w-8 h-8 mb-3 text-slate-600" />
              <p>Activity feed coming in Phase 3</p>
            </div>
          </GlassCard>
        </div>

        {/* Right Column: Health Status */}
        <div className="space-y-6">
          <GlassCard className="p-6">
            <div className="flex flex-col items-center text-center pb-6 border-b border-white/[0.08] mb-6">
              {healthLoading ? (
                <Skeleton className="w-16 h-16 rounded-full mb-4" />
              ) : health?.overall === 'ok' ? (
                <div className="p-4 rounded-full bg-emerald-500/10 mb-4 shadow-[0_0_30px_rgba(16,185,129,0.2)]">
                  <CheckCircle className="w-10 h-10 text-emerald-400" />
                </div>
              ) : (
                <div className="p-4 rounded-full bg-red-500/10 mb-4 shadow-[0_0_30px_rgba(239,68,68,0.2)]">
                  <AlertTriangle className="w-10 h-10 text-red-400" />
                </div>
              )}
              
              <h2 className="text-xl font-bold text-slate-100 mb-1">System Status</h2>
              <p className="text-sm text-slate-400">
                {healthLoading ? 'Checking systems…' : 
                 health?.overall === 'ok' ? 'All systems operational' : 
                 'Service degradation detected'}
              </p>
            </div>

            <div className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-4">Infrastructure</h3>
              {healthLoading ? (
                [...Array(4)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)
              ) : !health ? (
                <div className="text-sm text-center text-slate-500">Unable to reach health endpoint</div>
              ) : (
                <>
                  <HealthIndicator name="MongoDB" status={health.mongodb?.status} />
                  <HealthIndicator name="Redis" status={health.redis?.status} />
                  <HealthIndicator name="IPFS (Pinata)" status={health.pinata?.status} />
                  <HealthIndicator name="Cloudinary" status={health.cloudinary?.status} />
                  <HealthIndicator name="Resend" status={health.resend?.status} />
                </>
              )}
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
