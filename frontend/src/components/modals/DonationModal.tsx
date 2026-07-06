import React, { useState } from 'react';
import { X, Heart, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button, GlassCard, ProgressBar } from '@/components/ui';
import { useCampaignContractActions } from '@/hooks/useCampaignContract';
import { parseEther, formatEther } from 'viem';
import { useAccount, useBalance } from 'wagmi';

interface DonationModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaignAddress: string;
  campaignTitle: string;
  targetAmount: string;
  currentAmount: string;
}

type DonationStep = 'amount' | 'confirm' | 'processing' | 'success' | 'error';

export const DonationModal: React.FC<DonationModalProps> = ({
  isOpen,
  onClose,
  campaignAddress,
  campaignTitle,
  targetAmount,
  currentAmount,
}) => {
  const { address } = useAccount();
  const { data: balance } = useBalance({ address });
  const { contribute } = useCampaignContractActions(campaignAddress as `0x${string}`);

  const [step, setStep] = useState<DonationStep>('amount');
  const [amount, setAmount] = useState('');
  const [customAmount, setCustomAmount] = useState('');
  const [txHash, setTxHash] = useState('');
  const [error, setError] = useState('');

  const presetAmounts = ['0.01', '0.05', '0.1', '0.5', '1.0'];
  const remaining = parseFloat(targetAmount) - parseFloat(currentAmount);
  const userBalance = balance ? parseFloat(formatEther(balance.value)) : 0;

  const handleAmountSelect = (value: string) => {
    setAmount(value);
    setCustomAmount('');
  };

  const handleCustomAmountChange = (value: string) => {
    setCustomAmount(value);
    setAmount(value);
  };

  const handleDonate = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    if (parseFloat(amount) > userBalance) {
      setError('Insufficient balance');
      return;
    }

    setStep('processing');
    setError('');

    try {
      const resultHash = await contribute(amount);
      setTxHash(resultHash);
      setStep('success');
    } catch (err: any) {
      console.error('Donation error:', err);
      setError(err.message || 'Transaction failed. Please try again.');
      setStep('error');
    }
  };

  const handleClose = () => {
    setStep('amount');
    setAmount('');
    setCustomAmount('');
    setError('');
    setTxHash('');
    onClose();
  };

  const progressPercentage = (parseFloat(currentAmount) / parseFloat(targetAmount)) * 100;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={handleClose}
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-md"
        >
          <GlassCard className="p-6">
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Heart className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-foreground">
                    {step === 'success' ? 'Donation Successful!' : 'Support Campaign'}
                  </h2>
                  <p className="text-sm text-muted-foreground truncate">
                    {campaignTitle}
                  </p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="p-1 hover:bg-surface-elevated rounded transition-colors"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            {/* Content */}
            {step === 'amount' && (
              <>
                {/* Campaign Progress */}
                <div className="mb-6 p-4 bg-surface rounded-lg">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Current Progress</span>
                    <span className="font-medium text-foreground">
                      {currentAmount} / {targetAmount} ETH
                    </span>
                  </div>
                  <ProgressBar 
                    value={parseFloat(currentAmount)} 
                    max={parseFloat(targetAmount)}
                    variant="success"
                    className="mb-2"
                  />
                  <p className="text-xs text-muted-foreground">
                    {remaining.toFixed(4)} ETH remaining to reach goal
                  </p>
                </div>

                {/* Amount Selection */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-foreground mb-3">
                    Select Amount (ETH)
                  </label>
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    {presetAmounts.map((preset) => (
                      <button
                        key={preset}
                        onClick={() => handleAmountSelect(preset)}
                        className={`p-3 rounded-lg border-2 transition-all text-center
                          ${amount === preset 
                            ? 'border-primary bg-primary/10 text-primary' 
                            : 'border-border hover:border-primary/50 text-foreground'
                          }`}
                      >
                        <div className="font-semibold">{preset}</div>
                        <div className="text-xs text-muted-foreground">ETH</div>
                      </button>
                    ))}
                  </div>

                  {/* Custom Amount */}
                  <div className="relative">
                    <input
                      type="number"
                      step="0.001"
                      min="0"
                      value={customAmount}
                      onChange={(e) => handleCustomAmountChange(e.target.value)}
                      placeholder="Custom amount"
                      className="w-full px-4 py-3 bg-surface border border-border rounded-lg 
                               text-foreground placeholder:text-muted-foreground
                               focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                      ETH
                    </span>
                  </div>
                </div>

                {/* Balance Info */}
                <div className="mb-6 p-3 bg-surface rounded-lg">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Your Balance</span>
                    <span className="font-medium text-foreground">
                      {userBalance.toFixed(4)} ETH
                    </span>
                  </div>
                </div>

                {/* Error */}
                {error && (
                  <div className="mb-4 p-3 bg-danger/10 border border-danger/20 rounded-lg">
                    <p className="text-sm text-danger">{error}</p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3">
                  <Button 
                    variant="outline" 
                    onClick={handleClose}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button 
                    variant="primary" 
                    onClick={() => setStep('confirm')}
                    disabled={!amount || parseFloat(amount) <= 0}
                    className="flex-1"
                  >
                    Continue
                  </Button>
                </div>
              </>
            )}

            {step === 'confirm' && (
              <>
                {/* Confirmation Details */}
                <div className="mb-6 space-y-4">
                  <div className="p-4 bg-surface rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-muted-foreground">Donation Amount</span>
                      <span className="text-2xl font-bold text-foreground">
                        {amount} ETH
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Est. Gas Fee</span>
                      <span className="text-foreground">~0.0001 ETH</span>
                    </div>
                  </div>

                  <div className="p-4 bg-blockchain/10 border border-blockchain/20 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-2">
                      <strong className="text-foreground">Secure Escrow:</strong>
                    </p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Your donation will be held in a secure smart contract escrow until 
                      milestones are completed and verified by the community. You may be 
                      eligible for a refund if the campaign is cancelled.
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <Button 
                    variant="outline" 
                    onClick={() => setStep('amount')}
                    className="flex-1"
                  >
                    Back
                  </Button>
                  <Button 
                    variant="primary" 
                    onClick={handleDonate}
                    leadingIcon={<Heart className="w-4 h-4" />}
                    className="flex-1"
                  >
                    Confirm Donation
                  </Button>
                </div>
              </>
            )}

            {step === 'processing' && (
              <div className="py-8 text-center">
                <div className="inline-flex items-center justify-center p-4 rounded-full bg-primary/10 mb-4">
                  <Loader2 className="w-12 h-12 text-primary animate-spin" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Processing Transaction
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Please confirm the transaction in your wallet and wait for blockchain confirmation...
                </p>
                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  <span>This may take a few moments</span>
                </div>
              </div>
            )}

            {step === 'success' && (
              <div className="py-8 text-center">
                <div className="inline-flex items-center justify-center p-4 rounded-full bg-success/10 mb-4">
                  <CheckCircle className="w-12 h-12 text-success" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Thank You for Your Support!
                </h3>
                <p className="text-sm text-muted-foreground mb-6">
                  Your donation of <strong className="text-foreground">{amount} ETH</strong> has been successfully processed.
                </p>

                {txHash && (
                  <a
                    href={`https://polygonscan.com/tx/${txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-blockchain hover:underline mb-6"
                  >
                    View Transaction
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                )}

                <Button 
                  variant="primary" 
                  onClick={handleClose}
                  className="w-full"
                >
                  Done
                </Button>
              </div>
            )}

            {step === 'error' && (
              <div className="py-8 text-center">
                <div className="inline-flex items-center justify-center p-4 rounded-full bg-danger/10 mb-4">
                  <AlertCircle className="w-12 h-12 text-danger" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Transaction Failed
                </h3>
                <p className="text-sm text-muted-foreground mb-6">
                  {error || 'An error occurred while processing your donation. Please try again.'}
                </p>

                <div className="flex gap-3">
                  <Button 
                    variant="outline" 
                    onClick={handleClose}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button 
                    variant="primary" 
                    onClick={() => setStep('amount')}
                    className="flex-1"
                  >
                    Try Again
                  </Button>
                </div>
              </div>
            )}
          </GlassCard>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
