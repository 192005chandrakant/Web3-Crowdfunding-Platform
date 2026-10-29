/**
 * wagmi hooks for interacting with deployed Campaign contracts
 * and the CampaignFactory.
 */
import { useCallback, useState } from "react";
import {
  useAccount,
  useWriteContract,
  useWaitForTransactionReceipt,
  usePublicClient
} from "wagmi";
import { parseEther, parseGwei } from "viem";
import { CAMPAIGN_ABI, CAMPAIGN_FACTORY_ABI, FACTORY_ADDRESS } from "@/lib/contracts";
import { TARGET_CHAIN_ID } from "@/lib/chain";

// Polygon Amoy enforces a 25 gwei gas floor. Use a fixed legacy gas price so
// wallets reserve a predictable amount instead of showing oversized ceilings.
const AMOY_GAS_OVERRIDES = {
  maxPriorityFeePerGas: parseGwei("25")
} as const;

const VOTE_GAS_FALLBACK = 180_000n;
const VOTE_GAS_CAP = 220_000n;

async function ensureWalletOnTargetChain() {
  if (typeof window === "undefined" || !(window as any).ethereum) {
    return;
  }

  const provider = (window as any).ethereum;
  const currentChainId = Number(await provider.request({ method: "eth_chainId" }));

  if (currentChainId === TARGET_CHAIN_ID) {
    return;
  }

  const targetChainHex = `0x${TARGET_CHAIN_ID.toString(16)}`;
  const blockchainMode = import.meta.env.VITE_BLOCKCHAIN_MODE || "rpc";
  const isAmoy = TARGET_CHAIN_ID === 80002;

  // Build chain params that match the active mode
  const chainParams = isAmoy
    ? {
        chainId:         targetChainHex,
        chainName:       "Polygon Amoy Testnet",
        nativeCurrency:  { name: "POL", symbol: "POL", decimals: 18 },
        rpcUrls:         [import.meta.env.VITE_ALCHEMY_RPC_URL || "https://rpc-amoy.polygon.technology"],
        blockExplorerUrls: ["https://amoy.polygonscan.com"]
      }
    : {
        chainId:         targetChainHex,
        chainName:       `Local Ganache (${TARGET_CHAIN_ID})`,
        nativeCurrency:  { name: "MATIC", symbol: "MATIC", decimals: 18 },
        rpcUrls:         [import.meta.env.VITE_GANACHE_RPC_URL || "http://127.0.0.1:7545"],
        blockExplorerUrls: []
      };

  try {
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: targetChainHex }]
    });
  } catch (error: any) {
    if (error?.code === 4902) {
      await provider.request({
        method: "wallet_addEthereumChain",
        params: [chainParams]
      });
    } else {
      throw error;
    }
  }
}

function withGasBuffer(estimatedGas: bigint): bigint {
  const buffered = (estimatedGas * 125n) / 100n;
  return buffered > VOTE_GAS_CAP ? VOTE_GAS_CAP : buffered;
}

// ─── Per-campaign actions (contribute, vote, submit proof) ─────────────────
export function useCampaignContractActions(contractAddress: `0x${string}`) {
  const { address: account } = useAccount();
  const { writeContractAsync, isPending } = useWriteContract();
  const publicClient = usePublicClient({ chainId: TARGET_CHAIN_ID });

  const contribute = useCallback(
    async (amountEther: string) => {
      await ensureWalletOnTargetChain();
      const hash = await writeContractAsync({
        address:      contractAddress,
        abi:          CAMPAIGN_ABI,
        functionName: "contribute",
        value:        parseEther(amountEther),
        chainId:      TARGET_CHAIN_ID,
        ...(TARGET_CHAIN_ID === 80002 ? AMOY_GAS_OVERRIDES : {})
      });
      return hash;
    },
    [contractAddress, writeContractAsync]
  );

  const voteOnMilestone = useCallback(
    async (milestoneIndex: number, support: boolean) => {
      await ensureWalletOnTargetChain();
      const args = [BigInt(milestoneIndex), support] as const;
      let gas = VOTE_GAS_FALLBACK;

      if (publicClient && account) {
        try {
          const estimate = await publicClient.estimateContractGas({
            account,
            address: contractAddress,
            abi: CAMPAIGN_ABI,
            functionName: "voteOnMilestone",
            args
          });
          gas = withGasBuffer(estimate);
        } catch {
          gas = VOTE_GAS_FALLBACK;
        }
      }

      const hash = await writeContractAsync({
        address:      contractAddress,
        abi:          CAMPAIGN_ABI,
        functionName: "voteOnMilestone",
        args,
        chainId:      TARGET_CHAIN_ID,
        gas,
        ...(TARGET_CHAIN_ID === 80002 ? AMOY_GAS_OVERRIDES : {})
      });

      if (publicClient) {
        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        if (receipt.status === "reverted") {
          throw new Error("Vote transaction reverted");
        }
      }

      return hash;
    },
    [account, contractAddress, publicClient, writeContractAsync]
  );

  const submitMilestoneProof = useCallback(
    async (milestoneIndex: number, ipfsCid: string) => {
      await ensureWalletOnTargetChain();
      const hash = await writeContractAsync({
        address:      contractAddress,
        abi:          CAMPAIGN_ABI,
        functionName: "submitMilestoneProof",
        args:         [BigInt(milestoneIndex), ipfsCid],
        chainId:      TARGET_CHAIN_ID,
        ...(TARGET_CHAIN_ID === 80002 ? AMOY_GAS_OVERRIDES : {})
      });
      return hash;
    },
    [contractAddress, writeContractAsync]
  );

  const executeTranche = useCallback(
    async (milestoneIndex: number) => {
      await ensureWalletOnTargetChain();
      const hash = await writeContractAsync({
        address:      contractAddress,
        abi:          CAMPAIGN_ABI,
        functionName: "executeTranche",
        args:         [BigInt(milestoneIndex)],
        chainId:      TARGET_CHAIN_ID,
        ...(TARGET_CHAIN_ID === 80002 ? AMOY_GAS_OVERRIDES : {})
      });

      if (publicClient) {
        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        if (receipt.status === "reverted") {
          throw new Error("Payout transaction reverted");
        }
      }

      return hash;
    },
    [contractAddress, publicClient, writeContractAsync]
  );

  return { contribute, voteOnMilestone, submitMilestoneProof, executeTranche, isPending };
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

      let hash;
      try {
        await ensureWalletOnTargetChain();
        hash = await writeContractAsync({
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
        ...(TARGET_CHAIN_ID === 80002 ? AMOY_GAS_OVERRIDES : {})
        });
      } catch (err) {
        console.error('Factory deploy failed:', err);
        // Surface a helpful error to the caller
        throw new Error(err instanceof Error ? err.message : 'Factory deployment failed');
      }

      setTxHash(hash);
      return hash;
    },
    [writeContractAsync]
  );

  const { isLoading: isConfirming } = useWaitForTransactionReceipt({ hash: txHash });

  return { deployCampaign, isDeploying, isConfirming, factoryConfigured };
}
