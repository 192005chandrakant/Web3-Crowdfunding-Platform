import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAccount, usePublicClient, useWaitForTransactionReceipt } from "wagmi";
import { decodeEventLog } from "viem";
import { Button, GlassCard, Alert } from "@/components/ui";
import { WalletConnector } from "@/components/WalletConnector";
import { api } from "@/lib/api";
import { CAMPAIGN_FACTORY_ABI, FACTORY_ADDRESS } from "@/lib/contracts";
import { TARGET_CHAIN_ID } from "@/lib/chain";
import { useFactoryDeploy } from "@/hooks/useCampaignContract";
import { useAuth } from "@clerk/clerk-react";

interface MilestoneDraft {
  title: string;
  targetAmount: string;
  deadline: string;
}

const CATEGORY_OPTIONS = ["general", "startup", "charity", "medical", "event"] as const;

export function CreateCampaignPage() {
  const navigate = useNavigate();
  const { address } = useAccount();
  const { getToken, isSignedIn } = useAuth();
  const publicClient = usePublicClient({ chainId: TARGET_CHAIN_ID });
  const { deployCampaign, isDeploying, factoryConfigured } = useFactoryDeploy();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [goal, setGoal] = useState("");
  const [category, setCategory] = useState<(typeof CATEGORY_OPTIONS)[number]>("general");
  const [hospitalAddress, setHospitalAddress] = useState("");
  const [milestones, setMilestones] = useState<MilestoneDraft[]>([
    { title: "Milestone 1", targetAmount: "1", deadline: "" }
  ]);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();
  const [isSaving, setIsSaving] = useState(false);

  const { isLoading: isConfirming } = useWaitForTransactionReceipt({ hash: txHash });

  const totalMilestoneAmount = useMemo(
    () => milestones.reduce((sum, item) => sum + (Number.parseFloat(item.targetAmount) || 0), 0),
    [milestones]
  );

  function updateMilestone(index: number, field: keyof MilestoneDraft, value: string) {
    setMilestones((current) =>
      current.map((item, idx) => (idx === index ? { ...item, [field]: value } : item))
    );
  }

  function addMilestone() {
    setMilestones((current) => [
      ...current,
      { title: `Milestone ${current.length + 1}`, targetAmount: "1", deadline: "" }
    ]);
  }

  async function resolveCampaignAddress(receiptHash: `0x${string}`) {
    if (!publicClient) {
      throw new Error("RPC client unavailable");
    }

    const receipt = await publicClient.waitForTransactionReceipt({ hash: receiptHash });

    for (const log of receipt.logs) {
      try {
        const decoded = decodeEventLog({
          abi: CAMPAIGN_FACTORY_ABI,
          eventName: "CampaignCreated",
          data: log.data,
          topics: log.topics
        });

        if (decoded.args.campaignAddress) {
          return decoded.args.campaignAddress as string;
        }
      } catch {
        // not the event we need
      }
    }

    throw new Error("CampaignCreated event not found in transaction receipt");
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (!isSignedIn || !address) {
      toast.error("Sign in with your wallet first");
      return;
    }

    if (!factoryConfigured) {
      toast.error("Set VITE_FACTORY_CONTRACT_ADDRESS in frontend .env");
      return;
    }

    if (milestones.some((item) => !item.title || !item.targetAmount || !item.deadline)) {
      toast.error("Complete all milestone fields");
      return;
    }

    setIsSaving(true);
    try {
      const token = await getToken();
      if (!token) throw new Error("Authentication token unavailable");

      const deadlines = milestones.map((item) => Math.floor(new Date(item.deadline).getTime() / 1000));
      if (deadlines.some((value) => !Number.isFinite(value) || value <= 0)) {
        throw new Error("Use valid milestone deadlines");
      }

      const hash = await deployCampaign({
        goal,
        hospitalAddress: category === "medical" && hospitalAddress ? (hospitalAddress as `0x${string}`) : undefined,
        titles: milestones.map((item) => item.title),
        targetAmounts: milestones.map((item) => item.targetAmount),
        deadlines
      });

      setTxHash(hash);
      toast.success("Factory transaction submitted");

      const contractAddress = await resolveCampaignAddress(hash);

      let coverImageUrl: string | undefined;
      if (coverFile) {
        const coverResult = await api.uploadCoverImage(coverFile);
        coverImageUrl = coverResult.coverImageUrl;
      }

      await api.createCampaign(
        {
          contractAddress,
          creatorAddress: address,
          title,
          descriptionMarkdown: description,
          targetGoal: Number.parseFloat(goal),
          milestones: milestones.map((item, index) => ({
            title: item.title,
            targetAmount: Number.parseFloat(item.targetAmount),
            deadline: deadlines[index].toString()
          })),
          category,
          hospitalAddress: hospitalAddress || null,
          chainId: TARGET_CHAIN_ID,
          coverImageUrl: coverImageUrl ?? null
        },
        token
      );

      toast.success("Campaign registered with backend cache");
      navigate(`/campaign/${contractAddress}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Campaign creation failed");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="page-container max-w-4xl space-y-6">
      <div>
        <p className="section-label mb-1">Launch</p>
        <h1 className="font-display text-3xl font-bold text-slate-100">Create a Campaign</h1>
        <p className="mt-1 text-sm text-slate-500">
          Deploy on Polygon Amoy, then cache metadata in the backend API.
        </p>
      </div>

      <WalletConnector />

      {!factoryConfigured && (
        <Alert variant="warning" title="Factory not configured">
          Deploy CampaignFactory to Amoy and set <code>VITE_FACTORY_CONTRACT_ADDRESS</code> in your frontend env.
          Factory target: {FACTORY_ADDRESS || "not set"}
        </Alert>
      )}

      <GlassCard className="p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <label className="block space-y-2">
            <span className="input-label">Campaign title</span>
            <input className="input-field" value={title} onChange={(e) => setTitle(e.target.value)} required minLength={3} />
          </label>

          <label className="block space-y-2">
            <span className="input-label">Description (markdown)</span>
            <textarea
              className="input-field min-h-32"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              minLength={20}
            />
          </label>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block space-y-2">
              <span className="input-label">Funding goal (MATIC)</span>
              <input className="input-field" value={goal} onChange={(e) => setGoal(e.target.value)} required />
            </label>
            <label className="block space-y-2">
              <span className="input-label">Category</span>
              <select className="input-field" value={category} onChange={(e) => setCategory(e.target.value as typeof category)}>
                {CATEGORY_OPTIONS.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </label>
          </div>

          {category === "medical" && (
            <label className="block space-y-2">
              <span className="input-label">Hospital treasury address (payout lock)</span>
              <input
                className="input-field"
                value={hospitalAddress}
                onChange={(e) => setHospitalAddress(e.target.value)}
                placeholder="0x..."
              />
            </label>
          )}

          <label className="block space-y-2">
            <span className="input-label">Cover image (optional)</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => setCoverFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-slate-300 file:mr-4 file:rounded-full file:border-0 file:bg-primary-500 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white"
            />
            <p className="text-xs text-slate-500">Uploaded via Cloudinary when campaign is registered.</p>
          </label>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="input-label">Milestones</p>
              <Button type="button" variant="outline" size="sm" onClick={addMilestone}>Add milestone</Button>
            </div>
            {milestones.map((milestone, index) => (
              <div key={index} className="grid gap-3 rounded-xl border border-white/[0.08] p-4 md:grid-cols-3">
                <input
                  className="input-field"
                  value={milestone.title}
                  onChange={(e) => updateMilestone(index, "title", e.target.value)}
                  placeholder="Title"
                  required
                />
                <input
                  className="input-field"
                  value={milestone.targetAmount}
                  onChange={(e) => updateMilestone(index, "targetAmount", e.target.value)}
                  placeholder="Amount (MATIC)"
                  required
                />
                <input
                  className="input-field"
                  type="datetime-local"
                  value={milestone.deadline}
                  onChange={(e) => updateMilestone(index, "deadline", e.target.value)}
                  required
                />
              </div>
            ))}
            <p className="text-xs text-slate-500">
              Milestone tranche total: {totalMilestoneAmount.toLocaleString()} MATIC
            </p>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            isLoading={isSaving || isDeploying || isConfirming}
            disabled={!isSignedIn || !factoryConfigured}
          >
            Deploy Campaign + Register Metadata
          </Button>
        </form>
      </GlassCard>
    </div>
  );
}
