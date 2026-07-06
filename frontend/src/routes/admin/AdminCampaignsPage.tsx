import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, ShieldAlert, Flag, Target, AlertTriangle, ExternalLink } from 'lucide-react';
import { GlassCard, Button, Badge, Skeleton, StatusChip } from '@/components/ui';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, ApiCampaign } from '@/lib/api';
import toast from 'react-hot-toast';

export function AdminCampaignsPage() {
  const { address } = useAccount(); const { isSignedIn: siwe, getToken } = useAuth();
  const queryClient = useQueryClient();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'flagged'>('all');

  // We fetch all campaigns if 'all' or 'active', and specific flagged campaigns if 'flagged'
  // (Assuming api.listCampaigns can return flagged if we don't filter them out, 
  // but we also have adminListFlaggedCampaigns for a dedicated view)
  const { data: campaignsData, isLoading } = useQuery({
    queryKey: ['adminCampaigns', filter, searchQuery],
    queryFn: () => filter === 'flagged' 
      ? api.adminListFlaggedCampaigns({ limit: 50 }, siwe!)
      : api.listCampaigns({ limit: 50, search: searchQuery || undefined }),
    enabled: !!siwe
  });

  const campaigns = campaignsData?.items ?? [];

  // Local search fallback
  const filteredCampaigns = campaigns.filter(c => {
    const matchesSearch = !searchQuery || 
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      c.contractAddress.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filter === 'all' || 
      (filter === 'active' && c.status === 'active') ||
      (filter === 'flagged' && c.isFlagged);
    return matchesSearch && matchesFilter;
  });

  // Flag Mutation
  const flagMutation = useMutation({
    mutationFn: ({ address, flagged, reason }: { address: string, flagged: boolean, reason: string }) => 
      api.adminFlagCampaign(address, flagged, reason, siwe!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminCampaigns'] });
      toast.success('Campaign flag status updated');
    },
    onError: (err: any) => toast.error(err.message || 'Failed to update flag')
  });

  // Status Mutation
  const statusMutation = useMutation({
    mutationFn: ({ address, status }: { address: string, status: string }) => 
      api.adminUpdateCampaignStatus(address, status, siwe!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminCampaigns'] });
      toast.success('Campaign status updated');
    },
    onError: (err: any) => toast.error(err.message || 'Failed to update status')
  });

  const handleFlagToggle = (campaign: ApiCampaign) => {
    if (campaign.isFlagged) {
      if (window.confirm('Remove flag from this campaign?')) {
        flagMutation.mutate({ address: campaign.contractAddress, flagged: false, reason: '' });
      }
    } else {
      const reason = window.prompt('Enter reason for flagging this campaign:');
      if (reason) {
        flagMutation.mutate({ address: campaign.contractAddress, flagged: true, reason });
      }
    }
  };

  return (
    <div className="page-container max-w-7xl">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-3xl font-display font-bold text-slate-100">Campaign Moderation</h1>
            <Badge variant="warning" className="flex items-center gap-1"><ShieldAlert className="w-3 h-3" /> Admin</Badge>
          </div>
          <p className="text-slate-400">Monitor campaigns, manage flags, and enforce platform rules.</p>
        </div>
      </div>

      <GlassCard className="p-6 overflow-hidden flex flex-col">
        {/* Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="relative w-full md:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search by title or address…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-800/50 border border-white/[0.08] rounded-lg text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition-colors"
            />
          </div>
          <div className="flex gap-2 bg-slate-800/50 p-1 rounded-lg border border-white/[0.04]">
            {(['all', 'active', 'flagged'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium capitalize transition-colors flex items-center gap-2 ${
                  filter === f
                    ? 'bg-slate-700 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
                }`}
              >
                {f === 'flagged' && <Flag className={`w-3.5 h-3.5 ${filter === f ? 'text-red-400' : ''}`} />}
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto -mx-6 px-6">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="border-b border-white/[0.08] text-sm font-medium text-slate-400">
                <th className="pb-3 pr-4 font-medium">Campaign</th>
                <th className="pb-3 px-4 font-medium">Creator</th>
                <th className="pb-3 px-4 font-medium">Status / Goal</th>
                <th className="pb-3 px-4 font-medium">Moderation</th>
                <th className="pb-3 pl-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="border-b border-white/[0.04]">
                    <td className="py-4 pr-4"><Skeleton className="h-10 w-48" /></td>
                    <td className="py-4 px-4"><Skeleton className="h-4 w-24" /></td>
                    <td className="py-4 px-4"><Skeleton className="h-6 w-24 rounded-full" /></td>
                    <td className="py-4 px-4"><Skeleton className="h-6 w-20" /></td>
                    <td className="py-4 pl-4"><Skeleton className="h-8 w-24 ml-auto" /></td>
                  </tr>
                ))
              ) : filteredCampaigns.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500">
                    <Target className="w-12 h-12 text-slate-700 mx-auto mb-3" />
                    <p>No campaigns found matching your criteria.</p>
                  </td>
                </tr>
              ) : (
                filteredCampaigns.map((campaign) => (
                  <tr key={campaign.contractAddress} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 pr-4 max-w-[250px]">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-slate-800 overflow-hidden flex-shrink-0">
                          {campaign.coverImageUrl ? (
                            <img src={campaign.coverImageUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <Target className="w-5 h-5 text-slate-500 m-2.5" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <Link 
                            to={`/campaign/${campaign.contractAddress}`}
                            className="font-semibold text-slate-200 hover:text-primary-300 truncate block"
                          >
                            {campaign.title}
                          </Link>
                          <div className="text-xs text-slate-500 font-mono mt-0.5 truncate flex items-center gap-1">
                            {campaign.contractAddress.slice(0, 8)}…{campaign.contractAddress.slice(-6)}
                            <a href={`https://amoy.polygonscan.com/address/${campaign.contractAddress}`} target="_blank" rel="noreferrer">
                              <ExternalLink className="w-3 h-3 hover:text-primary-400" />
                            </a>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-mono text-slate-400" title={campaign.creatorAddress}>
                        {campaign.creatorAddress.slice(0, 6)}…{campaign.creatorAddress.slice(-4)}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-col gap-1.5 items-start">
                        <StatusChip status={(campaign.status ?? 'active') as any} />
                        <span className="text-xs text-slate-400 font-medium">{campaign.targetGoal} MATIC</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {campaign.isFlagged ? (
                        <div className="flex flex-col gap-1">
                          <Badge variant="danger" className="w-fit flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> Flagged
                          </Badge>
                          <span className="text-xs text-red-400 max-w-[150px] truncate" title={campaign.flagReason}>
                            "{campaign.flagReason}"
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-500 text-xs">No issues</span>
                      )}
                    </td>
                    <td className="py-3 pl-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <select
                          value={campaign.status ?? 'active'}
                          onChange={(e) => statusMutation.mutate({ address: campaign.contractAddress, status: e.target.value })}
                          className="px-2 py-1.5 rounded-lg text-xs font-medium bg-slate-800/50 border border-white/[0.08] text-slate-300 focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition-colors"
                        >
                          <option value="active">Active</option>
                          <option value="paused">Paused</option>
                          <option value="completed">Completed</option>
                          <option value="cancelled">Cancelled</option>
                        </select>

                        <button
                          onClick={() => handleFlagToggle(campaign)}
                          className={`p-1.5 rounded-lg border transition-colors ${
                            campaign.isFlagged 
                              ? 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20'
                              : 'bg-slate-800/50 border-white/[0.08] text-slate-400 hover:text-red-400 hover:bg-red-500/10'
                          }`}
                          title={campaign.isFlagged ? 'Remove Flag' : 'Flag Campaign'}
                        >
                          <Flag className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
}
