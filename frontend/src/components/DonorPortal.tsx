import { useState } from "react";
import toast from "react-hot-toast";
import { useQueryClient } from "@tanstack/react-query";
import { usePublicClient } from "wagmi";
import { parseEther } from "viem";
import { Button, GlassCard, ProgressBar, Alert } from "@/components/ui";
import { useAuth } from "@clerk/clerk-react";
import { useAccount } from "wagmi";
import { useCampaignContractActions } from "@/hooks/useCampaignContract";
import { QVVotingPanel } from "@/components/QVVotingPanel";
import { computeQVDisplay } from "@/hooks/useQuadraticVoting";
import { api } from "@/lib/api";
import { TARGET_CHAIN_ID } from "@/lib/chain";
import { CheckCircle2, ExternalLink, RefreshCw, Zap, Sparkles } from "lucide-react";

interface CampaignSummary {
  contractAddress: string;
  title: string;
  goal: string;
  raised: string;
  milestoneCount: number;
  activeMilestoneIndex?: number;
  ipfsProofHash?: string;
}

interface DonorPortalProps {
  campaign: CampaignSummary;
}

const PRESET_AMOUNTS = ["0.1", "0.5", "1", "5", "10"];

export function DonorPortal({ campaign }: DonorPortalProps) {
  const { isSignedIn } = useAuth();
  const { address } = useAccount();
  const publicClient = usePublicClient({ chainId: TARGET_CHAIN_ID });
  const queryClient = useQueryClient();
  const { contribute, isPending } = useCampaignContractActions(
    campaign.contractAddress as `0x${string}`
  );

  const [amount, setAmount] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [lastTxHash, setLastTxHash] = useState<string | null>(null);
  const [lastDonationAmount, setLastDonationAmount] = useState<string | null>(null);

  const raisedValue = Number.parseFloat(campaign.raised.replace(/,/g, "")) || 0;
  const goalValue = Number.parseFloat(campaign.goal.replace(/,/g, "")) || 1;
  const progress = Math.min(100, Math.round((raisedValue / goalValue) * 100));
  const milestoneIndex = campaign.activeMilestoneIndex ?? 0;

  async function handleContribute() {
    if (!isSignedIn) {
      toast.error("Sign in with your wallet before contributing");
      return;
    }
    if (!address) {
      toast.error("Connect your wallet first");
      return;
    }
    if (!amount || Number.parseFloat(amount) <= 0) {
      toast.error("Enter a valid MATIC amount");
      return;
    }

    try {
      const hash = await contribute(amount);
      toast.loading("Waiting for blockchain confirmation…", { id: "contribute-pending" });

      // Wait for receipt to confirm the tx
      if (publicClient) {
        await publicClient.waitForTransactionReceipt({ hash });
      }

      toast.dismiss("contribute-pending");

      // Record donation in backend DB
      setIsRecording(true);
      try {
        const amountWei = parseEther(amount).toString();
        await api.recordDonation({
          walletAddress: address,
          campaignAddress: campaign.contractAddress,
          amount,
          amountWei,
          txHash: hash,
          chainId: TARGET_CHAIN_ID
        });
      } finally {
        setIsRecording(false);
      }

      // Invalidate relevant caches
      await queryClient.invalidateQueries({ queryKey: ["campaign", campaign.contractAddress] });
      if (address) {
        await queryClient.invalidateQueries({ queryKey: ["donations", address] });
        await queryClient.invalidateQueries({ queryKey: ["donationStats", address] });
        await queryClient.invalidateQueries({
          queryKey: ["qv-eligibility", campaign.contractAddress, address, milestoneIndex]
        });
        await queryClient.invalidateQueries({
          queryKey: ["qv-vote-status", campaign.contractAddress, address, milestoneIndex]
        });
      }
      await queryClient.invalidateQueries({ queryKey: ["qv-stats", campaign.contractAddress, milestoneIndex] });
      await queryClient.invalidateQueries({ queryKey: ["qv-donors", campaign.contractAddress] });

      toast.success("Donation successful and confirmed!", { duration: 5000 });
      setLastTxHash(hash);
      setLastDonationAmount(amount);
      setAmount("");
    } catch (error) {
      toast.dismiss("contribute-pending");
      const msg = error instanceof Error ? error.message : "Contribution failed";
      if (!msg.toLowerCase().includes("user rejected")) {
        toast.error(msg);
      }
    }
  }

  return (
    <GlassCard className="p-6 md:p-8 space-y-6">
      <div>
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono font-bold uppercase tracking-[0.25em] text-primary-400 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-primary-400 fill-primary-400/20" />
            <span>Escrow Donor Portal</span>
          </span>
          <span className="text-xs text-slate-400 bg-slate-900/80 px-2.5 py-1 rounded-full border border-slate-200 dark:border-white/10 font-mono">
            Chain ID: #{TARGET_CHAIN_ID}
          </span>
        </div>
        <h3 className="mt-2 text-2xl font-bold text-slate-100">{campaign.title}</h3>
      </div>

      {!isSignedIn && (
        <Alert variant="info" className="text-sm border-primary-500/40 dark:border-primary-500/30 dark:border-primary-500/20 bg-primary-50/50 dark:bg-primary-950/30 text-primary-800 dark:text-primary-200">
          Connect your Web3 wallet and sign in to donate securely, track your history, and acquire voting power.
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Target Goal</div>
          <div className="mt-1.5 text-lg font-bold text-slate-100">{campaign.goal} MATIC</div>
        </div>
        <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Total Raised</div>
          <div className="mt-1.5 text-lg font-bold text-emerald-400">{campaign.raised} MATIC</div>
        </div>
        <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Milestone Gates</div>
          <div className="mt-1.5 text-lg font-bold text-secondary-400">{campaign.milestoneCount} Gates</div>
        </div>
      </div>

      <div>
        <ProgressBar value={progress} label="Escrow Vault Funding Progress" variant="primary" />
      </div>

      {/* Interactive Success Receipt */}
      {lastTxHash && (
        <div className="p-5 rounded-2xl border border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/20 space-y-3">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-base">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            <span>Thank you! Your donation of {lastDonationAmount} POL is confirmed.</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Your funds are safely locked in the smart contract escrow. You have acquired <strong className="text-primary-300">{computeQVDisplay(parseFloat(lastDonationAmount || "0"))} quadratic votes</strong> to govern future milestone payouts.
          </p>
          <div className="flex items-center justify-between pt-2 border-t border-emerald-500/20 text-xs">
            <a
              href={`https://amoy.polygonscan.com/tx/${lastTxHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-emerald-300 hover:text-white font-mono font-medium underline transition-colors"
            >
              <span>View transaction receipt</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <button
              onClick={() => { setLastTxHash(null); setLastDonationAmount(null); }}
              className="text-slate-400 hover:text-slate-200 inline-flex items-center gap-1 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Donate again</span>
            </button>
          </div>
        </div>
      )}

      {/* Contribution Form & Preset Amount Chips */}
      {!lastTxHash && (
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-200">
              Select or Enter Amount (POL / MATIC)
            </label>

            {/* Quick preset amount chips */}
            <div className="flex flex-wrap gap-2 pt-1">
              {PRESET_AMOUNTS.map((preset) => {
                const isSelected = amount === preset;
                return (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setAmount(preset)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold font-mono transition-all duration-200 border ${
                      isSelected
                        ? "bg-primary-600 border-primary-400 text-white shadow-glow-sm"
                        : "bg-slate-900/80 border-white/[0.08] text-slate-300 hover:border-primary-500/40 hover:bg-slate-800"
                    }`}
                  >
                    {preset} POL
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
            <div className="space-y-2 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-900/40 p-4">
              <input
                type="number"
                step="0.01"
                min="0.0001"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-950/90 px-4 py-3 text-base text-white font-mono outline-none placeholder:text-slate-500 focus:border-primary-500 focus:ring-1 focus:ring-primary-500/50 transition-all"
                placeholder="0.00 POL"
              />
              {/* Live QV Power Preview */}
              {amount && parseFloat(amount) > 0 && (
                <div className="flex items-center gap-2 pt-1">
                  <Sparkles className="w-3.5 h-3.5 text-primary-400" />
                  <span className="text-xs text-slate-400">Estimated quadratic governance power:</span>
                  <span className="text-xs font-mono font-bold text-primary-300 bg-primary-50/50 dark:bg-primary-950/60 px-2 py-0.5 rounded border border-primary-500/40 dark:border-primary-500/30">
                    √{parseFloat(amount).toFixed(2)} = {computeQVDisplay(parseFloat(amount))} votes
                  </span>
                </div>
              )}
            </div>
            
            <Button
              variant="primary"
              size="lg"
              className="sm:h-auto sm:self-stretch px-8 font-bold shadow-glow-primary text-base rounded-2xl"
              onClick={handleContribute}
              disabled={!amount || isPending || isRecording || parseFloat(amount) <= 0}
              isLoading={isPending || isRecording}
            >
              {isRecording ? "Recording…" : "Contribute Now"}
            </Button>
          </div>
        </div>
      )}

      {/* QV Voting Panel */}
      <div className="pt-4 border-t border-white/[0.06]">
        <QVVotingPanel
          campaignAddress={campaign.contractAddress}
          milestoneIndex={milestoneIndex}
          milestoneTitle={`Milestone #${milestoneIndex + 1}`}
          ipfsProofHash={campaign.ipfsProofHash}
          onVoted={async () => {
            await queryClient.invalidateQueries({ queryKey: ["campaign", campaign.contractAddress] });
            if (address) {
              await queryClient.invalidateQueries({ queryKey: ["donations", address] });
            }
          }}
        />
      </div>
    </GlassCard>
  );
}
