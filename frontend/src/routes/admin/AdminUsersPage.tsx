import React, { useState } from 'react';
import { Search, Shield, ShieldAlert, Users, CheckCircle, Clock } from 'lucide-react';
import { GlassCard, Button, Badge, Skeleton, Avatar } from '@/components/ui';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, ApiAdminUser } from '@/lib/api';
import toast from 'react-hot-toast';

export function AdminUsersPage() {
  const { address } = useAccount(); const { isSignedIn: siwe, getToken } = useAuth();
  const queryClient = useQueryClient();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  
  const { data: usersData, isLoading } = useQuery({
    queryKey: ['adminUsers', roleFilter, searchQuery], // adding search/filter to key might trigger refetches if backend supports it
    queryFn: () => api.adminListUsers({ 
      limit: 100, 
      role: roleFilter !== 'all' ? roleFilter : undefined,
      search: searchQuery || undefined
    }, siwe!),
    enabled: !!siwe
  });

  const users = usersData?.items ?? [];

  // Local filtering as fallback (if backend doesn't implement it perfectly yet)
  const filteredUsers = users.filter(u => {
    const matchesSearch = !searchQuery || 
      u.walletAddress.toLowerCase().includes(searchQuery.toLowerCase()) || 
      u.displayName?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    
    return matchesSearch && matchesRole;
  });

  // Update Role Mutation
  const updateRoleMutation = useMutation({
    mutationFn: ({ wallet, role }: { wallet: string, role: string }) => 
      api.adminUpdateUserRole(wallet, role, siwe!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
      toast.success('User role updated successfully');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to update user role');
    }
  });

  const handleRoleChange = (wallet: string, newRole: string) => {
    // Prevent removing own admin privileges accidentally
    if (wallet === address && newRole !== 'admin') {
      if (!window.confirm("WARNING: You are about to remove your own admin privileges. Are you sure?")) {
        return;
      }
    }
    updateRoleMutation.mutate({ wallet, role: newRole });
  };

  return (
    <div className="page-container max-w-7xl">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-3xl font-display font-bold text-slate-100">User Management</h1>
            <Badge variant="warning" className="flex items-center gap-1"><ShieldAlert className="w-3 h-3" /> Admin</Badge>
          </div>
          <p className="text-slate-400">View registered users and manage their access roles.</p>
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
            {(['all', 'admin', 'donor', 'creator'] as const).map(f => (
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
        </div>

        {/* Table */}
        <div className="overflow-x-auto -mx-6 px-6">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="border-b border-white/[0.08] text-sm font-medium text-slate-400">
                <th className="pb-3 pr-4 font-medium">User / Wallet</th>
                <th className="pb-3 px-4 font-medium">Joined Date</th>
                <th className="pb-3 px-4 font-medium">Verification</th>
                <th className="pb-3 pl-4 font-medium text-right">Access Role</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="border-b border-white/[0.04]">
                    <td className="py-4 pr-4"><Skeleton className="h-10 w-48" /></td>
                    <td className="py-4 px-4"><Skeleton className="h-4 w-24" /></td>
                    <td className="py-4 px-4"><Skeleton className="h-6 w-24 rounded-full" /></td>
                    <td className="py-4 pl-4"><Skeleton className="h-10 w-32 ml-auto" /></td>
                  </tr>
                ))
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-slate-500">
                    <Users className="w-12 h-12 text-slate-700 mx-auto mb-3" />
                    <p>No users found matching your criteria.</p>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user: ApiAdminUser) => (
                  <tr key={user.walletAddress} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-3">
                        <Avatar address={user.walletAddress} size="md" />
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
                      {user.verificationStatus === 'verified' ? (
                        <Badge variant="success" className="flex w-fit items-center gap-1">
                          <CheckCircle className="w-3 h-3" /> Verified
                        </Badge>
                      ) : user.verificationStatus === 'pending' ? (
                        <Badge variant="warning" className="flex w-fit items-center gap-1">
                          <Clock className="w-3 h-3" /> Pending
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-slate-400">Unverified</Badge>
                      )}
                    </td>
                    <td className="py-3 pl-4 text-right">
                      <select
                        value={user.role || 'donor'}
                        onChange={(e) => handleRoleChange(user.walletAddress, e.target.value)}
                        disabled={updateRoleMutation.isPending}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium border focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition-colors ${
                          user.role === 'admin' 
                            ? 'bg-red-500/10 border-red-500/30 text-red-400'
                            : user.role === 'creator'
                            ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                            : 'bg-slate-800/50 border-white/[0.08] text-slate-300'
                        }`}
                      >
                        <option value="donor">Donor</option>
                        <option value="creator">Creator</option>
                        <option value="admin">Admin</option>
                      </select>
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
