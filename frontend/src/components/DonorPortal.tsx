import { useState } from "react";
import toast from "react-hot-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Button, GlassCard, ProgressBar, Alert } from "@/components/ui";
import { useAuth } from "@clerk/clerk-react";
import { useAccount } from "wagmi";
import { useCampaignContractActions } from "@/hooks/useCampaignContract";
import { api } from "@/lib/api";

interface CampaignSummary {
  contractAddress: string;
  title: string;
  goal: string;
  raised: string;
  milestoneCount: number;
  activeMilestoneIndex?: number;
}

interface DonorPortalProps {
  campaign: CampaignSummary;
}

export function DonorPortal({ campaign }: DonorPortalProps) {
  const { isSignedIn } = useAuth();
  const { address } = useAccount();
  const queryClient = useQueryClient();
  const { contribute, voteOnMilestone, isPending } = useCampaignContractActions(
    campaign.contractAddress as `0x${string}`
  );

  const [amount, setAmount] = useState("");
  const [voteNote, setVoteNote] = useState("");

  const raisedValue = Number.parseFloat(campaign.raised.replace(/,/g, "")) || 0;
  const goalValue = Number.parseFloat(campaign.goal.replace(/,/g, "")) || 1;
  const progress = Math.min(100, Math.round((raisedValue / goalValue) * 100));
  const milestoneIndex = campaign.activeMilestoneIndex ?? 0;

  async function handleContribute() {
    if (!isSignedIn) {
      toast.error("Sign in with your wallet before contributing");
      return;
    }

    try {
      await contribute(amount);
      await queryClient.invalidateQueries({ queryKey: ["campaign", campaign.contractAddress] });
      if (address) {
        await queryClient.invalidateQueries({ queryKey: ["donations", address] });
      }
      toast.success("Donation successful!");
      setAmount("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Contribution failed");
    }
  }

  async function handleVote(support: boolean) {
    if (!isSignedIn) {
      toast.error("Sign in with your wallet before voting");
      return;
    }

    try {
      await voteOnMilestone(milestoneIndex, support);
      await queryClient.invalidateQueries({ queryKey: ["campaign", campaign.contractAddress] });
      setVoteNote("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Vote failed");
    }
  }

  return (
    <GlassCard className="p-6">
      <p className="text-xs uppercase tracking-[0.3em] text-magenta-200/80">Donor Portal</p>
      <h3 className="mt-2 font-display text-2xl font-semibold text-white/90">{campaign.title}</h3>

      {!isSignedIn && (
        <Alert variant="info" className="mt-6 text-sm">
          Connect your wallet and sign in to donate securely and track your history.
        </Alert>
      )}

      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
          <div className="text-xs uppercase tracking-[0.25em] text-slate-400">Goal</div>
          <div className="mt-2 text-lg font-semibold text-white/90">{campaign.goal} MATIC</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
          <div className="text-xs uppercase tracking-[0.25em] text-slate-400">Raised</div>
          <div className="mt-2 text-lg font-semibold text-cyan-300">{campaign.raised} MATIC</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
          <div className="text-xs uppercase tracking-[0.25em] text-slate-400">Milestones</div>
          <div className="mt-2 text-lg font-semibold text-magenta-200">{campaign.milestoneCount}</div>
        </div>
      </div>

      <div className="mt-5">
        <ProgressBar value={progress} label="Funding progress" />
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-[1fr_auto]">
        <label className="space-y-2 rounded-2xl border border-white/10 bg-white/5 p-4">
          <span className="block text-sm font-medium text-slate-200">Contribution amount (MATIC)</span>
          <input
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            className="w-full rounded-xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-400/50"
            placeholder="0.25"
          />
        </label>
        <Button
          variant="primary-glow"
          className="mt-auto"
          onClick={handleContribute}
          disabled={!amount || isPending}
          isLoading={isPending}
        >
          Contribute
        </Button>
      </div>

      <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
        <label className="space-y-2">
          <span className="block text-sm font-medium text-slate-200">
            Vote on milestone {milestoneIndex + 1}
          </span>
          <input
            value={voteNote}
            onChange={(event) => setVoteNote(event.target.value)}
            className="w-full rounded-xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-magenta-400/50"
            placeholder="Optional note for your vote"
          />
        </label>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button variant="glass-outline" onClick={() => handleVote(true)} disabled={isPending}>
            Support
          </Button>
          <Button variant="ghost" onClick={() => handleVote(false)} disabled={isPending}>
            Reject
          </Button>
        </div>
      </div>
    </GlassCard>
  );
}
