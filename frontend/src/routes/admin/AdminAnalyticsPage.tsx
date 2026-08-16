import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, TrendingUp, Users, Target, Download, Calendar } from 'lucide-react';
import { GlassCard, Button, Skeleton } from '@/components/ui';
import { api } from '@/lib/api';
import { BarChart } from '@/components/charts/BarChart';
import { DonutChart } from '@/components/charts/DonutChart';
import { SparkLine } from '@/components/charts/SparkLine';

export function AdminAnalyticsPage() {
  const [days, setDays] = useState(30);

  const { data: donationsTimeData, isLoading: donationsLoading } = useQuery({
    queryKey: ['adminDonationsTime', days],
    queryFn: () => api.adminGetDonationsOverTime(days)
  });

  const { data: userGrowthData, isLoading: userGrowthLoading } = useQuery({
    queryKey: ['adminUserGrowth', days],
    queryFn: () => api.adminGetUserGrowth(days)
  });

  const { data: categoryData, isLoading: categoryLoading } = useQuery({
    queryKey: ['adminCampaignCategories'],
    queryFn: () => api.adminGetCampaignCategories()
  });

  const { data: roleData, isLoading: roleLoading } = useQuery({
    queryKey: ['adminRoleDistribution'],
    queryFn: () => api.adminGetRoleDistribution()
  });

  const handleExportCSV = (data: any[], filename: string) => {
    if (!data || data.length === 0) return;
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(obj => Object.values(obj).join(',')).join('\n');
    const csvContent = "data:text/csv;charset=utf-8," + headers + "\n" + rows;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="page-container">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-3xl font-display font-bold text-slate-100">Analytics & Reports</h1>
            <BarChart3 className="w-6 h-6 text-primary-400" />
          </div>
          <p className="text-slate-400">Deep dive into platform metrics and trends</p>
        </div>

        <div className="flex items-center gap-2 bg-slate-800/50 p-1.5 rounded-lg border border-white/[0.04]">
          <Calendar className="w-4 h-4 text-slate-400 ml-2" />
          <select 
            value={days} 
            onChange={(e) => setDays(Number(e.target.value))}
            className="bg-transparent text-slate-200 text-sm font-medium focus:outline-none pr-2 [&>option]:bg-slate-800"
          >
            <option value={7}>Last 7 Days</option>
            <option value={30}>Last 30 Days</option>
            <option value={90}>Last 90 Days</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Donations Trend */}
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
                <TrendingUp className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold text-slate-100">Donations Trend</h2>
            </div>
            <Button 
              variant="outline" 
              className="text-xs py-1 h-auto"
              onClick={() => handleExportCSV(donationsTimeData?.data || [], 'donations_trend')}
              disabled={donationsLoading || !donationsTimeData?.data?.length}
            >
              <Download className="w-3 h-3 mr-2" /> Export
            </Button>
          </div>
          
          <div className="h-[250px] w-full mt-4">
            {donationsLoading ? (
              <Skeleton className="h-full w-full" />
            ) : (
              <BarChart 
                data={(donationsTimeData?.data || []).map(d => ({ label: d.date.split('-').slice(1).join('/'), value: d.count }))} 
                color="#3b82f6" 
                height={230} 
              />
            )}
          </div>
        </GlassCard>

        {/* User Growth */}
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
                <Users className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold text-slate-100">User Growth</h2>
            </div>
            <Button 
              variant="outline" 
              className="text-xs py-1 h-auto"
              onClick={() => handleExportCSV(userGrowthData?.data || [], 'user_growth')}
              disabled={userGrowthLoading || !userGrowthData?.data?.length}
            >
              <Download className="w-3 h-3 mr-2" /> Export
            </Button>
          </div>
          
          <div className="h-[250px] w-full mt-4">
            {userGrowthLoading ? (
              <Skeleton className="h-full w-full" />
            ) : (
              <div className="flex flex-col gap-4">
                <SparkLine 
                  data={(userGrowthData?.data || []).map(d => d.count)} 
                  color="#10b981" 
                  height={150} 
                />
                <div className="flex justify-between text-xs text-slate-500 px-2">
                  <span>{(userGrowthData?.data || [])[0]?.date}</span>
                  <span>{(userGrowthData?.data || [])[(userGrowthData?.data?.length || 1) - 1]?.date}</span>
                </div>
              </div>
            )}
          </div>
        </GlassCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Role Distribution */}
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400">
                <Users className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold text-slate-100">Role Distribution</h2>
            </div>
          </div>
          
          <div className="flex justify-center items-center h-[300px]">
            {roleLoading ? (
              <Skeleton className="h-[250px] w-[250px] rounded-full" />
            ) : (
              <DonutChart 
                data={(roleData?.data || []).map(r => ({
                  label: r.role,
                  value: r.count,
                  color: r.role === 'donor' ? '#10b981' : r.role === 'creator' ? '#3b82f6' : r.role === 'admin' ? '#8b5cf6' : '#f59e0b'
                }))}
                size={250}
              />
            )}
          </div>
        </GlassCard>

        {/* Campaign Categories */}
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-rose-500/10 rounded-lg text-rose-400">
                <Target className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold text-slate-100">Campaign Categories</h2>
            </div>
            <Button 
              variant="outline" 
              className="text-xs py-1 h-auto"
              onClick={() => handleExportCSV(categoryData?.data || [], 'campaign_categories')}
              disabled={categoryLoading || !categoryData?.data?.length}
            >
              <Download className="w-3 h-3 mr-2" /> Export
            </Button>
          </div>
          
          <div className="h-[300px] w-full flex items-end">
            {categoryLoading ? (
              <Skeleton className="h-full w-full" />
            ) : (
              <BarChart 
                data={(categoryData?.data || []).map(c => ({ label: c.category, value: c.count }))} 
                color="#f43f5e" 
                height={280} 
              />
            )}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
