import React, { useState } from 'react';
import { X, ThumbsUp, ThumbsDown, FileText, ExternalLink, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button, GlassCard } from '@/components/ui';
import { useCampaignContract } from '@/hooks/useCampaignContract';

interface Evidence {
  type: 'image' | 'document' | 'link';
  url: string;
  title: string;
}

interface VotingModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaignAddress: string;
  campaignTitle: string;
  milestoneIndex: number;
  milestoneTitle: string;
  milestoneDescription: string;
  evidence: Evidence[];
  votesFor: number;
  votesAgainst: number;
  requiredVotes: number;
}

type VotingStep = 'review' | 'confirm' | 'processing' | 'success' | 'error';

export const VotingModal: React.FC<VotingModalProps> = ({
  isOpen,
  onClose,
  campaignAddress,
  campaignTitle,
  milestoneIndex,
  milestoneTitle,
  milestoneDescription,
  evidence,
  votesFor,
  votesAgainst,
  requiredVotes,
}) => {
  const { vote } = useCampaignContract(campaignAddress);
  const [step, setStep] = useState<VotingStep>('review');
  const [support, setSupport] = useState<boolean | null>(null);
  const [comment, setComment] = useState('');
  const [txHash, setTxHash] = useState('');
  const [error, setError] = useState('');

  const handleVote = async () => {
    if (support === null) return;
    setStep('processing');
    try {
      const result = await vote({ milestoneIndex, support });
      setTxHash(result.hash);
      setStep('success');
    } catch (err: any) {
      setError(err.message || 'Transaction failed');
      setStep('error');
    }
  };

  const handleClose = () => {
    setStep('review');
    setSupport(null);
    setComment('');
    setError('');
    onClose();
  };

  const totalVotes = votesFor + votesAgainst;
  const approvalRate = totalVotes > 0 ? (votesFor / totalVotes) * 100 : 0;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={handleClose}
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        >
          <GlassCard className="p-6">
            <div className="flex items-start justify-between mb-6">
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-foreground mb-1">
                  {step === 'success' ? 'Vote Submitted!' : 'Review Milestone'}
                </h2>
                <p className="text-sm text-muted-foreground">{campaignTitle}</p>
              </div>
              <button onClick={handleClose} className="p-1 hover:bg-surface-elevated rounded">
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            {step === 'review' && (
              <>
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-foreground mb-2">{milestoneTitle}</h3>
                  <p className="text-sm text-muted-foreground">{milestoneDescription}</p>
                </div>
                <div className="mb-6 p-4 bg-surface rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-muted-foreground">Current Votes</span>
                    <span className="text-sm font-medium">{totalVotes} / {requiredVotes}</span>
                  </div>
                  <div className="flex gap-4 mb-3">
                    <div className="flex items-center gap-2"><ThumbsUp className="w-4 h-4 text-success" /><span className="text-sm">{votesFor}</span></div>
                    <div className="flex items-center gap-2"><ThumbsDown className="w-4 h-4 text-danger" /><span className="text-sm">{votesAgainst}</span></div>
                  </div>
                  {totalVotes > 0 && (
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-surface-elevated rounded-full overflow-hidden">
                        <div className="h-full bg-success" style={{ width: `${approvalRate}%` }} />
                      </div>
                      <span className="text-xs">{approvalRate.toFixed(0)}%</span>
                    </div>
                  )}
                </div>
                {evidence.length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-sm font-medium mb-3">Evidence ({evidence.length})</h4>
                    <div className="grid gap-3">
                      {evidence.map((item, idx) => (
                        <a key={idx} href={item.url} target="_blank" rel="noopener noreferrer" 
                           className="p-4 bg-surface rounded-lg border hover:border-primary transition-colors">
                          <div className="flex items-start gap-3">
                            <FileText className="w-5 h-5 text-primary" />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium truncate">{item.title}</div>
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                {item.type}<ExternalLink className="w-3 h-3" />
                              </div>
                            </div>
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => { setSupport(false); setStep('confirm'); }}
                          className="p-4 rounded-lg border-2 border-danger hover:bg-danger/10">
                    <ThumbsDown className="w-8 h-8 text-danger mx-auto mb-2" />
                    <div className="text-sm font-semibold text-danger">Reject</div>
                  </button>
                  <button onClick={() => { setSupport(true); setStep('confirm'); }}
                          className="p-4 rounded-lg border-2 border-success hover:bg-success/10">
                    <ThumbsUp className="w-8 h-8 text-success mx-auto mb-2" />
                    <div className="text-sm font-semibold text-success">Approve</div>
                  </button>
                </div>
              </>
            )}

            {step === 'confirm' && (
              <>
                <div className="mb-6 p-6 rounded-lg text-center" style={{ backgroundColor: support ? 'hsl(var(--success) / 0.1)' : 'hsl(var(--danger) / 0.1)' }}>
                  {support ? <ThumbsUp className="w-12 h-12 text-success mx-auto mb-3" /> : <ThumbsDown className="w-12 h-12 text-danger mx-auto mb-3" />}
                  <h3 className="text-lg font-semibold mb-2">{support ? 'Approve' : 'Reject'} Milestone</h3>
                  <p className="text-sm text-muted-foreground">You are about to {support ? 'approve' : 'reject'} "{milestoneTitle}"</p>
                </div>
                <div className="mb-6">
                  <label className="block text-sm font-medium mb-2">Comment (Optional)</label>
                  <textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Add reasoning..." rows={3}
                            className="w-full px-4 py-3 bg-surface border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none" />
                </div>
                {error && <div className="mb-4 p-3 bg-danger/10 border border-danger/20 rounded-lg"><p className="text-sm text-danger">{error}</p></div>}
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setStep('review')} className="flex-1">Back</Button>
                  <Button variant="primary" onClick={handleVote} className="flex-1">Confirm Vote</Button>
                </div>
              </>
            )}

            {step === 'processing' && (
              <div className="py-8 text-center">
                <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Submitting Vote</h3>
                <p className="text-sm text-muted-foreground">Confirm transaction in your wallet...</p>
              </div>
            )}

            {step === 'success' && (
              <div className="py-8 text-center">
                <CheckCircle className="w-12 h-12 text-success mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Vote Submitted</h3>
                <p className="text-sm text-muted-foreground mb-6">Your {support ? 'approval' : 'rejection'} recorded on-chain</p>
                {txHash && <a href={`https://polygonscan.com/tx/${txHash}`} target="_blank" rel="noopener noreferrer" 
                              className="inline-flex items-center gap-2 text-sm text-blockchain hover:underline mb-6">
                  View Transaction<ExternalLink className="w-4 h-4" />
                </a>}
                <Button variant="primary" onClick={handleClose} className="w-full">Done</Button>
              </div>
            )}

            {step === 'error' && (
              <div className="py-8 text-center">
                <AlertCircle className="w-12 h-12 text-danger mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Vote Failed</h3>
                <p className="text-sm text-muted-foreground mb-6">{error}</p>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={handleClose} className="flex-1">Cancel</Button>
                  <Button variant="primary" onClick={() => setStep('review')} className="flex-1">Try Again</Button>
                </div>
              </div>
            )}
          </GlassCard>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
