import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Search, ExternalLink, Download, FileSpreadsheet, ShieldAlert, AlertCircle, Eye
} from 'lucide-react';
import { GlassCard, Button, Badge, Skeleton, Avatar, Alert } from '@/components/ui';
import { useAccount } from 'wagmi';
import { useAuth } from '@clerk/clerk-react';
import { useQuery } from '@tanstack/react-query';
import { formatUnits } from 'viem';
import { api } from '@/lib/api';
import type { PlatformLedgerItem } from '@/lib/api';

function shortenAddress(value?: string) {
  if (!value) return 'Unknown';
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

function getTransferLabel(type: PlatformLedgerItem['type']) {
  if (type === 'release') return 'Release';
  if (type === 'refund') return 'Refund';
  return 'Donation';
}

function getTypeBadgeVariant(type: PlatformLedgerItem['type']) {
  if (type === 'release') return 'success' as const;
  if (type === 'refund') return 'warning' as const;
  return 'primary' as const;
}

export function LedgerPage() {
  const { address } = useAccount();
  const { isLoaded, isSignedIn } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'donation' | 'refund' | 'release'>('all');
  const [page, setPage] = useState(1);

  useEffect(() => {
    async function resolveRole() {
      if (!isLoaded || !isSignedIn || !address) {
        setIsAdmin(false);
        return;
      }

      try {
        const res = await api.getCurrentUser();
        setIsAdmin(res.user?.role === 'admin' && res.user?.accountStatus === 'active');
      } catch {
        setIsAdmin(false);
      }
    }

    resolveRole();
  }, [isLoaded, isSignedIn, address]);
  
  useEffect(() => {
    setPage(1);
  }, [filter, searchQuery]);
  
  const { data: donationsData, isLoading, error } = useQuery({
    queryKey: ['platform-ledger', isSignedIn, page, searchQuery, filter],
    queryFn: () => api.listPlatformLedger({
      page,
      limit: 100,
      search: searchQuery.trim() || undefined,
      type: filter === 'all' ? undefined : filter
    }),
    enabled: !!isSignedIn,
  });

  const transactions = (donationsData?.items ?? []) as PlatformLedgerItem[];
  const summary = donationsData?.summary ?? null;
  const pagination = donationsData?.pagination;
  
  // Filter
  const filteredTransactions = transactions.filter(tx => {
    const type = tx.type || 'donation';
    const fromAddress = tx.fromAddress || tx.walletAddress;
    const toAddress = tx.toAddress || tx.campaignAddress;
    const matchesFilter = filter === 'all' || type === filter;
    const matchesSearch = searchQuery === '' || 
      tx.txHash.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.campaignAddress.toLowerCase().includes(searchQuery.toLowerCase()) ||
      fromAddress.toLowerCase().includes(searchQuery.toLowerCase()) ||
      toAddress.toLowerCase().includes(searchQuery.toLowerCase()) ||
      type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.campaign?.title?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const handleExport = () => {
    if (!transactions.length) return;
    const headers = ['Date,Type,From,To,Amount(POL),Campaign,TxHash,Status\n'];
    const rows = transactions.map(tx => 
      `${new Date(tx.createdAt).toISOString()},${getTransferLabel(tx.type)},${tx.fromAddress},${tx.toAddress},${tx.amount},"${tx.campaign?.title ?? 'Unknown'}",${tx.txHash},${tx.status}`
    );
    const blob = new Blob([headers.join('') + rows.join('\n')], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ledger-platform-${isAdmin ? 'admin' : address?.slice(0,6) ?? 'user'}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (!isSignedIn) {
    return (
      <div className="page-container max-w-5xl space-y-6">
        <GlassCard className="p-8 text-center">
          <AlertCircle className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2 text-slate-100">Sign in to view the Ledger</h2>
          <p className="text-slate-400 max-w-2xl mx-auto">
            Please sign in to view the immutable platform-wide transaction ledger.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button to="/sign-in">Sign In</Button>
            <Button variant="outline" to="/explore">Browse campaigns</Button>
          </div>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="page-container max-w-7xl">
      {/* Header */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-3xl font-display font-bold text-slate-100">Transaction Ledger</h1>
            {isAdmin && <Badge variant="warning" className="flex items-center gap-1"><ShieldAlert className="w-3 h-3" /> Admin View</Badge>}
          </div>
          <div className="mb-6">
            <Alert variant="info" title="Global Ledger">
              This immutable on-chain ledger provides complete transparency into donations, refunds, and milestone fund releases recorded on the platform.
            </Alert>
          </div>
        </div>
        <Button
          variant="outline"
          leadingIcon={<Download className="w-4 h-4" />}
          onClick={handleExport}
          disabled={transactions.length === 0}
        >
          Export CSV
        </Button>
      </div>

      {isAdmin && summary && (
        <div className="grid gap-4 mb-6 md:grid-cols-4">
          <GlassCard className="p-4">
            <p className="text-xs uppercase tracking-wider text-slate-500">Total donations</p>
            <p className="mt-2 text-2xl font-bold text-slate-100">{summary.totalDonations}</p>
          </GlassCard>
          <GlassCard className="p-4">
            <p className="text-xs uppercase tracking-wider text-slate-500">Unique donors</p>
            <p className="mt-2 text-2xl font-bold text-slate-100">{summary.uniqueDonorCount}</p>
          </GlassCard>
          <GlassCard className="p-4">
            <p className="text-xs uppercase tracking-wider text-slate-500">Unique campaigns</p>
            <p className="mt-2 text-2xl font-bold text-slate-100">{summary.uniqueCampaignCount}</p>
          </GlassCard>
          <GlassCard className="p-4">
            <p className="text-xs uppercase tracking-wider text-slate-500">Total volume</p>
            <p className="mt-2 text-2xl font-bold text-slate-100">
              {formatUnits(BigInt(summary.totalAmountWei || "0"), 18)} POL
            </p>
          </GlassCard>
        </div>
      )}

      {error && (
        <Alert variant="danger" title="Ledger unavailable" className="mb-6">
          {error.message}
        </Alert>
      )}

      <GlassCard className="p-6 overflow-hidden flex flex-col">
        {/* Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search tx hash, address, or campaign…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-800/50 border border-white/[0.08] rounded-lg text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition-colors"
            />
          </div>
          <div className="flex gap-2">
            {(['all', 'donation', 'refund', 'release'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors ${
                  filter === f
                    ? 'bg-primary-600 text-white'
                    : 'text-slate-400 hover:bg-slate-700/50 border border-transparent'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto -mx-6 px-6">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/[0.08] text-sm font-medium text-slate-400">
                <th className="pb-3 pr-4 font-medium whitespace-nowrap">Date</th>
                <th className="pb-3 px-4 font-medium whitespace-nowrap">Type</th>
                <th className="pb-3 px-4 font-medium">From / To</th>
                <th className="pb-3 px-4 font-medium text-right whitespace-nowrap">Amount</th>
                <th className="pb-3 px-4 font-medium">Campaign</th>
                <th className="pb-3 pl-4 font-medium whitespace-nowrap">Tx / Status</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="border-b border-white/[0.04]">
                    <td className="py-4 pr-4"><Skeleton className="h-4 w-24" /></td>
                    <td className="py-4 px-4"><Skeleton className="h-6 w-20 rounded-full" /></td>
                    <td className="py-4 px-4"><Skeleton className="h-4 w-32" /></td>
                    <td className="py-4 px-4"><Skeleton className="h-4 w-16 ml-auto" /></td>
                    <td className="py-4 px-4"><Skeleton className="h-4 w-32" /></td>
                    <td className="py-4 pl-4"><Skeleton className="h-6 w-24" /></td>
                  </tr>
                ))
              ) : filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    <FileSpreadsheet className="w-12 h-12 text-slate-700 mx-auto mb-3" />
                    <p>No transactions found.</p>
                  </td>
                </tr>
              ) : (
                filteredTransactions.map(tx => {
                  const type = tx.type || 'donation';
                  const fromAddress = tx.fromAddress || tx.walletAddress;
                  const toAddress = tx.toAddress || tx.campaignAddress;

                  return (
                  <tr key={`${type}-${tx._id}`} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 pr-4 whitespace-nowrap text-slate-400">
                      {new Date(tx.createdAt).toLocaleDateString()}
                      <div className="text-xs text-slate-400">{new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={getTypeBadgeVariant(type)}>{getTransferLabel(type)}</Badge>
                    </td>
                    <td className="py-3 px-4 max-w-[200px]">
                      <div className="flex items-center gap-2 truncate">
                        <Avatar fallback={fromAddress} size="sm" />
                        <span className="font-mono text-slate-300 truncate" title={fromAddress}>
                          {shortenAddress(fromAddress)}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 mt-1 pl-8 flex items-center gap-1">
                        to <span className="font-mono" title={toAddress}>{shortenAddress(toAddress)}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="font-semibold text-slate-200">{tx.amount}</div>
                      <div className="text-xs text-slate-500">POL</div>
                    </td>
                    <td className="py-3 px-4 max-w-[200px]">
                      <div className="text-slate-300 truncate font-medium" title={tx.campaign?.title}>
                        {tx.campaign?.title ?? 'Unknown'}
                      </div>
                      <Link to={`/campaign/${tx.campaignAddress}`} className="text-xs text-primary-400 hover:text-primary-300 flex items-center gap-1 mt-0.5">
                        <Eye className="w-3 h-3" /> View
                      </Link>
                    </td>
                    <td className="py-3 pl-4 whitespace-nowrap">
                      <div className="flex flex-col gap-1.5 items-start">
                        <a 
                          href={`https://amoy.polygonscan.com/tx/${tx.txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 bg-blue-500/10 px-2 py-0.5 rounded"
                        >
                          {tx.txHash.slice(0, 8)}… <ExternalLink className="w-3 h-3" />
                        </a>
                        <Badge variant={tx.status === 'confirmed' ? 'success' : tx.status === 'failed' ? 'danger' : 'warning'}>
                          {tx.status}
                        </Badge>
                      </div>
                    </td>
                  </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {pagination && pagination.totalPages > 1 && (
          <div className="mt-6 flex flex-col gap-3 border-t border-white/[0.08] pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-400">
              Page {pagination.page} of {pagination.totalPages} · {pagination.total} records
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={pagination.page <= 1 || isLoading}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((current) => Math.min(pagination.totalPages, current + 1))}
                disabled={pagination.page >= pagination.totalPages || isLoading}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </GlassCard>
    </div>
  );
}
