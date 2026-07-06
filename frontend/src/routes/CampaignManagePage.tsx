import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { CreatorDashboard } from "@/components/CreatorDashboard";
import { useCampaignDetail } from "@/hooks/useCampaigns";
import { useAccount } from "wagmi";
import { Alert, Button, CampaignCardSkeleton } from "@/components/ui";

export function CampaignManagePage() {
  const { id } = useParams<{ id: string }>();
  const { address } = useAccount();
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
        <Alert variant="danger" title="Campaign unavailable">
          Could not load campaign metadata from the backend cache.
        </Alert>
      </div>
    );
  }

  const isCreator = address?.toLowerCase() === data.campaign.creatorAddress.toLowerCase();

  return (
    <div className="page-container space-y-6">
      <Button variant="ghost" size="sm" leadingIcon={<ArrowLeft className="h-4 w-4" />} to={`/campaign/${id}`}>
        Back to campaign
      </Button>

      {!isCreator && (
        <Alert variant="warning" title="Creator access only">
          Connect the creator wallet ({data.campaign.creatorAddress.slice(0, 10)}…) to submit milestone proofs.
        </Alert>
      )}

      {isCreator ? (
        <CreatorDashboard
          contractAddress={data.campaign.contractAddress}
          milestones={data.campaign.milestones}
        />
      ) : (
        <Alert variant="info">
          This workspace is for campaign creators.{" "}
          <Link to={`/campaign/${id}`} className="underline text-blockchain-300">
            View the public campaign page
          </Link>
        </Alert>
      )}
    </div>
  );
}
