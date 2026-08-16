import { useState } from "react";
import { useParams } from "react-router-dom";
import { ArrowLeft, Share2, ExternalLink, ShieldCheck, Users, FileText, CheckCircle2, Heart, Zap, Layers } from "lucide-react";
import {
  GlassCard,
  ProgressBar,
  Badge,
  Button,
  Alert,
  CampaignCardSkeleton
} from "@/components/ui";
import { DonorPortal } from "@/components/DonorPortal";
import { QVResultsDisplay } from "@/components/QVResultsDisplay";
import { useCampaignDetail } from "@/hooks/useCampaigns";
import { getChainLabel, TARGET_CHAIN_ID } from "@/lib/chain";
import { api } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { useAccount } from "wagmi";
import { CampaignDonorList } from "@/components/CampaignDonorList";
import { DonationFeed } from "@/components/DonationFeed";
import { ProofUploadCard } from "@/components/ProofUploadCard";
import toast from "react-hot-toast";

// ─── Inline QV stats for CampaignDetailPage milestone cards ──────────────────
function QVInlineMilestoneStats({
  campaignAddress,
  milestoneIndex
}: {
  campaignAddress: string;
  milestoneIndex: number;
}) {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["qv-stats", campaignAddress, milestoneIndex],
    queryFn: () => api.getCampaignVotingStats(campaignAddress, milestoneIndex),
    refetchInterval: 20_000,
    staleTime: 10_000,
    retry: false
  });

  if (isLoading) {
    return (
      <div className="animate-pulse h-6 bg-slate-700/30 rounded-xl" />
    );
  }
  if (!stats || stats.totalVoters === 0) {
    return (
      <p className="text-xs text-slate-500 italic py-2">No quadratic governance votes recorded yet for this milestone gate.</p>
    );
  }

  const approvalPct = stats.approvalPercent;
  const rejectionPct = stats.rejectionPercent;

  return (
    <div className="space-y-2.5 pt-3 border-t border-white/[0.06]">
      <div className="flex items-center justify-between">
        <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">Quadratic Governance Results</span>
        <span className="text-[11px] font-semibold text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">
          {stats.totalVoters} {stats.totalVoters === 1 ? "voter" : "voters"}
        </span>
      </div>
      
      {/* Approve bar */}
      <div className="flex items-center gap-2.5">
        <span className="text-xs text-emerald-400 w-16 font-mono font-bold">
          +{parseFloat(stats.approvalQVDisplay || "0").toFixed(1)} QV
        </span>
        <div className="flex-1 h-2 bg-slate-900 rounded-full overflow-hidden border border-white/05">
          <div
            className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full transition-all duration-700 shadow-glow-sm"
            style={{ width: `${approvalPct}%` }}
          />
        </div>
        <span className="text-xs font-bold text-slate-300 w-10 text-right">{approvalPct.toFixed(0)}%</span>
      </div>

      {/* Reject bar */}
      <div className="flex items-center gap-2.5">
        <span className="text-xs text-red-400 w-16 font-mono font-bold">
          -{parseFloat(stats.rejectionQVDisplay || "0").toFixed(1)} QV
        </span>
        <div className="flex-1 h-2 bg-slate-900 rounded-full overflow-hidden border border-white/05">
          <div
            className="h-full bg-gradient-to-r from-red-600 to-red-400 rounded-full transition-all duration-700"
            style={{ width: `${rejectionPct}%` }}
          />
        </div>
        <span className="text-xs font-bold text-slate-300 w-10 text-right">{rejectionPct.toFixed(0)}%</span>
      </div>

      <p className="text-[11px] text-slate-400 pt-0.5">
        Voter power scales quadratically (√POL contributed) to defend against whale plutocracy.
      </p>
    </div>
  );
}

export function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { address } = useAccount();
  const { data, isLoading, isError } = useCampaignDetail(id);

  const [activeTab, setActiveTab] = useState<"story" | "milestones" | "donors">("story");

  if (isLoading) {
    return (
      <div className="page-container max-w-7xl">
        <CampaignCardSkeleton />
      </div>
    );
  }

  if (isError || !data?.campaign) {
    return (
      <div className="page-container max-w-4xl py-12">
        <Alert variant="danger" title="Campaign Not Found or Off-Chain">
          No indexed campaign exists for smart contract address <code>{id}</code>. Please verify the Polygon Amoy target or check backend synchronization.
        </Alert>
        <div className="mt-6 flex gap-4">
          <Button variant="primary" to="/explore">Browse Active Campaigns</Button>
          <Button variant="outline" to="/create">Deploy New Campaign</Button>
        </div>
      </div>
    );
  }

  const { campaign, blockchainState } = data;
  const isCreator = address && campaign.creatorAddress.toLowerCase() === address.toLowerCase();

  const raised = blockchainState.totalFundsRaised ?? "0";
  const goal = blockchainState.fundraisingGoal ?? String(campaign.targetGoal);
  const raisedNum = Number.parseFloat(raised) || 0;
  const goalNum = Number.parseFloat(goal) || campaign.targetGoal || 1;
  const progress = Math.min(100, Math.round((raisedNum / goalNum) * 100));
  const activeMilestoneIndex = blockchainState.milestones.findIndex((item) => item.isCurrent);

  function handleShare() {
    if (navigator.share) {
      navigator.share({
        title: campaign.title,
        text: `Support ${campaign.title} with escrow protected milestone gates!`,
        url: window.location.href
      }).catch(() => {/* ignore */});
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Campaign share link copied to clipboard!");
    }
  }

  return (
    <div className="page-container max-w-7xl space-y-8 pb-24">
      {/* Top Breadcrumb Nav */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <Button variant="ghost" size="sm" leadingIcon={<ArrowLeft className="h-4 w-4" />} to="/explore" className="text-slate-400 hover:text-white">
            Explore Feed
          </Button>
          <span className="text-slate-400">/</span>
          <span className="text-sm font-semibold text-slate-300 truncate max-w-xs sm:max-w-md">{campaign.title}</span>
        </div>

        {isCreator && (
          <Badge variant="primary" className="bg-primary-500/20 border-primary-500/40 text-primary-800 dark:text-primary-200 animate-pulse flex items-center gap-1.5 px-3 py-1">
            <Zap className="w-3.5 h-3.5" />
            <span>You are the creator</span>
          </Badge>
        )}
      </div>

      {/* Contextual Help Banner */}
      {isCreator ? (
        <Alert variant="info" title="Creator Mode Active">
          You are viewing your campaign as a creator. Use this dashboard to manage milestones, upload completion proofs, and monitor donor voting.
        </Alert>
      ) : (
        <Alert variant="info" title="Donor Mode">
          You are viewing an Escrow-protected campaign. Your donations are held securely in a smart contract and only released quadratically when you and the community vote to approve milestone proofs.
        </Alert>
      )}

      {/* Hero Banner Section */}
      <section className="relative overflow-hidden rounded-3xl border border-white/[0.1] shadow-2xl bg-slate-950">
        <div
          className="h-64 w-full bg-gradient-to-br from-primary-950 via-slate-50 dark:via-slate-900 to-secondary-950 md:h-96"
          style={campaign.coverImageUrl ? { backgroundImage: `url(${campaign.coverImageUrl})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />
        
        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="space-y-3 max-w-3xl">
              <div className="flex flex-wrap items-center gap-2.5">
                <Badge variant="default" className="capitalize px-3 py-1 bg-slate-900/90 text-slate-200 border-slate-300 dark:border-white/20">
                  {campaign.category}
                </Badge>
                <Badge variant="success" className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Escrow Protected</span>
                </Badge>
                <Badge variant="blockchain" dot className="px-3">
                  {blockchainState.latestMilestoneStatus || "Active Gate"}
                </Badge>
              </div>
              <h1 className="font-display text-3xl font-extrabold text-white md:text-5xl leading-tight tracking-tight">
                {campaign.title}
              </h1>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button variant="outline" size="sm" onClick={handleShare} leadingIcon={<Share2 className="h-4 w-4" />} className="bg-slate-900/80 backdrop-blur-md">
                Share
              </Button>
              <Button
                variant="outline"
                size="sm"
                leadingIcon={<ExternalLink className="h-4 w-4" />}
                to={`https://amoy.polygonscan.com/address/${campaign.contractAddress}`}
                className="bg-slate-900/80 backdrop-blur-md font-mono"
              >
                Polygonscan
              </Button>
              {isCreator && (
                <Button variant="primary" size="sm" to={`/campaign/${campaign.contractAddress}/manage`} className="shadow-glow-primary font-bold">
                  Creator Management Tools
                </Button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Main Grid: Tabs & Info left (8 cols), Donor Portal right (4 cols) */}
      <div className="grid gap-8 lg:grid-cols-12">
        <div className="lg:col-span-8 space-y-6 min-w-0">
          
          {/* Tab Navigation Buttons */}
          <div className="flex items-center gap-2 border-b border-white/[0.08] pb-1">
            {[
              { id: "story", label: "Project Story", icon: <FileText className="w-4 h-4" /> },
              { id: "milestones", label: `Escrow Milestones (${blockchainState.milestones.length || campaign.milestones.length})`, icon: <Layers className="w-4 h-4" /> },
              { id: "donors", label: "Donors & Leaderboard", icon: <Users className="w-4 h-4" /> },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-5 py-3 font-semibold text-sm transition-all border-b-2 -mb-1 ${
                  activeTab === tab.id
                    ? "border-primary-400 text-white bg-white/[0.03] rounded-t-xl shadow-sm"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* TAB 1: STORY & ROADMAP */}
          {activeTab === "story" && (
            <div className="space-y-6 animate-in fade-in-50 duration-300">
              <GlassCard className="p-6 md:p-8 space-y-4 bg-slate-900/50">
                <h3 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                  <span>About This Project & Impact</span>
                </h3>
                <div className="prose prose-invert max-w-none text-slate-300 leading-relaxed text-sm whitespace-pre-wrap">
                  {campaign.descriptionMarkdown}
                </div>
              </GlassCard>

              {/* Progress Summary Banner */}
              <GlassCard className="p-6 md:p-8 space-y-4 bg-gradient-to-br from-slate-900 to-primary-950/20 border-white/[0.08]">
                <h4 className="text-lg font-bold text-slate-100">Escrow Vault Financial Summary</h4>
                <ProgressBar value={progress} variant="primary" size="lg" showValue animated />
                <div className="grid grid-cols-3 gap-4 pt-2">
                  <div className="p-3.5 rounded-xl bg-white/60 dark:bg-slate-950/60 border border-white/05">
                    <p className="text-xs uppercase tracking-wider text-slate-500 font-bold">Total Raised</p>
                    <p className="text-xl font-black text-emerald-400 mt-1">{raised} MATIC</p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-white/60 dark:bg-slate-950/60 border border-white/05">
                    <p className="text-xs uppercase tracking-wider text-slate-500 font-bold">Target Goal</p>
                    <p className="text-xl font-black text-white mt-1">{goal} MATIC</p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-white/60 dark:bg-slate-950/60 border border-white/05">
                    <p className="text-xs uppercase tracking-wider text-slate-500 font-bold">Governance Gates</p>
                    <p className="text-xl font-black text-primary-300 mt-1">{blockchainState.milestones.length} Tranches</p>
                  </div>
                </div>
              </GlassCard>
            </div>
          )}

          {/* TAB 2: MILESTONES & PROOFS */}
          {activeTab === "milestones" && (
            <div className="space-y-6 animate-in fade-in-50 duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-slate-100">On-Chain Escrow Tranche Roadmap</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Funds release strictly upon community approval of cryptographic completion proofs.</p>
                </div>
                <Badge variant="blockchain" dot className="font-mono text-xs">
                  {blockchainState.synced ? "Synced with Contract" : "Cached State"}
                </Badge>
              </div>

              {/* Creator inline proof uploading for current active milestone */}
              {isCreator && activeMilestoneIndex >= 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-mono uppercase tracking-wider text-primary-400 font-bold flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5" />
                    <span>Creator Action: Active Milestone Proof Submission</span>
                  </p>
                  <ProofUploadCard
                    contractAddress={campaign.contractAddress}
                    milestoneIndex={activeMilestoneIndex}
                    milestoneTitle={blockchainState.milestones[activeMilestoneIndex]?.title || `Milestone #${activeMilestoneIndex + 1}`}
                    targetAmount={blockchainState.milestones[activeMilestoneIndex]?.targetAmount || "0"}
                    existingProofCid={blockchainState.milestones[activeMilestoneIndex]?.ipfsProofHash}
                    isPaid={blockchainState.milestones[activeMilestoneIndex]?.isPaid}
                  />
                </div>
              )}

              {blockchainState.milestones.length === 0 ? (
                <GlassCard className="p-12 text-center text-slate-500 space-y-2">
                  <Layers className="w-10 h-10 mx-auto text-slate-400 mb-2" />
                  <p className="font-semibold text-slate-300">No milestones indexed yet</p>
                  <p className="text-xs">Live on-chain data is syncing from Polygon Amoy testnet.</p>
                </GlassCard>
              ) : (
                <div className="space-y-4">
                  {blockchainState.milestones.map((milestone) => {
                    const mappedProofCid = campaign.milestones[milestone.index]?.proofCid || milestone.ipfsProofHash;
                    const hasProof = mappedProofCid && mappedProofCid.length > 0;
                    return (
                      <GlassCard
                        key={milestone.index}
                        className={`p-6 space-y-4 transition-all ${
                          milestone.isCurrent
                            ? "border-primary-500/40 bg-slate-900/80 shadow-glow-sm"
                            : "border-white/[0.06] bg-slate-900/30 opacity-90"
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.06] pb-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full font-bold font-mono flex items-center justify-center text-xs ${
                              milestone.isPaid ? "bg-emerald-500 text-slate-950" : milestone.isCurrent ? "bg-primary-500 text-white" : "bg-slate-800 text-slate-400"
                            }`}>
                              {milestone.index + 1}
                            </div>
                            <div>
                              <p className="text-base font-bold text-slate-100">{milestone.title}</p>
                              <p className="text-xs text-slate-400">Target Tranche: <strong className="text-slate-200">{milestone.targetAmount} MATIC</strong></p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <Badge variant={milestone.isPaid ? "success" : milestone.isCurrent ? "primary" : "default"} size="md" className="font-semibold">
                              {milestone.isPaid ? "✓ Paid & Released" : milestone.isCurrent ? "⚡ Active Voting Gate" : "🔒 Locked in Escrow"}
                            </Badge>
                          </div>
                        </div>

                        {mappedProofCid ? (
                          <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950/80 border border-slate-200 dark:border-white/10 text-xs">
                            <div className="flex items-center gap-2 text-slate-300">
                              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                              <span className="font-medium">Cryptographic Completion Evidence Submitted</span>
                            </div>
                            <a
                              href={`https://ipfs.io/ipfs/${mappedProofCid}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-primary-400 hover:text-primary-300 font-mono underline transition-colors"
                            >
                              <span>Inspect IPFS Proof</span>
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        ) : (
                          <p className="text-xs text-slate-500 italic">No IPFS completion proof uploaded by creator yet.</p>
                        )}

                        {/* Live Quadratic Voting Panel for active milestone with proof */}
                        {milestone.isCurrent && hasProof && (
                          <QVInlineMilestoneStats
                            campaignAddress={campaign.contractAddress}
                            milestoneIndex={milestone.index}
                          />
                        )}
                      </GlassCard>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: DONORS & LEADERBOARD */}
          {activeTab === "donors" && (
            <div className="animate-in fade-in-50 duration-300">
              <CampaignDonorList campaignAddress={campaign.contractAddress} />
            </div>
          )}
        </div>

        {/* Right Aside Column (4 cols): Interactive Donor Portal & Recent Activity */}
        <aside className="lg:col-span-4 space-y-6">
          <DonorPortal
            campaign={{
              contractAddress: campaign.contractAddress,
              title: campaign.title,
              goal,
              raised,
              milestoneCount: campaign.milestones.length,
              activeMilestoneIndex: activeMilestoneIndex >= 0 ? activeMilestoneIndex : 0,
              ipfsProofHash: activeMilestoneIndex >= 0 ? (campaign.milestones[activeMilestoneIndex]?.proofCid || blockchainState.milestones[activeMilestoneIndex]?.ipfsProofHash) : undefined
            }}
          />

          {/* Live Recent Contribution Feed */}
          <GlassCard className="p-6 space-y-4 bg-slate-900/50">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Heart className="w-4 h-4 text-primary-400 fill-primary-400/20" />
                <span>Recent Contributions</span>
              </h4>
              <span className="text-[11px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded">Live Feed</span>
            </div>
            <DonationFeed campaignAddress={campaign.contractAddress} limit={5} />
          </GlassCard>

          {/* Blockchain Verifiable Details */}
          <GlassCard className="p-5 space-y-3 bg-slate-950/80">
            <p className="text-xs uppercase tracking-wider font-bold text-slate-400">Verifiable Smart Contract</p>
            <div className="space-y-2.5 text-xs font-mono">
              <div className="flex items-center justify-between pb-1.5 border-b border-white/05">
                <span className="text-slate-500 font-sans">Blockchain</span>
                <Badge variant="blockchain" size="sm" dot>{getChainLabel(TARGET_CHAIN_ID)}</Badge>
              </div>
              <div className="flex items-center justify-between pb-1.5 border-b border-white/05">
                <span className="text-slate-500 font-sans">Contract Address</span>
                <a
                  href={`https://amoy.polygonscan.com/address/${campaign.contractAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-400 hover:underline truncate max-w-[150px]"
                >
                  {campaign.contractAddress.slice(0, 8)}…{campaign.contractAddress.slice(-6)}
                </a>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-sans">Creator Wallet</span>
                <a
                  href={`https://amoy.polygonscan.com/address/${campaign.creatorAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-300 hover:underline truncate max-w-[150px]"
                >
                  {campaign.creatorAddress.slice(0, 8)}…{campaign.creatorAddress.slice(-6)}
                </a>
              </div>
            </div>
          </GlassCard>
        </aside>
      </div>
    </div>
  );
}
