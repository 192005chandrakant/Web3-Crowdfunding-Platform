import { useState } from "react";
import toast from "react-hot-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatEther } from "viem";
import { usePublicClient } from "wagmi";
import { CheckCircle2, ExternalLink, Loader2, Send } from "lucide-react";
import { Button, GlassCard, Alert } from "@/components/ui";
import { api } from "@/lib/api";
import { useCampaignContractActions } from "@/hooks/useCampaignContract";
import { useAuth } from "@clerk/clerk-react";
import { CAMPAIGN_ABI } from "@/lib/contracts";
import { TARGET_CHAIN_ID } from "@/lib/chain";

interface CreatorDashboardProps {
  contractAddress: string;
  milestones: Array<{
    title: string;
    targetAmount: number;
    deadline: string;
    payoutTxHash?: string;
    payoutRecipient?: string;
    payoutAmountPOL?: string;
    payoutReleasedAt?: string | null;
  }>;
}

interface ChainMilestoneState {
  targetAmount: string;
  approvalVotes: string;
  rejectionVotes: string;
  isCurrent: boolean;
  isPaid: boolean;
  ipfsProofHash: string;
  approved: boolean;
}

export function CreatorDashboard({ contractAddress, milestones }: CreatorDashboardProps) {
  const { getToken, isSignedIn } = useAuth();
  const queryClient = useQueryClient();
  const publicClient = usePublicClient({ chainId: TARGET_CHAIN_ID });
  const { submitMilestoneProof, executeTranche, isPending: isChainPending } =
    useCampaignContractActions(contractAddress as `0x${string}`);

  const [file, setFile] = useState<File | null>(null);
  const [milestoneIndex, setMilestoneIndex] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isReleasing, setIsReleasing] = useState(false);
  const [lastReleaseTxHash, setLastReleaseTxHash] = useState<string | null>(null);

  const chainStateKey = ["creator-milestone-chain-state", contractAddress, milestones.length];
  const { data: chainMilestones = [], isLoading: isLoadingChainState } = useQuery({
    queryKey: chainStateKey,
    enabled: Boolean(publicClient && contractAddress && milestones.length > 0),
    refetchInterval: 15_000,
    queryFn: async (): Promise<ChainMilestoneState[]> => {
      if (!publicClient) return [];

      return Promise.all(
        milestones.map(async (_milestone, index) => {
          const [milestone, qvState] = await Promise.all([
            publicClient.readContract({
              address: contractAddress as `0x${string}`,
              abi: CAMPAIGN_ABI,
              functionName: "milestones",
              args: [BigInt(index)]
            }) as Promise<
              readonly [bigint, bigint, bigint, bigint, bigint, boolean, boolean, string, string]
            >,
            publicClient.readContract({
              address: contractAddress as `0x${string}`,
              abi: CAMPAIGN_ABI,
              functionName: "getMilestoneQVState",
              args: [BigInt(index)]
            }) as Promise<readonly [bigint, bigint, bigint, boolean]>
          ]);

          return {
            targetAmount: formatEther(milestone[0]),
            approvalVotes: formatEther(qvState[0]),
            rejectionVotes: formatEther(qvState[1]),
            isCurrent: milestone[5],
            isPaid: milestone[6],
            ipfsProofHash: milestone[8],
            approved: qvState[3]
          };
        })
      );
    }
  });

  const selectedMilestone = milestones[milestoneIndex];
  const selectedChainState = chainMilestones[milestoneIndex];
  const releaseTxHash = lastReleaseTxHash || selectedMilestone?.payoutTxHash || null;
  const canRelease =
    isSignedIn &&
    selectedChainState?.isCurrent &&
    selectedChainState?.approved &&
    !selectedChainState?.isPaid;

  async function handleUploadProof() {
    if (!file) return;
    if (!isSignedIn) {
      toast.error("Sign in with your wallet before uploading proofs");
      return;
    }

    setIsUploading(true);
    try {
      const token = await getToken();
      if (!token) throw new Error("Authentication token unavailable");

      const uploadResult = await api.uploadProof(file, { contractAddress, milestoneIndex });
      await submitMilestoneProof(milestoneIndex, uploadResult.cid);

      await queryClient.invalidateQueries({ queryKey: ["campaign", contractAddress] });
      await queryClient.invalidateQueries({ queryKey: chainStateKey });

      toast.success(`Proof pinned: ${uploadResult.cid.slice(0, 12)}...`);
      setFile(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Proof upload failed";
      toast.error(message);
    } finally {
      setIsUploading(false);
    }
  }

  async function handleReleaseFunds() {
    if (!isSignedIn) {
      toast.error("Sign in with the creator wallet before releasing funds");
      return;
    }
    if (!selectedChainState?.approved) {
      toast.error("Community approval is required before releasing this tranche");
      return;
    }

    setIsReleasing(true);
    setLastReleaseTxHash(null);

    try {
      const hash = await executeTranche(milestoneIndex);
      setLastReleaseTxHash(hash);

      await queryClient.invalidateQueries({ queryKey: ["campaign", contractAddress] });
      await queryClient.invalidateQueries({ queryKey: chainStateKey });
      await queryClient.invalidateQueries({ queryKey: ["notifications"] });

      toast.success("Funds released to the campaign recipient wallet");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Fund release failed";
      toast.error(message);
    } finally {
      setIsReleasing(false);
    }
  }

  return (
    <GlassCard className="p-6">
      <p className="text-xs uppercase tracking-[0.3em] text-cyan-300/80">Creator Dashboard</p>
      <h3 className="mt-2 font-display text-2xl font-semibold text-white/90">
        Submit proofs and manage milestone release flow
      </h3>

      {!isSignedIn && (
        <Alert variant="warning" className="mt-4">
          Connect your wallet and sign in to upload milestone proofs or release approved payouts.
        </Alert>
      )}

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <label className="space-y-2 rounded-2xl border border-slate-200 bg-white/5 p-4 dark:border-white/10">
          <span className="block text-sm font-medium text-slate-200">Campaign contract</span>
          <input
            value={contractAddress}
            readOnly
            className="w-full rounded-xl border border-slate-200 bg-slate-900/80 px-4 py-3 text-sm text-slate-400 outline-none dark:border-white/10"
          />
        </label>

        <label className="space-y-2 rounded-2xl border border-slate-200 bg-white/5 p-4 dark:border-white/10">
          <span className="block text-sm font-medium text-slate-200">Milestone</span>
          <select
            value={milestoneIndex}
            onChange={(event) => {
              setMilestoneIndex(Number(event.target.value));
              setLastReleaseTxHash(null);
            }}
            className="w-full rounded-xl border border-slate-200 bg-slate-900/80 px-4 py-3 text-sm text-white outline-none focus:border-magenta-400/50 dark:border-white/10"
          >
            {milestones.map((milestone, index) => (
              <option key={`${milestone.title}-${index}`} value={index}>
                {index + 1}. {milestone.title}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-4 rounded-2xl border border-slate-200 bg-white/5 p-4 dark:border-white/10">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-white">Completion Proof</p>
            <p className="text-xs text-slate-400">
              Upload evidence first so donors can vote on this milestone.
            </p>
          </div>
          {selectedChainState?.ipfsProofHash && (
            <a
              href={`https://ipfs.io/ipfs/${selectedChainState.ipfsProofHash}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-300 hover:text-cyan-200"
            >
              View proof <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </div>

        <input
          type="file"
          accept=".pdf,.png,.jpg,.jpeg,.webp,.txt"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          className="block w-full text-sm text-slate-300 file:mr-4 file:rounded-full file:border-0 file:bg-cyan-400 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-slate-950 hover:file:bg-cyan-300"
        />
        <div className="mt-4 flex flex-wrap gap-3">
          <Button
            variant="primary"
            onClick={handleUploadProof}
            disabled={!file || isUploading || isChainPending}
            isLoading={isUploading || isChainPending}
          >
            Upload Proof to IPFS + Chain
          </Button>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-emerald-500/25 bg-emerald-500/5 p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-white">Approved Tranche Payout</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-400">
              Once approval votes exceed rejection votes, execute the on-chain release to transfer escrowed funds.
            </p>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-white/[0.08] bg-slate-950/40 p-3">
                <p className="text-[11px] uppercase tracking-wider text-slate-500">Selected</p>
                <p className="mt-1 truncate text-sm font-semibold text-slate-100">
                  {milestoneIndex + 1}. {selectedMilestone?.title || "Milestone"}
                </p>
              </div>
              <div className="rounded-xl border border-white/[0.08] bg-slate-950/40 p-3">
                <p className="text-[11px] uppercase tracking-wider text-slate-500">Payout</p>
                <p className="mt-1 text-sm font-semibold text-emerald-300">
                  {selectedChainState?.targetAmount || selectedMilestone?.targetAmount || "0"} POL
                </p>
              </div>
              <div className="rounded-xl border border-white/[0.08] bg-slate-950/40 p-3">
                <p className="text-[11px] uppercase tracking-wider text-slate-500">Vote Result</p>
                <p
                  className={
                    selectedChainState?.approved
                      ? "mt-1 text-sm font-semibold text-emerald-300"
                      : "mt-1 text-sm font-semibold text-amber-300"
                  }
                >
                  {isLoadingChainState
                    ? "Checking..."
                    : selectedChainState?.approved
                      ? "Approved"
                      : "Awaiting approval"}
                </p>
              </div>
              <div className="rounded-xl border border-white/[0.08] bg-slate-950/40 p-3">
                <p className="text-[11px] uppercase tracking-wider text-slate-500">Payout Status</p>
                <p
                  className={
                    selectedChainState?.isPaid
                      ? "mt-1 flex items-center gap-1.5 text-sm font-semibold text-emerald-300"
                      : "mt-1 text-sm font-semibold text-slate-300"
                  }
                >
                  {selectedChainState?.isPaid && <CheckCircle2 className="h-4 w-4" />}
                  {selectedChainState?.isPaid
                    ? "Released"
                    : selectedChainState?.isCurrent
                      ? "Ready when approved"
                      : "Not active"}
                </p>
              </div>
            </div>

            {releaseTxHash && (
              <div className="mt-3 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-100">
                Release transaction:{" "}
                <span className="font-mono text-emerald-200">
                  {releaseTxHash.slice(0, 12)}...{releaseTxHash.slice(-8)}
                </span>
              </div>
            )}
          </div>

          <Button
            variant="success"
            onClick={handleReleaseFunds}
            disabled={!canRelease || isChainPending || isReleasing}
            isLoading={isReleasing}
            leadingIcon={
              isReleasing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />
            }
            className="w-full lg:w-auto"
          >
            Release Funds
          </Button>
        </div>
      </div>
    </GlassCard>
  );
}
