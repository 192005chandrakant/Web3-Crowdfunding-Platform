/**
 * wagmi hooks for interacting with deployed Campaign contracts
 * and the CampaignFactory.
 */
import { useCallback, useState } from "react";
import {
  useWriteContract,
  useWaitForTransactionReceipt,
  usePublicClient
} from "wagmi";
import { parseEther, parseGwei } from "viem";
import { CAMPAIGN_ABI, CAMPAIGN_FACTORY_ABI, FACTORY_ADDRESS } from "@/lib/contracts";
import { TARGET_CHAIN_ID } from "@/lib/chain";

// Polygon Amoy requires minimum 25 Gwei tip — set explicit gas overrides
// to avoid "gas price below minimum" RPC rejection.
const AMOY_GAS_OVERRIDES = {
  maxFeePerGas:         parseGwei("35"),  // base + tip ceiling
  maxPriorityFeePerGas: parseGwei("25"),  // minimum required miner tip
} as const;

// ─── Per-campaign actions (contribute, vote, submit proof) ─────────────────
export function useCampaignContractActions(contractAddress: `0x${string}`) {
  const { writeContractAsync, isPending } = useWriteContract();

  const contribute = useCallback(
    async (amountEther: string) => {
      const hash = await writeContractAsync({
        address:      contractAddress,
        abi:          CAMPAIGN_ABI,
        functionName: "contribute",
        value:        parseEther(amountEther),
        chainId:      TARGET_CHAIN_ID,
        ...AMOY_GAS_OVERRIDES
      });
      return hash;
    },
    [contractAddress, writeContractAsync]
  );

  const voteOnMilestone = useCallback(
    async (milestoneIndex: number, support: boolean) => {
      const hash = await writeContractAsync({
        address:      contractAddress,
        abi:          CAMPAIGN_ABI,
        functionName: "voteOnMilestone",
        args:         [BigInt(milestoneIndex), support],
        chainId:      TARGET_CHAIN_ID,
        ...AMOY_GAS_OVERRIDES
      });
      return hash;
    },
    [contractAddress, writeContractAsync]
  );

  const submitMilestoneProof = useCallback(
    async (milestoneIndex: number, ipfsCid: string) => {
      const hash = await writeContractAsync({
        address:      contractAddress,
        abi:          CAMPAIGN_ABI,
        functionName: "submitMilestoneProof",
        args:         [BigInt(milestoneIndex), ipfsCid],
        chainId:      TARGET_CHAIN_ID,
        ...AMOY_GAS_OVERRIDES
      });
      return hash;
    },
    [contractAddress, writeContractAsync]
  );

  return { contribute, voteOnMilestone, submitMilestoneProof, isPending };
}

// ─── Factory deploy ────────────────────────────────────────────────────────
interface DeployParams {
  goal:            string;
  titles:          string[];
  targetAmounts:   string[];
  deadlines:       number[];
  hospitalAddress?: `0x${string}`;
}

export function useFactoryDeploy() {
  const { writeContractAsync, isPending: isDeploying } = useWriteContract();
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();

  const factoryConfigured = Boolean(FACTORY_ADDRESS);

  const deployCampaign = useCallback(
    async ({
      goal,
      titles,
      targetAmounts,
      deadlines,
      hospitalAddress
    }: DeployParams): Promise<`0x${string}`> => {
      if (!FACTORY_ADDRESS) {
        throw new Error("VITE_FACTORY_CONTRACT_ADDRESS is not set");
      }

      const hash = await writeContractAsync({
        address:      FACTORY_ADDRESS as `0x${string}`,
        abi:          CAMPAIGN_FACTORY_ABI,
        functionName: "createCampaign",
        args: [
          parseEther(goal),
          hospitalAddress ?? ("0x0000000000000000000000000000000000000000" as `0x${string}`),
          titles,
          targetAmounts.map((a) => parseEther(a)),
          deadlines.map(BigInt)
        ],
        chainId: TARGET_CHAIN_ID,
        ...AMOY_GAS_OVERRIDES
      });

      setTxHash(hash);
      return hash;
    },
    [writeContractAsync]
  );

  const { isLoading: isConfirming } = useWaitForTransactionReceipt({ hash: txHash });

  return { deployCampaign, isDeploying, isConfirming, factoryConfigured };
}
