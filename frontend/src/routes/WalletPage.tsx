import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Wallet, ExternalLink, Copy, Check, Filter, Download, RefreshCw, AlertCircle, ArrowUpRight, ArrowDownLeft
} from 'lucide-react';
import { motion } from 'framer-motion';
import { GlassCard, Button, Badge, EmptyState, Skeleton, Avatar } from '@/components/ui';
import { useAccount, useBalance, useDisconnect } from 'wagmi';
import { formatEther } from 'viem';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

type TransactionFilter = 'all' | 'sent' | 'received';

export function WalletPage() {
  const { address, isConnected } = useAccount();
  const { data: balance } = useBalance({ address });
  const { disconnect } = useDisconnect();
  
  const [filter, setFilter] = useState<TransactionFilter>('all');
  const [copied, setCopied] = useState(false);

  // Fetch transactions involving this wallet
  const { data: donationsData, isLoading } = useQuery({
    queryKey: ['donations', address],
    queryFn: () => api.listDonationsByWallet(address!),
    enabled: !!address,
  });

  const transactions = donationsData?.items ?? [];

  // Filter
  const filteredTransactions = transactions.filter(tx => {
    // In a full implementation, we'd check if from==address (sent) or to==address (received).
    // For now, since api.listDonationsByWallet just returns donations made BY the wallet:
    if (filter === 'sent') return true; 
    if (filter === 'received') return false; // Needs backend endpoint for received donations
    return true;
  });

  const handleCopyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleExportTransactions = () => {
    if (!transactions.length) return;
    
    // Simple CSV export
    const headers = ['Date,Amount(MATIC),Type,Campaign,TxHash,Status\n'];
    const rows = transactions.map(tx => 
      `${new Date(tx.createdAt).toISOString()},${tx.amount},Donation,"${tx.campaign?.title ?? 'Unknown'}",${tx.txHash},${tx.status}`
    );
    
    const blob = new Blob([headers.join('') + rows.join('\n')], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', `transactions-${address?.slice(0,6)}.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  if (!isConnected || !address) {
    return (
      <div className="page-container flex min-h-[60vh] items-center justify-center">
        <GlassCard className="p-8 max-w-md text-center">
          <div className="p-4 rounded-full bg-primary-500/10 inline-block mb-4">
            <Wallet className="w-12 h-12 text-primary-400" />
          </div>
          <h2 className="text-xl font-bold mb-2 text-slate-100">Wallet Not Connected</h2>
          <p className="text-slate-400 mb-6">Connect your wallet to view balance and transaction history.</p>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-slate-100">Wallet</h1>
          <p className="text-slate-400 mt-1">Manage your funds and transaction history</p>
        </div>
        <Button
          variant="outline"
          onClick={() => disconnect()}
          className="border-red-500/30 text-red-400 hover:bg-red-500/10"
        >
          Disconnect Wallet
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Wallet Overview */}
        <div className="space-y-6">
          <GlassCard className="p-6">
            <div className="flex flex-col items-center text-center">
              <Avatar address={address} size="xl" className="mb-4 shadow-lg shadow-primary-500/20" />
              <h2 className="text-xl font-bold text-slate-100 mb-1">
                {address.slice(0, 6)}…{address.slice(-4)}
              </h2>
              <button
                onClick={handleCopyAddress}
                className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/50 rounded-full text-sm text-slate-400 hover:text-slate-200 transition-colors mb-6"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied!' : 'Copy Address'}
              </button>

              <div className="w-full p-4 bg-slate-800/50 border border-white/[0.06] rounded-xl">
                <div className="text-sm text-slate-400 mb-1">Available Balance</div>
                <div className="text-3xl font-bold text-slate-100 mb-1 flex items-baseline justify-center gap-2">
                  {balance ? parseFloat(balance.formatted).toFixed(4) : '0.0000'}
                  <span className="text-base text-slate-500 font-normal">MATIC</span>
                </div>
                <div className="text-xs text-primary-400">Polygon Amoy Testnet</div>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-6">
            <h3 className="font-semibold text-slate-100 mb-4">Quick Links</h3>
            <div className="space-y-2">
              <a
                href={`https://amoy.polygonscan.com/address/${address}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-800/50 text-slate-300 hover:text-primary-400 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <ExternalLink className="w-5 h-5 text-slate-500 group-hover:text-primary-400" />
                  <span>View on Polygonscan</span>
                </div>
              </a>
              <a
                href="https://faucet.polygon.technology/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-800/50 text-slate-300 hover:text-primary-400 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <RefreshCw className="w-5 h-5 text-slate-500 group-hover:text-primary-400" />
                  <span>Get Testnet Tokens</span>
                </div>
              </a>
            </div>
          </GlassCard>
        </div>

        {/* Right Column: Transactions */}
        <div className="lg:col-span-2 space-y-6">
          <GlassCard className="p-6 min-h-[600px] flex flex-col">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <h2 className="text-xl font-bold text-slate-100">Transaction History</h2>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  leadingIcon={<Download className="w-4 h-4" />}
                  onClick={handleExportTransactions}
                  disabled={transactions.length === 0}
                >
                  Export CSV
                </Button>
              </div>
            </div>

            {/* Filters */}
            <div className="flex gap-2 border-b border-white/[0.08] pb-4 mb-4">
              {(['all', 'sent', 'received'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium capitalize transition-colors ${
                    filter === f
                      ? 'bg-primary-600 text-white'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>

            {/* Transaction List */}
            {isLoading ? (
              <div className="space-y-4 flex-1">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-xl" />
                ))}
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className="flex-1 flex items-center justify-center">
                <EmptyState
                  icon={<Wallet className="w-12 h-12" />}
                  title="No transactions yet"
                  description={
                    filter === 'all'
                      ? "You haven't made any transactions on the platform."
                      : `No ${filter} transactions found.`
                  }
                  action={
                    <Link to="/explore">
                      <Button variant="primary">Explore Campaigns</Button>
                    </Link>
                  }
                />
              </div>
            ) : (
              <div className="space-y-3 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                {filteredTransactions.map((tx, index) => (
                  <motion.div
                    key={tx._id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-center justify-between p-4 rounded-xl bg-slate-800/30 hover:bg-slate-800/60 border border-transparent hover:border-white/[0.06] transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2.5 rounded-lg bg-orange-500/10 text-orange-400">
                        <ArrowUpRight className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-medium text-slate-200">
                          Donated to {tx.campaign?.title ?? 'Campaign'}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-slate-500">
                            {new Date(tx.createdAt).toLocaleDateString()}
                          </span>
                          <span className="text-slate-700">•</span>
                          <a
                            href={`https://amoy.polygonscan.com/tx/${tx.txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary-400 hover:text-primary-300 transition-colors flex items-center gap-1"
                          >
                            {tx.txHash.slice(0, 8)}… <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="font-bold text-slate-100 flex items-center justify-end gap-1">
                        - {tx.amount} <span className="text-xs font-normal text-slate-500">MATIC</span>
                      </div>
                      <div className="mt-1">
                        <Badge variant={tx.status === 'confirmed' ? 'success' : tx.status === 'pending' ? 'warning' : 'danger'}>
                          {tx.status}
                        </Badge>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
