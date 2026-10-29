const { ethers } = require("ethers");
const BlockchainProviderFactory = require("../config/provider");
const {
  getBlockchainStateFromCache,
  cacheBlockchainState
} = require("./cacheService");

const CAMPAIGN_ABI = [
  "function totalFundsRaised() view returns (uint256)",
  "function totalFundsRemaining() view returns (uint256)",
  "function fundraisingGoal() view returns (uint256)",
  "function milestoneCount() view returns (uint256)",
  "function milestones(uint256 index) view returns (uint256 targetAmount, uint256 deadline, uint256 approvalQVWeight, uint256 rejectionQVWeight, uint256 snapshotTotalQVWeight, bool isCurrent, bool isPaid, string title, string ipfsProofHash)"
];

let provider = null;

function getProvider() {
  if (provider) {
    return provider;
  }
  provider = BlockchainProviderFactory.getProvider();
  return provider;
}

// Allow tests / mode-switching to reset the cached provider
function resetProvider() {
  provider = null;
}

function formatWei(value) {
  return ethers.formatEther(value);
}

async function fetchOnChainCampaignState(contractAddress) {
  const cached = await getBlockchainStateFromCache(contractAddress);
  if (cached) {
    return cached;
  }

  const readProvider = getProvider();
  const contract = new ethers.Contract(contractAddress, CAMPAIGN_ABI, readProvider);
  const code = await readProvider.getCode(contractAddress);

  if (code === "0x") {
    return {
      contractAddress,
      synced: false,
      totalFundsRaised: null,
      totalFundsRemaining: null,
      fundraisingGoal: null,
      latestMilestoneStatus: "contract_not_deployed",
      milestones: []
    };
  }

  const [totalFundsRaised, totalFundsRemaining, fundraisingGoal, milestoneCount] = await Promise.all([
    contract.totalFundsRaised(),
    contract.totalFundsRemaining(),
    contract.fundraisingGoal(),
    contract.milestoneCount()
  ]);

  const milestones = [];
  let latestMilestoneStatus = "pending_proof";

  for (let index = 0; index < Number(milestoneCount); index++) {
    const milestone = await contract.milestones(index);
    const isCurrent = milestone.isCurrent;
    const isPaid = milestone.isPaid;
    const hasProof = milestone.ipfsProofHash.length > 0;

    if (isCurrent && !isPaid && hasProof) {
      latestMilestoneStatus = "voting_active";
    } else if (isPaid) {
      latestMilestoneStatus = "tranche_paid";
    } else if (isCurrent && hasProof) {
      latestMilestoneStatus = "review_pending";
    }

    milestones.push({
      index,
      title: milestone.title,
      targetAmount: formatWei(milestone.targetAmount),
      deadline: milestone.deadline.toString(),
      ipfsProofHash: milestone.ipfsProofHash,
      approvalQVWeight: milestone.approvalQVWeight.toString(),
      rejectionQVWeight: milestone.rejectionQVWeight.toString(),
      snapshotTotalQVWeight: milestone.snapshotTotalQVWeight.toString(),
      isCurrent,
      isPaid
    });
  }

  const state = {
    contractAddress,
    synced: true,
    totalFundsRaised: formatWei(totalFundsRaised),
    totalFundsRemaining: formatWei(totalFundsRemaining),
    fundraisingGoal: formatWei(fundraisingGoal),
    latestMilestoneStatus,
    milestones
  };

  await cacheBlockchainState(contractAddress, state);
  return state;
}

module.exports = { fetchOnChainCampaignState, getProvider, resetProvider };
