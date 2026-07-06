import { useParams } from "react-router-dom";
import { ArrowLeft, Share2, ExternalLink } from "lucide-react";
import {
  GlassCard,
  ProgressBar,
  Badge,
  Button,
  Alert,
  CampaignCardSkeleton
} from "@/components/ui";
import { DonorPortal } from "@/components/DonorPortal";
import { useCampaignDetail } from "@/hooks/useCampaigns";
import { getChainLabel, TARGET_CHAIN_ID } from "@/lib/chain";

export function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, isError } = useCampaignDetail(id);

  if (isLoading) {
    return (
      <div className="page-container">
        <CampaignCardSkeleton />
      </div>
    );
  }

  if (isError || !data?.campaign) {
    return (
      <div className="page-container">
        <Alert variant="danger" title="Campaign not found">
          No cached campaign exists for address <code>{id}</code>. Deploy a campaign or verify the contract address.
        </Alert>
        <Button variant="outline" className="mt-4" to="/explore">Browse campaigns</Button>
      </div>
    );
  }

  const { campaign, blockchainState } = data;
  const raised = blockchainState.totalFundsRaised ?? "0";
  const goal = blockchainState.fundraisingGoal ?? String(campaign.targetGoal);
  const raisedNum = Number.parseFloat(raised) || 0;
  const goalNum = Number.parseFloat(goal) || campaign.targetGoal || 1;
  const progress = Math.min(100, Math.round((raisedNum / goalNum) * 100));
  const activeMilestoneIndex = blockchainState.milestones.findIndex((item) => item.isCurrent);

  return (
    <div className="page-container">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" leadingIcon={<ArrowLeft className="h-4 w-4" />} to="/explore">
          All Campaigns
        </Button>
        <span className="text-slate-700">/</span>
        <span className="text-sm text-slate-500 truncate">{campaign.title}</span>
      </div>

      <section className="relative overflow-hidden rounded-2xl border border-white/[0.08]">
        <div
          className="h-56 w-full bg-gradient-to-br from-primary-900 via-slate-900 to-secondary-900 md:h-72"
          style={campaign.coverImageUrl ? { backgroundImage: `url(${campaign.coverImageUrl})`, backgroundSize: "cover" } : undefined}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/30 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                <Badge variant="default">{campaign.category}</Badge>
                <Badge variant="blockchain" dot>{blockchainState.latestMilestoneStatus}</Badge>
              </div>
              <h1 className="font-display text-3xl font-bold text-white md:text-4xl max-w-3xl leading-tight">
                {campaign.title}
              </h1>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" leadingIcon={<Share2 className="h-4 w-4" />}>Share</Button>
              <Button
                variant="outline"
                size="sm"
                leadingIcon={<ExternalLink className="h-4 w-4" />}
                to={`https://amoy.polygonscan.com/address/${campaign.contractAddress}`}
              >
                Contract
              </Button>
              <Button variant="primary" size="sm" to={`/campaign/${campaign.contractAddress}/manage`}>
                Creator Tools
              </Button>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
        <div className="space-y-6 min-w-0">
          <GlassCard flush className="p-5 space-y-3">
            <p className="section-label">About this campaign</p>
            <p className="text-sm leading-relaxed text-slate-300 whitespace-pre-wrap">
              {campaign.descriptionMarkdown}
            </p>
          </GlassCard>

          <GlassCard flush className="p-5 space-y-4">
            <p className="section-label">Funding progress</p>
            <ProgressBar value={progress} variant="primary" size="lg" showValue animated />
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-slate-500">Raised</p>
                <p className="font-semibold text-slate-100">{raised} MATIC</p>
              </div>
              <div>
                <p className="text-slate-500">Goal</p>
                <p className="font-semibold text-slate-100">{goal} MATIC</p>
              </div>
            </div>
          </GlassCard>

          <GlassCard flush className="p-5 space-y-3">
            <p className="section-label">On-chain milestones</p>
            {blockchainState.milestones.length === 0 ? (
              <p className="text-sm text-slate-500">
                {blockchainState.synced ? "No milestones indexed yet." : "Live chain data unavailable — check RPC configuration."}
              </p>
            ) : (
              blockchainState.milestones.map((milestone) => (
                <div key={milestone.index} className="rounded-xl border border-white/[0.06] p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-slate-200">{milestone.title}</p>
                    <Badge variant={milestone.isPaid ? "success" : milestone.isCurrent ? "primary" : "default"} size="sm">
                      {milestone.isPaid ? "Paid" : milestone.isCurrent ? "Active" : "Locked"}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    Target {milestone.targetAmount} MATIC · Approvals {milestone.approvalVotes} · Rejections {milestone.rejectionVotes}
                  </p>
                  {milestone.ipfsProofHash && (
                    <a
                      href={`https://gateway.pinata.cloud/ipfs/${milestone.ipfsProofHash}`}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-block text-xs text-blockchain-300 underline"
                    >
                      View proof on IPFS
                    </a>
                  )}
                </div>
              ))
            )}
          </GlassCard>
        </div>

        <aside className="space-y-4">
          <DonorPortal
            campaign={{
              contractAddress: campaign.contractAddress,
              title: campaign.title,
              goal,
              raised,
              milestoneCount: campaign.milestones.length,
              activeMilestoneIndex: activeMilestoneIndex >= 0 ? activeMilestoneIndex : 0
            }}
          />

          <GlassCard flush className="p-4 space-y-2">
            <p className="section-label">Blockchain Details</p>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-500">Network</span>
                <Badge variant="blockchain" size="sm" dot>{getChainLabel(TARGET_CHAIN_ID)}</Badge>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-500">Contract</span>
                <code className="font-mono text-slate-400">{campaign.contractAddress.slice(0, 10)}…</code>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-500">Creator</span>
                <code className="font-mono text-slate-400">{campaign.creatorAddress.slice(0, 10)}…</code>
              </div>
            </div>
          </GlassCard>
        </aside>
      </div>
    </div>
  );
}
