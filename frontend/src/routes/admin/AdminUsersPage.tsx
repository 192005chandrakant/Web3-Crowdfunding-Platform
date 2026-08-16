import React, { useState, useEffect } from 'react';
import { Search, ShieldAlert, Users, CheckCircle2, XCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { GlassCard, Button, Badge, Skeleton, Avatar } from '@/components/ui';
import { useAccount } from 'wagmi';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, ApiAdminUser } from '@/lib/api';
import toast from 'react-hot-toast';

export function AdminUsersPage() {
  const { address } = useAccount();
  const queryClient = useQueryClient();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const limit = 20;

  // Debounce search input to avoid spamming the backend
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1); // Reset to page 1 on new search
    }, 500);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Reset page when filter changes
  useEffect(() => {
    setPage(1);
  }, [roleFilter]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter]);
  
  const { data: usersData, isLoading } = useQuery({
    queryKey: ['adminUsers', roleFilter, statusFilter, debouncedSearch, page],
    queryFn: () => api.adminListUsers({ 
      page,
      limit, 
      role: roleFilter !== 'all' ? roleFilter : undefined,
      accountStatus: statusFilter !== 'all' ? statusFilter : undefined,
      search: debouncedSearch || undefined
    }),
  });

  const users = usersData?.items ?? [];
  const totalPages = usersData?.pagination?.totalPages || 1;

  // Update Role Mutation
  const updateRoleMutation = useMutation({
    mutationFn: ({ wallet, role }: { wallet: string, role: string }) => 
      api.adminUpdateUserRole(wallet, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
      toast.success('User role updated successfully');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to update user role');
    }
  });

  // Update Verification Mutation
  const verifyMutation = useMutation({
    mutationFn: ({ wallet, status }: { wallet: string, status: string }) => 
      api.adminUpdateUserVerification(wallet, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
      toast.success('User verification status updated');
    },
    onError: (err: any) => toast.error(err.message || 'Failed to update verification')
  });

  const reviewMutation = useMutation({
    mutationFn: ({ wallet, decision, role }: { wallet: string; decision: 'approve' | 'reject'; role?: string }) =>
      api.adminReviewUser(wallet, { decision, role, reviewNotes: decision === 'reject' ? 'Rejected after admin review' : '' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
      toast.success('Account review updated');
    },
    onError: (err: any) => toast.error(err.message || 'Failed to review account')
  });

  const handleRoleChange = (wallet: string, newRole: string) => {
    if (wallet === address && newRole !== 'admin') {
      if (!window.confirm("WARNING: You are about to remove your own admin privileges. Are you sure?")) return;
    }
    updateRoleMutation.mutate({ wallet, role: newRole });
  };

  const handleVerifyChange = (wallet: string, newStatus: string) => {
    verifyMutation.mutate({ wallet, status: newStatus });
  };

  const handleReviewDecision = (wallet: string, decision: 'approve' | 'reject', role?: string) => {
    reviewMutation.mutate({ wallet, decision, role });
  };

  return (
    <div className="page-container max-w-7xl">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-3xl font-display font-bold text-slate-100">User Management</h1>
            <Badge variant="warning" className="flex items-center gap-1"><ShieldAlert className="w-3 h-3" /> Admin</Badge>
          </div>
          <p className="text-slate-400">View registered users, enforce platform KYC, and manage access roles.</p>
        </div>
      </div>

      <GlassCard className="p-6 overflow-hidden flex flex-col">
        {/* Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="relative w-full md:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search by wallet address or name…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-800/50 border border-white/[0.08] rounded-lg text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition-colors"
            />
          </div>
          <div className="flex gap-2 bg-slate-800/50 p-1 rounded-lg border border-white/[0.04]">
            {(['all', 'admin', 'donor', 'creator', 'reviewer'] as const).map(f => (
              <button
                key={f}
                onClick={() => setRoleFilter(f)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium capitalize transition-colors ${
                  roleFilter === f
                    ? 'bg-slate-700 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
          <div className="flex gap-2 bg-slate-800/50 p-1 rounded-lg border border-white/[0.04]">
            {(['all', 'active', 'pending_review', 'suspended', 'rejected'] as const).map(f => (
              <button
                key={f}
                onClick={() => setStatusFilter(f)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium capitalize transition-colors ${
                  statusFilter === f
                    ? 'bg-slate-700 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
                }`}
              >
                {f.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto -mx-6 px-6">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="border-b border-white/[0.08] text-sm font-medium text-slate-400">
                <th className="pb-3 pr-4 font-medium">User / Wallet</th>
                <th className="pb-3 px-4 font-medium">Joined Date</th>
                <th className="pb-3 px-4 font-medium">Account</th>
                <th className="pb-3 px-4 font-medium">Verification (KYC)</th>
                <th className="pb-3 pl-4 font-medium text-right">Access Role</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="border-b border-white/[0.04]">
                    <td className="py-4 pr-4"><Skeleton className="h-10 w-48" /></td>
                    <td className="py-4 px-4"><Skeleton className="h-4 w-24" /></td>
                    <td className="py-4 px-4"><Skeleton className="h-6 w-32 rounded-full" /></td>
                    <td className="py-4 pl-4"><Skeleton className="h-10 w-32 ml-auto" /></td>
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-slate-500">
                    <Users className="w-12 h-12 text-slate-700 mx-auto mb-3" />
                    <p>No users found matching your criteria.</p>
                  </td>
                </tr>
              ) : (
                users.map((user: ApiAdminUser) => (
                  <tr key={user.walletAddress} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-3">
                        <Avatar fallback={user.walletAddress} size="md" />
                        <div>
                          <div className="font-semibold text-slate-200">
                            {user.displayName || 'Anonymous User'}
                            {user.walletAddress === address && (
                              <Badge variant="primary" className="ml-2">You</Badge>
                            )}
                          </div>
                          <div className="text-xs text-slate-500 font-mono mt-0.5">
                            {user.walletAddress}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-400">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-2">
                        <Badge variant={user.accountStatus === 'active' ? 'success' : user.accountStatus === 'pending_review' ? 'warning' : 'danger'}>
                          {(user.accountStatus || 'active').replace('_', ' ')}
                        </Badge>
                        {user.requestedRole && user.requestedRole !== user.role && (
                          <Badge variant="primary">Requested {user.requestedRole}</Badge>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <select
                        value={user.verificationStatus || 'unverified'}
                        onChange={(e) => handleVerifyChange(user.walletAddress, e.target.value)}
                        disabled={verifyMutation.isPending}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition-colors ${
                          user.verificationStatus === 'verified'
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                            : user.verificationStatus === 'pending'
                            ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                            : 'bg-slate-800/50 border-white/[0.08] text-slate-400'
                        }`}
                      >
                        <option value="unverified">Unverified</option>
                        <option value="pending">Pending KYC</option>
                        <option value="verified">Verified</option>
                        <option value="rejected">Rejected</option>
                      </select>
                    </td>
                    <td className="py-3 pl-4 text-right">
                      <div className="flex flex-col items-end gap-2">
                        <select
                          value={user.role || 'donor'}
                          onChange={(e) => handleRoleChange(user.walletAddress, e.target.value)}
                          disabled={updateRoleMutation.isPending}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium border focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition-colors ${
                            user.role === 'admin' 
                              ? 'bg-red-500/10 border-red-500/50 dark:border-red-500/40 text-red-400'
                              : user.role === 'creator'
                              ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                              : 'bg-slate-800/50 border-white/[0.08] text-slate-300'
                          }`}
                        >
                          <option value="donor">Donor</option>
                          <option value="creator">Creator</option>
                          <option value="reviewer">Reviewer</option>
                          <option value="moderator">Moderator</option>
                          <option value="admin">Admin</option>
                        </select>
                        {user.accountStatus === 'pending_review' && (
                          <div className="flex gap-2">
                            <Button size="sm" variant="primary" onClick={() => handleReviewDecision(user.walletAddress, 'approve', user.requestedRole || user.role)}>
                              <CheckCircle2 className="w-4 h-4 mr-1" /> Approve
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleReviewDecision(user.walletAddress, 'reject', user.requestedRole || user.role)}>
                              <XCircle className="w-4 h-4 mr-1" /> Reject
                            </Button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Server-side Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-6 pt-6 border-t border-white/[0.06]">
            <div className="text-sm text-slate-400">
              Page {page} of {totalPages}
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
                className="border-white/[0.08] hover:bg-slate-800"
              >
                <ChevronLeft className="w-4 h-4" /> Previous
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                disabled={page >= totalPages}
                onClick={() => setPage(p => p + 1)}
                className="border-white/[0.08] hover:bg-slate-800"
              >
                Next <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </GlassCard>
    </div>
  );
}
