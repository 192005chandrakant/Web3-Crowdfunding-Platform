import { useState } from "react";
import toast from "react-hot-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Button, GlassCard, Alert } from "@/components/ui";
import { api } from "@/lib/api";
import { useCampaignContractActions } from "@/hooks/useCampaignContract";
import { useAuth } from "@clerk/clerk-react";

interface CreatorDashboardProps {
  contractAddress: string;
  milestones: Array<{ title: string; targetAmount: number; deadline: string }>;
}

export function CreatorDashboard({ contractAddress, milestones }: CreatorDashboardProps) {
  const { getToken, isSignedIn } = useAuth();
  const queryClient = useQueryClient();
  const { submitMilestoneProof, isPending: isChainPending } = useCampaignContractActions(
    contractAddress as `0x${string}`
  );

  const [file, setFile] = useState<File | null>(null);
  const [milestoneIndex, setMilestoneIndex] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  async function handleUploadProof() {
    if (!file) {
      return;
    }
    if (!isSignedIn) {
      toast.error("Sign in with your wallet before uploading proofs");
      return;
    }

    setIsUploading(true);
    try {
      const token = await getToken();
      if (!token) throw new Error("Authentication token unavailable");

      const uploadResult = await api.uploadProof(
        file,
        { contractAddress, milestoneIndex }
      );

      await submitMilestoneProof(milestoneIndex, uploadResult.cid);
      await queryClient.invalidateQueries({ queryKey: ["campaign", contractAddress] });

      toast.success(`Proof pinned: ${uploadResult.cid.slice(0, 12)}…`);
      setFile(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Proof upload failed";
      toast.error(message);
    } finally {
      setIsUploading(false);
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
          Connect your wallet and sign in to upload milestone proofs.
        </Alert>
      )}

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <label className="space-y-2 rounded-2xl border border-white/10 bg-white/5 p-4">
          <span className="block text-sm font-medium text-slate-200">Campaign contract</span>
          <input
            value={contractAddress}
            readOnly
            className="w-full rounded-xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-slate-400 outline-none"
          />
        </label>

        <label className="space-y-2 rounded-2xl border border-white/10 bg-white/5 p-4">
          <span className="block text-sm font-medium text-slate-200">Milestone</span>
          <select
            value={milestoneIndex}
            onChange={(event) => setMilestoneIndex(Number(event.target.value))}
            className="w-full rounded-xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-white outline-none focus:border-magenta-400/50"
          >
            {milestones.map((milestone, index) => (
              <option key={`${milestone.title}-${index}`} value={index}>
                {index + 1}. {milestone.title}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
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
    </GlassCard>
  );
}
