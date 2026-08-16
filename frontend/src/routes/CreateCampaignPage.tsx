import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAccount, usePublicClient } from "wagmi";
import { decodeEventLog } from "viem";
import { Button, GlassCard, Alert } from "@/components/ui";
import { WalletConnector } from "@/components/WalletConnector";
import { api } from "@/lib/api";
import { CAMPAIGN_FACTORY_ABI, FACTORY_ADDRESS } from "@/lib/contracts";
import { TARGET_CHAIN_ID, getChainLabel } from "@/lib/chain";
import { useFactoryDeploy } from "@/hooks/useCampaignContract";
import { useAuth } from "@clerk/clerk-react";
import { CampaignPreviewCard } from "@/components/CampaignPreviewCard";
import { ArrowLeft, ArrowRight, Sparkles, Check, AlertCircle, Plus, Trash2, Rocket, ShieldCheck, HelpCircle, Layers } from "lucide-react";

interface MilestoneDraft {
  title: string;
  targetAmount: string;
  deadline: string;
}

const CATEGORY_OPTIONS = [
  { value: "general", label: "General & Social Impact", desc: "Community initiatives, open-source projects, and social causes." },
  { value: "startup", label: "Web3 Startup & Tech", desc: "Decentralized applications, hardware, and tech innovation." },
  { value: "charity", label: "Charity & Disaster Relief", desc: "Humanitarian aid, emergency support, and animal welfare." },
  { value: "medical", label: "Medical & Emergency", desc: "Direct healthcare support with verified hospital treasury escrow." },
  { value: "event", label: "Community Event & Hackathon", desc: "Conferences, local developer meetups, and competitions." }
] as const;

export function CreateCampaignPage() {
  const navigate = useNavigate();
  const { address } = useAccount();
  const { getToken, isSignedIn } = useAuth();
  const publicClient = usePublicClient({ chainId: TARGET_CHAIN_ID });
  const { deployCampaign, isDeploying, factoryConfigured } = useFactoryDeploy();

  // Wizard step state (1 = Basics, 2 = Story & Milestones, 3 = Review & Launch)
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [isPreviewTab, setIsPreviewTab] = useState(false);

  // Form inputs
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [goal, setGoal] = useState("");
  const [category, setCategory] = useState<string>("general");
  const [hospitalAddress, setHospitalAddress] = useState("");
  const [milestones, setMilestones] = useState<MilestoneDraft[]>([
    { title: "Initial Prototyping & Setup", targetAmount: "1", deadline: "" }
  ]);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null);

  // Deployment state
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();
  const [isSaving, setIsSaving] = useState(false);
  const [deployStep, setDeployStep] = useState<"idle" | "deploying" | "uploading" | "registering" | "done">("idle");

  // Computations
  const totalMilestoneAmount = useMemo(
    () => milestones.reduce((sum, item) => sum + (Number.parseFloat(item.targetAmount) || 0), 0),
    [milestones]
  );

  const goalNumber = Number.parseFloat(goal) || 0;
  const isGoalMatched = Math.abs(totalMilestoneAmount - goalNumber) < 0.001 && goalNumber > 0;

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

  function removeMilestone(index: number) {
    if (milestones.length <= 1) {
      toast.error("Campaigns must have at least one milestone for escrow protection.");
      return;
    }
    setMilestones((current) => current.filter((_, idx) => idx !== index));
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

  function handleNextStep() {
    if (currentStep === 1) {
      if (!title.trim() || title.trim().length < 3) {
        toast.error("Please enter a campaign title with at least 3 characters.");
        return;
      }
      if (category === "medical" && !hospitalAddress.startsWith("0x")) {
        toast.error("Medical campaigns require a valid verified hospital 0x address.");
        return;
      }
      setCurrentStep(2);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else if (currentStep === 2) {
      if (!description.trim() || description.trim().length < 20) {
        toast.error("Please provide a project description with at least 20 characters.");
        return;
      }
      if (goalNumber <= 0) {
        toast.error("Please enter a positive Target Funding Goal in MATIC/POL.");
        return;
      }
      if (!isGoalMatched) {
        toast.error(`Total milestone amounts (${totalMilestoneAmount} POL) must exactly match your target goal (${goalNumber} POL).`);
        return;
      }
      if (milestones.some((m) => !m.title || !m.targetAmount || !m.deadline)) {
        toast.error("Please complete all titles, target amounts, and deadline timestamps for every milestone.");
        return;
      }
      setCurrentStep(3);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  async function handleSubmit() {
    if (!isSignedIn || !address) {
      toast.error("Sign in with your Web3 wallet first before launching on-chain.");
      return;
    }
    if (!factoryConfigured) {
      toast.error("Set VITE_FACTORY_CONTRACT_ADDRESS in frontend .env");
      return;
    }

    setIsSaving(true);
    try {
      const token = await getToken();
      if (!token && !import.meta.env.DEV) throw new Error("Authentication token unavailable");

      const deadlines = milestones.map((item) => Math.floor(new Date(item.deadline).getTime() / 1000));
      if (deadlines.some((value) => !Number.isFinite(value) || value <= 0)) {
        throw new Error("Please select valid milestone deadlines in the future.");
      }

      setDeployStep("deploying");
      const hash = await deployCampaign({
        goal: String(goalNumber),
        hospitalAddress: category === "medical" && hospitalAddress ? (hospitalAddress as `0x${string}`) : undefined,
        titles: milestones.map((item) => item.title),
        targetAmounts: milestones.map((item) => item.targetAmount),
        deadlines
      });

      setTxHash(hash);
      toast.success(`Factory creation transaction submitted to ${getChainLabel(TARGET_CHAIN_ID)}!`);

      // Wait for campaign address in the factory tx receipt
      let contractAddress;
      try {
        contractAddress = await resolveCampaignAddress(hash);
      } catch (err) {
        console.error('Failed resolving campaign address from receipt:', err);
        toast.error('Deployment transaction submitted but CampaignCreated event not found. Check transaction on explorer or restart frontend to re-read factory events.');
        throw err;
      }

      setDeployStep("uploading");
      let coverImageUrl: string | undefined;
      if (coverFile) {
        const coverResult = await api.uploadCoverImage(coverFile, { contractAddress });
        coverImageUrl = coverResult.coverImageUrl;
      }

      setDeployStep("registering");
      await api.createCampaign({
        contractAddress,
        creatorAddress: address,
        title,
        descriptionMarkdown: description,
        targetGoal: goalNumber,
        milestones: milestones.map((item, index) => ({
          title: item.title,
          targetAmount: Number.parseFloat(item.targetAmount),
          deadline: deadlines[index].toString()
        })),
        category,
        hospitalAddress: hospitalAddress || null,
        chainId: TARGET_CHAIN_ID,
        coverImageUrl: coverImageUrl ?? ""
      });

      setDeployStep("done");
      toast.success("Campaign successfully deployed and registered!", { duration: 6000 });
      navigate(`/campaign/${contractAddress}`);
    } catch (error) {
      setDeployStep("idle");
      console.error('Campaign creation failed:', error);
      toast.error(error instanceof Error ? error.message : "Campaign creation failed");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="page-container max-w-5xl space-y-8 pb-20">
      {/* Hero Header */}
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-500/10 border border-primary-500/40 dark:border-primary-500/30 text-primary-300 text-xs font-semibold mb-3">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Escrow Protected Launchpad</span>
        </div>
        <h1 className="font-display text-4xl font-extrabold text-slate-100 tracking-tight">Create a Web3 Campaign</h1>
        <p className="mt-2 text-base text-slate-400 max-w-3xl">
          Launch a trustless crowdfunding campaign with immutable milestone gates. Donors retain quadratic governance power to approve payouts as you build.
        </p>
      </div>

      <WalletConnector />

      {!factoryConfigured && (
        <Alert variant="warning" title="Factory contract address not configured">
          Please set <code>VITE_FACTORY_CONTRACT_ADDRESS</code> in your frontend environment to enable live deployments on {getChainLabel(TARGET_CHAIN_ID)}. Current target: <code>{FACTORY_ADDRESS || "Not Set"}</code>
        </Alert>
      )}

      {/* Step Indicator Progress Bar */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { step: 1, label: "1. Basics & Category", desc: "Profile & Cover Artwork" },
          { step: 2, label: "2. Story & Milestones", desc: "Tranches & Budgeting" },
          { step: 3, label: "3. Review & Launch", desc: "Verify On-Chain Terms" }
        ].map((item) => {
          const isCurrent = currentStep === item.step;
          const isPassed = currentStep > item.step;
          return (
            <button
              key={item.step}
              type="button"
              onClick={() => isPassed && setCurrentStep(item.step as any)}
              disabled={!isPassed && !isCurrent}
              className={`text-left p-4 rounded-2xl border transition-all duration-300 ${
                isCurrent
                  ? "bg-gradient-to-br from-primary-50/50 dark:from-primary-950/60 via-slate-50 dark:via-slate-900/90 to-slate-50 dark:to-slate-900 border-primary-500/50 shadow-glow-sm"
                  : isPassed
                  ? "bg-slate-900/40 border-emerald-500/30 text-slate-300 hover:border-emerald-500/60 cursor-pointer"
                  : "bg-slate-50/50 dark:bg-slate-950/30 border-white/[0.05] opacity-50 cursor-not-allowed"
              }`}
            >
              <div className="flex items-center justify-between text-xs font-mono font-bold uppercase tracking-wider mb-1">
                <span className={isCurrent ? "text-primary-400" : isPassed ? "text-emerald-400" : "text-slate-500"}>
                  {isPassed ? "✓ Completed" : item.label}
                </span>
              </div>
              <div className="text-sm font-bold text-slate-200">{item.desc}</div>
            </button>
          );
        })}
      </div>

      {/* ── STEP 1: BASICS & COVER ── */}
      {currentStep === 1 && (
        <GlassCard className="p-6 md:p-10 space-y-8 animate-in fade-in-50 duration-300">
          <div className="border-b border-white/[0.08] pb-4">
            <h3 className="text-2xl font-bold text-slate-100">Project Profile & Artwork</h3>
            <p className="text-sm text-slate-400 mt-1">
              Choose an inspiring title, select your funding category, and upload attractive visual presentation artwork.
            </p>
          </div>

          <div className="space-y-6">
            <label className="block space-y-2">
              <span className="text-sm font-semibold text-slate-200 block">
                Campaign Title <span className="text-red-400">*</span>
              </span>
              <input
                type="text"
                className="w-full px-4 py-3 bg-slate-900/80 border border-white/[0.1] rounded-xl text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition-all text-base font-medium"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Solar-Powered Clean Water Nodes for Remote Communities"
                required
                minLength={3}
              />
            </label>

            <div className="space-y-3">
              <span className="text-sm font-semibold text-slate-200 block">
                Category Selection <span className="text-red-400">*</span>
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {CATEGORY_OPTIONS.map((cat) => {
                  const isSelected = category === cat.value;
                  return (
                    <button
                      key={cat.value}
                      type="button"
                      onClick={() => setCategory(cat.value)}
                      className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between ${
                        isSelected
                          ? "bg-primary-50/50 dark:bg-primary-950/60 border-primary-500 text-white shadow-glow-sm"
                          : "bg-slate-900/50 border-white/[0.08] text-slate-300 hover:border-slate-300 dark:border-white/20 hover:bg-slate-900"
                      }`}
                    >
                      <div className="font-bold text-sm text-slate-100 mb-1">{cat.label}</div>
                      <div className="text-xs text-slate-400 leading-relaxed">{cat.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {category === "medical" && (
              <div className="p-5 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-500/30 space-y-2">
                <label className="block space-y-1.5">
                  <span className="text-sm font-bold text-amber-300 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-amber-400" />
                    <span>Hospital / Clinic Treasury Address (0x Payout Lock) *</span>
                  </span>
                  <input
                    className="w-full px-4 py-2.5 bg-slate-900/80 border border-amber-500/30 rounded-xl text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                    value={hospitalAddress}
                    onChange={(e) => setHospitalAddress(e.target.value)}
                    placeholder="0x71C...3e9b (Must be verified recipient)"
                    required
                  />
                </label>
                <p className="text-xs text-slate-400 leading-relaxed">
                  For anti-fraud patient protection, medical campaign milestone funds are disbursed directly to the verified medical facility or hospital wallet upon community milestone approval.
                </p>
              </div>
            )}

            {/* Cover Image Upload & Instant Preview */}
            <div className="space-y-3 pt-4 border-t border-white/[0.06]">
              <span className="text-sm font-semibold text-slate-200 block">
                Cover Artwork / Banner Image
              </span>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                <div className="space-y-3">
                  <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-300 dark:border-white/20 rounded-2xl bg-slate-900/40 hover:bg-slate-900/70 hover:border-primary-500/50 transition-all cursor-pointer group text-center">
                    <Layers className="w-8 h-8 text-primary-400 group-hover:scale-110 transition-transform mb-2" />
                    <span className="text-sm font-semibold text-slate-200">Click to upload banner image</span>
                    <span className="text-xs text-slate-500 mt-1">Recommended 16:9 ratio (1200x675px). WEBP, PNG, or JPG up to 5MB.</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={(e) => {
                        const file = e.target.files?.[0] ?? null;
                        setCoverFile(file);
                        if (file) {
                          setCoverPreviewUrl(URL.createObjectURL(file));
                        } else {
                          setCoverPreviewUrl(null);
                        }
                      }}
                      className="hidden"
                    />
                  </label>
                </div>

                {coverPreviewUrl ? (
                  <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-white/15 h-52 bg-slate-950 shadow-lg">
                    <img src={coverPreviewUrl} alt="Cover preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => { setCoverFile(null); setCoverPreviewUrl(null); }}
                      className="absolute top-3 right-3 p-1.5 rounded-full bg-slate-900/80 text-slate-300 hover:text-white border border-slate-300 dark:border-white/20 transition-colors"
                      title="Remove image"
                    >
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </button>
                  </div>
                ) : (
                  <div className="h-52 rounded-2xl border border-dashed border-slate-200 dark:border-white/10 flex flex-col items-center justify-center text-slate-400 p-4 text-center bg-slate-50/50 dark:bg-slate-950/20">
                    <p className="text-xs">No banner uploaded yet.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-white/[0.08]">
            <Button
              variant="primary"
              size="lg"
              onClick={handleNextStep}
              trailingIcon={<ArrowRight className="w-5 h-5" />}
              className="px-8 font-bold shadow-glow-primary rounded-xl"
            >
              Continue to Story & Milestones
            </Button>
          </div>
        </GlassCard>
      )}

      {/* ── STEP 2: STORY & MILESTONES ── */}
      {currentStep === 2 && (
        <GlassCard className="p-6 md:p-10 space-y-8 animate-in fade-in-50 duration-300">
          <div className="border-b border-white/[0.08] pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-2xl font-bold text-slate-100">Project Story & Escrow Milestones</h3>
              <p className="text-sm text-slate-400 mt-1">
                Define your financial budget in MATIC/POL and split it into verifiable milestone tranches.
              </p>
            </div>

            <Button variant="outline" size="sm" onClick={() => setCurrentStep(1)} leadingIcon={<ArrowLeft className="w-4 h-4" />}>
              Back to Basics
            </Button>
          </div>

          {/* Target Goal Input */}
          <div className="p-6 rounded-2xl bg-gradient-to-br from-primary-50/50 dark:from-primary-950/30 to-slate-50 dark:to-slate-900 border border-primary-500/40 dark:border-primary-500/30">
            <label className="block space-y-2 max-w-md">
              <span className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <span>Total Target Funding Goal (POL / MATIC)</span>
              </span>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  className="w-full pl-4 pr-16 py-3 bg-slate-950 border border-slate-300 dark:border-white/20 rounded-xl text-white font-mono font-extrabold text-2xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  placeholder="e.g., 50.0"
                  required
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold font-mono text-slate-400">POL</span>
              </div>
            </label>
          </div>

          {/* Story Markdown & Preview Tab */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-200">
                Detailed Pitch & Roadmap Story (Markdown Supported) *
              </span>
              <div className="flex gap-1 bg-slate-900 p-1 rounded-lg border border-slate-200 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setIsPreviewTab(false)}
                  className={`px-3 py-1 text-xs font-semibold rounded ${!isPreviewTab ? "bg-primary-600 text-white" : "text-slate-400"}`}
                >
                  Write Story
                </button>
                <button
                  type="button"
                  onClick={() => setIsPreviewTab(true)}
                  className={`px-3 py-1 text-xs font-semibold rounded ${isPreviewTab ? "bg-primary-600 text-white" : "text-slate-400"}`}
                >
                  Live Preview
                </button>
              </div>
            </div>

            {!isPreviewTab ? (
              <textarea
                rows={10}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Explain the problem you are solving, why your team is qualified, how milestone funds will be utilized, and what tangible evidence you will provide at each step..."
                className="w-full p-4 bg-slate-900/80 border border-white/[0.1] rounded-xl text-slate-100 font-mono text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition-all custom-scrollbar"
                required
              />
            ) : (
              <div className="p-6 bg-slate-900/40 rounded-xl border border-white/[0.08] min-h-[250px] prose prose-invert max-w-none text-slate-300 whitespace-pre-wrap leading-relaxed">
                {description || "No description written yet."}
              </div>
            )}
          </div>

          {/* Milestone Tranche Builder */}
          <div className="space-y-5 pt-6 border-t border-white/[0.08]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h4 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                  <span>Escrow Milestone Gates</span>
                  <span className={`text-xs px-2.5 py-0.5 rounded-full font-mono font-bold ${
                    isGoalMatched ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" : "bg-red-500/20 text-red-300 border border-red-500/50 dark:border-red-500/40"
                  }`}>
                    Tranche Sum: {totalMilestoneAmount} / {goalNumber || 0} POL
                  </span>
                </h4>
                <p className="text-xs text-slate-400 mt-1">
                  Donors release escrow funds step-by-step upon proof submission and community quadratic vote.
                </p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addMilestone} leadingIcon={<Plus className="w-4 h-4" />}>
                Add Milestone Tranche
              </Button>
            </div>

            {!isGoalMatched && goalNumber > 0 && (
              <div className="flex items-center gap-2 p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-500/50 dark:border-red-500/40 text-red-200 text-xs">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400" />
                <span>
                  <strong>Validation Alert:</strong> The sum of your milestone targets ({totalMilestoneAmount} POL) must precisely equal your total funding goal ({goalNumber} POL).
                </span>
              </div>
            )}

            <div className="space-y-4">
              {milestones.map((milestone, index) => (
                <div key={index} className="p-5 rounded-2xl bg-slate-100/60 dark:bg-slate-900/60 border border-white/[0.08] hover:border-slate-200 dark:border-white/15 transition-all relative space-y-4">
                  <div className="flex items-center justify-between border-b border-white/05 pb-3">
                    <span className="text-xs font-mono font-bold uppercase tracking-wider text-primary-400">
                      Milestone #{index + 1}
                    </span>
                    {milestones.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeMilestone(index)}
                        className="text-slate-500 hover:text-red-400 transition-colors"
                        title="Remove milestone"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-1.5 md:col-span-1">
                      <label className="text-xs font-semibold text-slate-300">Milestone Objective Title *</label>
                      <input
                        type="text"
                        className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-200 dark:border-white/15 rounded-xl text-slate-100 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                        value={milestone.title}
                        onChange={(e) => updateMilestone(index, "title", e.target.value)}
                        placeholder="e.g., MVP Prototype Demo"
                        required
                      />
                    </div>

                    <div className="space-y-1.5 md:col-span-1">
                      <label className="text-xs font-semibold text-slate-300">Tranche Target Amount (POL) *</label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          className="w-full pl-3.5 pr-12 py-2.5 bg-slate-950 border border-slate-200 dark:border-white/15 rounded-xl text-slate-100 font-mono text-sm font-bold focus:outline-none focus:ring-1 focus:ring-primary-500"
                          value={milestone.targetAmount}
                          onChange={(e) => updateMilestone(index, "targetAmount", e.target.value)}
                          placeholder="e.g., 25.0"
                          required
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-xs text-slate-400">POL</span>
                      </div>
                    </div>

                    <div className="space-y-1.5 md:col-span-1">
                      <label className="text-xs font-semibold text-slate-300">Target Completion Date & Time *</label>
                      <input
                        type="datetime-local"
                        className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-200 dark:border-white/15 rounded-xl text-slate-100 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                        value={milestone.deadline}
                        onChange={(e) => updateMilestone(index, "deadline", e.target.value)}
                        required
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-between pt-6 border-t border-white/[0.08]">
            <Button variant="outline" size="lg" onClick={() => setCurrentStep(1)} leadingIcon={<ArrowLeft className="w-5 h-5" />}>
              Back
            </Button>
            <Button
              variant="primary"
              size="lg"
              onClick={handleNextStep}
              trailingIcon={<ArrowRight className="w-5 h-5" />}
              className="px-8 font-bold shadow-glow-primary rounded-xl"
              disabled={!isGoalMatched}
            >
              Verify & Preview
            </Button>
          </div>
        </GlassCard>
      )}

      {/* ── STEP 3: REVIEW & DEPLOY ── */}
      {currentStep === 3 && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in-50 duration-300">
          {/* Left Column: Live Card Preview & Terms Check */}
          <div className="lg:col-span-6 space-y-6">
            <div>
              <h3 className="text-xl font-bold text-slate-100 mb-1">Live Donor Card Preview</h3>
              <p className="text-xs text-slate-400">This is exactly how your project card will appear on the platform explore feed.</p>
            </div>

            <CampaignPreviewCard
              title={title}
              category={category}
              descriptionMarkdown={description}
              targetGoal={goalNumber}
              coverImageUrl={coverPreviewUrl || undefined}
              milestoneCount={milestones.length}
              creatorAddress={address || "0x000...000"}
              daysLeft={30}
              className="shadow-2xl"
            />

            <GlassCard className="p-6 space-y-3 bg-slate-900/40">
              <h4 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Immutable On-Chain Escrow Terms</span>
              </h4>
              <ul className="text-xs text-slate-300 space-y-2 font-mono">
                <li className="flex justify-between border-b border-white/05 pb-1.5">
                  <span className="text-slate-500">Target Chain:</span>
                  <span className="text-primary-300 font-semibold">{getChainLabel(TARGET_CHAIN_ID)} (ID #{TARGET_CHAIN_ID})</span>
                </li>
                <li className="flex justify-between border-b border-white/05 pb-1.5">
                  <span className="text-slate-500">Total Escrow Vault:</span>
                  <span className="text-emerald-400 font-bold">{goalNumber} POL</span>
                </li>
                <li className="flex justify-between border-b border-white/05 pb-1.5">
                  <span className="text-slate-500">Milestone Tranches:</span>
                  <span>{milestones.length} community-governed gates</span>
                </li>
                {category === "medical" && (
                  <li className="flex justify-between text-amber-300">
                    <span>Hospital Lock:</span>
                    <span className="truncate max-w-[150px]">{hospitalAddress}</span>
                  </li>
                )}
              </ul>
            </GlassCard>
          </div>

          {/* Right Column: Deploy Control Panel */}
          <div className="lg:col-span-6 space-y-6">
            <GlassCard className="p-6 md:p-8 space-y-6 bg-gradient-to-br from-slate-900 via-primary-50/50 dark:via-primary-950/30 to-slate-50 dark:to-slate-900 border-primary-500/40 dark:border-primary-500/30">
              <div>
                <h3 className="text-2xl font-bold text-white mb-1 flex items-center gap-2">
                  <Rocket className="w-6 h-6 text-primary-400" />
                  <span>Launch Campaign On-Chain</span>
                </h3>
                <p className="text-sm text-slate-300">
                  You are about to execute a custom smart contract deployment through the CampaignFactory on Polygon Amoy.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-white/60 dark:bg-slate-950/60 border border-slate-200 dark:border-white/10 space-y-3">
                <p className="text-xs font-bold text-slate-300 uppercase tracking-wider">Deployment Sequence</p>
                <div className="space-y-2.5">
                  {([
                    { key: "deploying",   label: "1. Factory Deploy & Smart Contract Creation" },
                    { key: "uploading",   label: "2. Cover Artwork Cloudinary Ingestion" },
                    { key: "registering", label: "3. Backend API Synchronization & Indexing" },
                    { key: "done",        label: "✓ Campaign Successfully Live!" },
                  ] as const).map(({ key, label }) => {
                    const order = ["deploying", "uploading", "registering", "done"];
                    const currentIdx = order.indexOf(deployStep);
                    const stepIdx   = order.indexOf(key);
                    const isDone    = stepIdx < currentIdx || deployStep === "done";
                    const isActive  = stepIdx === currentIdx && deployStep !== "done";
                    return (
                      <div key={key} className={`flex items-center gap-2.5 text-xs font-medium transition-all ${
                        isDone ? "text-emerald-400" : isActive ? "text-primary-300 font-bold animate-pulse" : "text-slate-500"
                      }`}>
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[11px] ${
                          isDone ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" :
                          isActive ? "bg-primary-500/30 text-primary-300 border border-primary-500/50" :
                          "bg-slate-800 text-slate-400 border border-white/05"
                        }`}>
                          {isDone ? "✓" : stepIdx + 1}
                        </div>
                        <span>{label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-primary-50/50 dark:bg-primary-950/40 border border-primary-500/40 dark:border-primary-500/30 text-xs text-primary-800 dark:text-primary-200 space-y-1.5">
                <p className="font-semibold flex items-center gap-1.5">
                  <HelpCircle className="w-4 h-4 text-primary-400" />
                  <span>What happens when I click Launch?</span>
                </p>
                <p className="text-slate-300 leading-relaxed">
                  Your Web3 wallet will prompt you to sign a deployment transaction and pay a tiny gas fee in testnet POL/MATIC. Once mined, your campaign metadata is registered instantly.
                </p>
              </div>

              <div className="space-y-3 pt-2">
                <Button
                  type="button"
                  variant="primary"
                  size="lg"
                  fullWidth
                  onClick={handleSubmit}
                  isLoading={isSaving || isDeploying || (txHash && deployStep !== "done" && deployStep !== "idle")}
                  disabled={!isSignedIn || !factoryConfigured || (deployStep !== "idle" && deployStep !== "done")}
                  className="py-4 font-extrabold text-lg shadow-glow-primary rounded-2xl"
                  leadingIcon={!isSaving && <Rocket className="w-5 h-5" />}
                >
                  {deployStep === "idle" ? "Deploy On-Chain & Go Live!" :
                   deployStep === "done" ? "Campaign Live!" :
                   "Executing Deployment…"}
                </Button>

                {deployStep === "idle" && (
                  <Button
                    type="button"
                    variant="outline"
                    size="md"
                    fullWidth
                    onClick={() => setCurrentStep(2)}
                    disabled={isSaving}
                    leadingIcon={<ArrowLeft className="w-4 h-4" />}
                  >
                    Return & Edit Milestones
                  </Button>
                )}
              </div>
            </GlassCard>
          </div>
        </div>
      )}
    </div>
  );
}
