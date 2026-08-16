import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Activity, Users, Target, ShieldCheck, AlertTriangle, CheckCircle,
  ChevronRight, BarChart3, TrendingUp
} from 'lucide-react';
import { GlassCard, Skeleton } from '@/components/ui';
import { api } from '@/lib/api';
import { BarChart } from '@/components/charts/BarChart';
import { DonutChart } from '@/components/charts/DonutChart';

function HealthIndicator({ status, name }: { status?: 'ok' | 'degraded' | 'down', name: string }) {
  const normalizedStatus = status || 'down';
  const colorMap = {
    ok: 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]',
    degraded: 'bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.5)]',
    down: 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]'
  };

  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50 border border-white/[0.04]">
      <span className="text-sm font-medium text-slate-300 capitalize">{name}</span>
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-500 capitalize">{normalizedStatus}</span>
        <div className={`w-2.5 h-2.5 rounded-full ${colorMap[normalizedStatus]}`} />
      </div>
    </div>
  );
}

function formatNumber(value?: number) {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(value || 0);
}

function formatCompact(value?: number) {
  return new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 }).format(value || 0);
}

function MetricCard({ label, value, detail, icon: Icon, tone }: {
  label: string;
  value: string | number;
  detail: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: 'blue' | 'emerald' | 'amber' | 'purple' | 'rose' | 'cyan';
}) {
  const tones = {
    blue: 'bg-blue-500/10 text-blue-400',
    emerald: 'bg-emerald-500/10 text-emerald-400',
    amber: 'bg-amber-500/10 text-amber-400',
    purple: 'bg-purple-500/10 text-purple-400',
    rose: 'bg-rose-500/10 text-rose-400',
    cyan: 'bg-cyan-500/10 text-cyan-400'
  };

  return (
    <div className="p-5 rounded-xl bg-slate-800/50 border border-white/[0.04] min-h-[116px]">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="text-sm text-slate-400">{label}</div>
        <div className={`p-2 rounded-lg ${tones[tone]}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div className="text-3xl font-bold text-slate-100 leading-none">{value}</div>
      <div className="text-xs text-slate-500 mt-3">{detail}</div>
    </div>
  );
}

export function AdminDashboardPage() {
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['adminStats'],
    queryFn: () => api.getPlatformStats(),
  });

  const { data: healthData, isLoading: healthLoading } = useQuery({
    queryKey: ['adminHealth'],
    queryFn: () => api.adminGetPlatformHealth(),
    refetchInterval: 30000 // auto refresh health every 30s
  });

  const { data: activityData, isLoading: activityLoading } = useQuery({
    queryKey: ['adminActivity'],
    queryFn: () => api.adminGetActivity(),
    refetchInterval: 10000
  });

  const { data: donationsTimeData, isLoading: donationsLoading } = useQuery({
    queryKey: ['adminDonationsTime'],
    queryFn: () => api.adminGetDonationsOverTime(14)
  });

  const { data: roleData, isLoading: roleLoading } = useQuery({
    queryKey: ['adminRoleDistribution'],
    queryFn: () => api.adminGetRoleDistribution()
  });

  const stats = statsData?.stats;
  const health = healthData?.health;
  const activities = activityData?.activities || [];

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
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
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
            <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-blue-400 transition-colors" />
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
            <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-emerald-400 transition-colors" />
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
            <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-purple-400 transition-colors" />
          </GlassCard>
        </Link>
        <Link to="/admin/audit-log" className="block group">
          <GlassCard className="p-5 flex items-center justify-between hover:border-amber-500/30 hover:bg-amber-500/5 transition-all">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-amber-500/10 text-amber-400 group-hover:scale-110 transition-transform">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-200">Audit Trail</h3>
                <p className="text-xs text-slate-400">Track admin actions</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-amber-400 transition-colors" />
          </GlassCard>
        </Link>
        <Link to="/admin/analytics" className="block group xl:col-span-4 md:col-span-2">
          <GlassCard className="p-3 flex items-center justify-center gap-2 hover:border-primary-500/30 hover:bg-primary-500/5 transition-all text-sm text-primary-400">
            <BarChart3 className="w-4 h-4" />
            <span className="font-medium">View Full Analytics Dashboard</span>
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
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                <MetricCard
                  label="Total Campaigns"
                  value={formatNumber(stats.campaigns.total)}
                  detail={`${formatNumber(stats.campaigns.active)} active campaigns`}
                  icon={Target}
                  tone="emerald"
                />
                <MetricCard
                  label="Goal Volume"
                  value={`${formatCompact(stats.campaigns.totalGoalAmount)} POL`}
                  detail={`Average goal ${formatNumber(stats.campaigns.avgGoal)} POL`}
                  icon={BarChart3}
                  tone="purple"
                />
                <MetricCard
                  label="Confirmed Funding"
                  value={`${formatCompact(stats.donations.totalAmount)} POL`}
                  detail={`${formatNumber(stats.donations.uniqueCampaignCount)} funded campaigns`}
                  icon={TrendingUp}
                  tone="cyan"
                />
                <MetricCard
                  label="Donations"
                  value={formatNumber(stats.donations.totalDonations)}
                  detail={`${formatNumber(stats.donations.uniqueDonorCount)} unique donors`}
                  icon={Activity}
                  tone="blue"
                />
                <MetricCard
                  label="Registered Users"
                  value={formatNumber(stats.users.total)}
                  detail={`${formatNumber(stats.users.byRole?.creator || 0)} creators, ${formatNumber(stats.users.byRole?.donor || 0)} donors`}
                  icon={Users}
                  tone="amber"
                />
                <MetricCard
                  label="Pending Reviews"
                  value={formatNumber(stats.users.pendingReview || 0)}
                  detail="Accounts waiting for admin approval"
                  icon={ShieldCheck}
                  tone="rose"
                />
              </div>
            )}
          </GlassCard>

          <GlassCard className="p-6">
            <h2 className="text-lg font-bold text-slate-100 mb-6">Quick Analytics</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-sm font-medium text-slate-400 mb-4">Donations (Last 14 Days)</h3>
                {donationsLoading ? (
                  <Skeleton className="h-[200px] w-full" />
                ) : (
                  <BarChart 
                    data={(donationsTimeData?.data || []).map(d => ({ label: d.date.split('-').slice(1).join('/'), value: d.count }))} 
                    color="#3b82f6" 
                    height={200} 
                  />
                )}
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-slate-400 mb-4 text-center">User Role Distribution</h3>
                {roleLoading ? (
                  <Skeleton className="h-[200px] w-[200px] mx-auto rounded-full" />
                ) : (
                  <DonutChart 
                    data={(roleData?.data || []).map(r => ({
                      label: r.role,
                      value: r.count,
                      color: r.role === 'donor' ? '#10b981' : r.role === 'creator' ? '#3b82f6' : r.role === 'admin' ? '#8b5cf6' : '#f59e0b'
                    }))}
                    size={200}
                  />
                )}
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-slate-100">Recent Activity</h2>
              <span className="text-xs text-emerald-400 border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 rounded animate-pulse">● Live Stream</span>
            </div>
            
            {activityLoading ? (
              <div className="space-y-4">
                {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
              </div>
            ) : activities.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-slate-500">
                <Activity className="w-8 h-8 mb-3 text-slate-400" />
                <p>No recent activity detected.</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                {activities.map((act) => (
                  <Link key={`${act.id}-${act.timestamp}`} to={act.link} className="block group">
                    <div className="flex gap-4 p-4 rounded-xl bg-slate-800/30 hover:bg-slate-800/70 border border-white/[0.04] hover:border-white/[0.1] transition-all">
                      <div className={`p-2.5 rounded-lg h-fit flex-shrink-0 ${
                        act.type === 'donation' ? 'bg-emerald-500/10 text-emerald-400' :
                        act.type === 'campaign_flagged' ? 'bg-red-500/10 text-red-400' :
                        act.type === 'user_registered' ? 'bg-blue-500/10 text-blue-400' :
                        act.type === 'admin_action' ? 'bg-amber-500/10 text-amber-400' :
                        'bg-purple-500/10 text-purple-400'
                      }`}>
                        {act.type === 'donation' && <TrendingUp className="w-4 h-4" />}
                        {act.type === 'campaign_flagged' && <AlertTriangle className="w-4 h-4" />}
                        {act.type === 'user_registered' && <Users className="w-4 h-4" />}
                        {act.type === 'admin_action' && <ShieldCheck className="w-4 h-4" />}
                        {act.type === 'campaign_created' && <Target className="w-4 h-4" />}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <h4 className="text-sm font-bold text-slate-200 truncate group-hover:text-primary-300 transition-colors">{act.title}</h4>
                          <span className="text-[10px] text-slate-500 whitespace-nowrap">
                            {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 truncate">{act.message}</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
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
                  <HealthIndicator name="Blockchain RPC" status={health.blockchainRpc?.status} />
                  <HealthIndicator name="Notifications" status={health.notificationEngine?.status} />
                  {health.checkedAt && (
                    <div className="pt-2 text-[11px] text-slate-500 text-center">
                      Last checked {new Date(health.checkedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      {typeof health.responseTimeMs === 'number' ? ` in ${health.responseTimeMs}ms` : ''}
                    </div>
                  )}
                </>
              )}
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}






