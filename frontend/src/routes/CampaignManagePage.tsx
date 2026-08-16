import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Settings, Layers, Users, ExternalLink, ShieldAlert, CheckCircle2, DollarSign, Sparkles } from "lucide-react";
import { CreatorDashboard } from "@/components/CreatorDashboard";
import { useCampaignDetail } from "@/hooks/useCampaigns";
import { useAccount } from "wagmi";
import { Alert, Button, GlassCard, CampaignCardSkeleton, Badge } from "@/components/ui";
import { CampaignEditForm } from "@/components/CampaignEditForm";
import { CampaignDonorList } from "@/components/CampaignDonorList";
import { DonationFeed } from "@/components/DonationFeed";

export function CampaignManagePage() {
  const { id } = useParams<{ id: string }>();
  const { address } = useAccount();
  const { data, isLoading, isError, refetch } = useCampaignDetail(id);
  
  const [activeTab, setActiveTab] = useState<"escrow" | "profile" | "donors">("escrow");

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
        <Alert variant="danger" title="Campaign Unavailable">
          Could not load campaign metadata from the backend API. The contract may not be registered yet.
        </Alert>
        <Button variant="outline" className="mt-6" to="/my-campaigns">Back to My Campaigns</Button>
      </div>
    );
  }

  const { campaign, blockchainState } = data;
  const isCreator = address?.toLowerCase() === campaign.creatorAddress.toLowerCase();
  const raised = blockchainState.totalFundsRaised ?? "0";
  const goal = blockchainState.fundraisingGoal ?? String(campaign.targetGoal);

  return (
    <div className="page-container max-w-7xl space-y-8 pb-24">
      {/* Header & Nav */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" leadingIcon={<ArrowLeft className="h-4 w-4" />} to={`/campaign/${id}`} className="text-slate-400">
              Public Campaign Page
            </Button>
            <span className="text-slate-400">/</span>
            <span className="text-xs font-semibold text-primary-300 bg-primary-500/10 px-2.5 py-0.5 rounded-full border border-primary-500/40 dark:border-primary-500/30">
              Creator Studio
            </span>
          </div>
          <h1 className="font-display text-3xl font-extrabold text-slate-100 flex items-center gap-3">
            <span>Manage: {campaign.title}</span>
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            leadingIcon={<ExternalLink className="w-4 h-4" />}
            to={`https://amoy.polygonscan.com/address/${campaign.contractAddress}`}
          >
            Polygonscan
          </Button>
          <Button variant="primary" size="sm" to={`/campaign/${id}`}>
            View Live
          </Button>
        </div>
      </div>

      {!isCreator && (
        <Alert variant="warning" title="Creator Access Required">
          Please connect the verified creator wallet (<code>{campaign.creatorAddress}</code>) to submit milestone proofs, request payout releases, and modify profile artwork.
        </Alert>
      )}

      {/* Creator Studio Top Overview Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <GlassCard className="p-5 bg-slate-900/40 border-white/[0.08]">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Escrow Balance</span>
          <div className="text-2xl font-black text-emerald-400 mt-1.5 flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-emerald-500 flex-shrink-0" />
            <span>{raised} POL</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">Locked in community vault</p>
        </GlassCard>

        <GlassCard className="p-5 bg-slate-900/40 border-white/[0.08]">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Target Goal</span>
          <div className="text-2xl font-black text-white mt-1.5">{goal} POL</div>
          <p className="text-xs text-slate-400 mt-1">Immutable on-chain target</p>
        </GlassCard>

        <GlassCard className="p-5 bg-slate-900/40 border-white/[0.08]">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Governance Status</span>
          <div className="mt-1.5 flex items-center gap-2">
            <Badge variant="blockchain" dot size="md">
              {blockchainState.latestMilestoneStatus || "Active Gate"}
            </Badge>
          </div>
          <p className="text-xs text-slate-400 mt-2">{campaign.milestones.length} total milestone tranches</p>
        </GlassCard>

        <GlassCard className="p-5 bg-slate-900/40 border-white/[0.08]">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Contract State</span>
          <div className="text-base font-mono font-bold text-primary-300 mt-2 truncate">
            {campaign.contractAddress.slice(0, 10)}…{campaign.contractAddress.slice(-6)}
          </div>
          <p className="text-xs text-emerald-400 font-semibold mt-1 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Synced & Verified</span>
          </p>
        </GlassCard>
      </div>

      {/* Tab Selector Bar */}
      <div className="flex items-center gap-2 border-b border-white/[0.08] pb-1">
        {[
          { id: "escrow", label: "Milestone Payouts & Proofs", icon: <Layers className="w-4 h-4" /> },
          { id: "profile", label: "Edit Profile & Artwork", icon: <Settings className="w-4 h-4" /> },
          { id: "donors", label: "Donors & Live Activity", icon: <Users className="w-4 h-4" /> },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-6 py-3.5 font-bold text-sm transition-all border-b-2 -mb-1 ${
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

      {/* Tab 1: Escrow Milestones & Proof Submission */}
      {activeTab === "escrow" && (
        <div className="space-y-6 animate-in fade-in-50 duration-300">
          <GlassCard className="p-6 bg-gradient-to-r from-primary-50/50 dark:from-primary-950/40 to-slate-50 dark:to-slate-900 border-primary-500/40 dark:border-primary-500/30">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary-400" />
                  <span>Escrow Tranche Disbursement Management</span>
                </h3>
                <p className="text-sm text-slate-300 mt-1 leading-relaxed">
                  Submit cryptographic IPFS completion proofs to open voting gates. When community approval votes exceed rejections, you can execute transaction calls to unlock tranche funds directly to your wallet.
                </p>
              </div>
            </div>
          </GlassCard>

          {isCreator ? (
            <CreatorDashboard
              contractAddress={campaign.contractAddress}
              milestones={campaign.milestones}
            />
          ) : (
            <Alert variant="info">
              Connect creator wallet to execute payouts or upload proofs.{" "}
              <Link to={`/campaign/${id}`} className="underline font-bold text-primary-300">
                Return to public view
              </Link>
            </Alert>
          )}
        </div>
      )}

      {/* Tab 2: Edit Campaign Profile Metadata */}
      {activeTab === "profile" && (
        <div className="animate-in fade-in-50 duration-300">
          {isCreator ? (
            <CampaignEditForm campaign={campaign} onSuccess={() => refetch()} />
          ) : (
            <Alert variant="warning">Only the authenticated creator wallet can modify campaign profile artwork and descriptions.</Alert>
          )}
        </div>
      )}

      {/* Tab 3: Donors & Live Activity */}
      {activeTab === "donors" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in-50 duration-300">
          <div className="lg:col-span-8">
            <CampaignDonorList campaignAddress={campaign.contractAddress} />
          </div>
          
          <div className="lg:col-span-4 space-y-6">
            <GlassCard className="p-6 space-y-4 bg-slate-900/50">
              <h4 className="text-base font-bold text-slate-100 border-b border-slate-200 dark:border-white/10 pb-3 flex items-center justify-between">
                <span>Live Receipt Feed</span>
                <span className="text-xs text-emerald-400 font-mono">● Active</span>
              </h4>
              <DonationFeed campaignAddress={campaign.contractAddress} limit={10} />
            </GlassCard>
          </div>
        </div>
      )}
    </div>
  );
}
