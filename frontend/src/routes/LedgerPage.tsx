import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Search, ExternalLink, Download, FileSpreadsheet, ArrowUpRight, ShieldAlert, AlertCircle, Eye
} from 'lucide-react';
import { GlassCard, Button, Badge, Skeleton, Avatar } from '@/components/ui';
import { useAccount } from 'wagmi';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function LedgerPage() {
  const { address } = useAccount();
  // admin check placeholder
  const isAdmin = false; const { isSignedIn: siwe, getToken } = useAuth();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'donation' | 'refund' | 'release'>('all');
  
  // As requested in the plan, for now we just show the user's donations.
  // Aggregation of multiple endpoints or admin list will be stubbed for now 
  // as the backend endpoint GET /api/admin/donations doesn't exist yet, 
  // and we chose to hold off on backend modifications until confirmed by the user 
  // (Option A vs B). If the user approved Option B (frontend only), this will be extended.
  const { data: donationsData, isLoading } = useQuery({
    queryKey: ['ledger', address],
    queryFn: () => api.listDonationsByWallet(address!),
    enabled: !!address && !isAdmin, // if admin, we'd fetch adminListAllDonations here
  });

  const transactions = donationsData?.items ?? [];
  
  // Filter
  const filteredTransactions = transactions.filter(tx => {
    const matchesFilter = filter === 'all' || tx.status === filter; // using status as proxy for type
    const matchesSearch = searchQuery === '' || 
      tx.txHash.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.campaignAddress.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.campaign?.title?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const handleExport = () => {
    if (!transactions.length) return;
    const headers = ['Date,Type,From,To,Amount(MATIC),Campaign,TxHash,Status\n'];
    const rows = transactions.map(tx => 
      `${new Date(tx.createdAt).toISOString()},Donation,${tx.walletAddress},${tx.campaignAddress},${tx.amount},"${tx.campaign?.title ?? 'Unknown'}",${tx.txHash},${tx.status}`
    );
    const blob = new Blob([headers.join('') + rows.join('\n')], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ledger-${isAdmin ? 'platform' : address?.slice(0,6)}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (!address) {
    return (
      <div className="page-container flex min-h-[60vh] items-center justify-center">
        <GlassCard className="p-8 max-w-md text-center">
          <AlertCircle className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2 text-slate-100">Wallet Not Connected</h2>
          <p className="text-slate-400">Connect your wallet to view the ledger.</p>
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
          <p className="text-slate-400">
            {isAdmin ? "Platform-wide transaction history" : "Your complete transaction history"}
          </p>
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
                filteredTransactions.map(tx => (
                  <tr key={tx._id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 pr-4 whitespace-nowrap text-slate-400">
                      {new Date(tx.createdAt).toLocaleDateString()}
                      <div className="text-xs text-slate-600">{new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant="primary" className="bg-primary-500/10 text-primary-300 border-primary-500/20">Donation</Badge>
                    </td>
                    <td className="py-3 px-4 max-w-[200px]">
                      <div className="flex items-center gap-2 truncate">
                        <Avatar address={tx.walletAddress} size="sm" />
                        <span className="font-mono text-slate-300 truncate" title={tx.walletAddress}>
                          {tx.walletAddress.slice(0, 6)}…{tx.walletAddress.slice(-4)}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 mt-1 pl-8 flex items-center gap-1">
                        to <span className="font-mono">{tx.campaignAddress.slice(0, 6)}…</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="font-semibold text-slate-200">{tx.amount}</div>
                      <div className="text-xs text-slate-500">MATIC</div>
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
                ))
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
}
