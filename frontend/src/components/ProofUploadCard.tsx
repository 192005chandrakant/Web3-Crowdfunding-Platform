import { useState } from "react";
import { Upload, CheckCircle2, FileCheck, Loader2, ExternalLink, ShieldAlert } from "lucide-react";
import { GlassCard, Button, Badge } from "@/components/ui";
import { api } from "@/lib/api";
import { toast } from "react-hot-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useCampaignContractActions } from "@/hooks/useCampaignContract";
import { usePublicClient } from "wagmi";
import { TARGET_CHAIN_ID } from "@/lib/chain";

interface ProofUploadCardProps {
  contractAddress: string;
  milestoneIndex: number;
  milestoneTitle: string;
  targetAmount: string;
  existingProofCid?: string;
  isPaid?: boolean;
  onUploadSuccess?: (cid: string) => void;
}

export function ProofUploadCard({
  contractAddress,
  milestoneIndex,
  milestoneTitle,
  targetAmount,
  existingProofCid,
  isPaid = false,
  onUploadSuccess
}: ProofUploadCardProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [cid, setCid] = useState<string | undefined>(existingProofCid);
  const queryClient = useQueryClient();
  const publicClient = usePublicClient({ chainId: TARGET_CHAIN_ID });
  const { submitMilestoneProof, isPending: isChainPending } = useCampaignContractActions(
    contractAddress as `0x${string}`
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error("Please select a document or image file first.");
      return;
    }

    setIsUploading(true);
    try {
      const result = await api.uploadProof(file, {
        contractAddress,
        milestoneIndex
      });

      // After successful upload to backend/IPFS, submit to blockchain
      toast.loading("Waiting for blockchain confirmation…", { id: "proof-submit" });
      
      const hash = await submitMilestoneProof(milestoneIndex, result.cid);
      
      if (publicClient) {
        await publicClient.waitForTransactionReceipt({ hash });
      }
      
      toast.dismiss("proof-submit");
      toast.success("Milestone proof successfully submitted on-chain!");
      
      setCid(result.cid);
      setFile(null);
      
      // Refresh cache
      queryClient.invalidateQueries({ queryKey: ["campaign", contractAddress] });
      queryClient.invalidateQueries({ queryKey: ["qv-stats", contractAddress, milestoneIndex] });
      queryClient.invalidateQueries({ queryKey: ["qv-votes", contractAddress, milestoneIndex] });
      queryClient.invalidateQueries({ queryKey: ["qv-donors", contractAddress] });
      
      if (onUploadSuccess) {
        onUploadSuccess(result.cid);
      }
    } catch (err: any) {
      toast.dismiss("proof-submit");
      const msg = err?.shortMessage || err?.message || "Failed to upload milestone proof.";
      toast.error(msg);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <GlassCard className="p-6 relative overflow-hidden border border-white/[0.08] bg-slate-100/60 dark:bg-slate-900/60">
      {/* Status indicator bar at top */}
      <div className={`absolute top-0 left-0 right-0 h-1 ${isPaid ? "bg-emerald-500" : cid ? "bg-blue-500" : "bg-amber-500"}`} />

      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <Badge variant="primary" className="font-mono text-xs">
              Milestone #{milestoneIndex + 1}
            </Badge>
            {isPaid ? (
              <Badge variant="success" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                Released & Paid
              </Badge>
            ) : cid ? (
              <Badge variant="secondary" className="bg-blue-500/10 text-blue-400 border-blue-500/20">
                Proof Submitted (Voting Active)
              </Badge>
            ) : (
              <Badge variant="blockchain" className="bg-amber-500/10 text-amber-400 border-amber-500/20">
                Proof Required
              </Badge>
            )}
          </div>
          <h4 className="text-lg font-bold text-slate-100">{milestoneTitle}</h4>
          <p className="text-xs text-slate-400 mt-0.5">Target amount: <span className="text-primary-300 font-semibold">{targetAmount} MATIC</span></p>
        </div>

        {cid && (
          <a
            href={`https://ipfs.io/ipfs/${cid}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors border border-white/[0.06]"
          >
            <FileCheck className="w-4 h-4 text-emerald-400" />
            <span className="font-mono truncate max-w-[140px]">{cid.slice(0, 8)}…{cid.slice(-6)}</span>
            <ExternalLink className="w-3 h-3 text-slate-500" />
          </a>
        )}
      </div>

      {!isPaid && (
        <div className="mt-4 pt-4 border-t border-white/[0.06]">
          <p className="text-xs text-slate-400 mb-4 leading-relaxed">
            Upload verifiable evidence (reports, images, invoices, or demo links) showing milestone completion. Donors review this before voting to approve fund release.
          </p>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <label className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border border-dashed border-slate-300 dark:border-white/20 rounded-xl bg-slate-800/40 hover:bg-slate-800 hover:border-primary-500/40 transition-all cursor-pointer text-xs text-slate-300 font-medium">
              <Upload className="w-4 h-4 text-primary-400" />
              <span className="truncate">{file ? file.name : "Choose evidence document (PDF/Image)..."}</span>
              <input type="file" onChange={handleFileChange} className="hidden" accept=".pdf,.png,.jpg,.jpeg,.zip,.doc,.docx" />
            </label>

            <Button
              variant="primary"
              onClick={handleUpload}
              disabled={!file || isUploading || isChainPending}
              className="px-6 py-3"
            >
              {isUploading || isChainPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  {isChainPending ? "Confirming..." : "Pinning IPFS..."}
                </>
              ) : (
                <>
                  {cid ? "Update Proof" : "Submit Proof"}
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {isPaid && (
        <div className="mt-4 pt-4 border-t border-white/[0.06] flex items-center gap-2 text-xs text-emerald-400">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>Milestone successfully approved by community vote and funds released to creator wallet.</span>
        </div>
      )}
    </GlassCard>
  );
}
