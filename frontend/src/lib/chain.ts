import { defineChain } from "viem";
import { polygonAmoy, polygon } from "wagmi/chains";

const configuredTargetChainId = Number(
  import.meta.env.VITE_TARGET_CHAIN_ID || import.meta.env.VITE_CHAIN_ID
) || 1337;

export const ganacheLocal = defineChain({
  id: configuredTargetChainId,
  name: "Local Ganache",
  nativeCurrency: {
    decimals: 18,
    name: "MATIC",
    symbol: "MATIC"
  },
  rpcUrls: {
    default: {
      http: [import.meta.env.VITE_GANACHE_RPC_URL || "http://127.0.0.1:8545"]
    }
  }
});

/**
 * The chain the app targets by default.
 * Override via VITE_TARGET_CHAIN_ID env var.
 */
export const TARGET_CHAIN_ID: number =
  configuredTargetChainId;

export function getChainLabel(chainId: number): string {
  switch (chainId) {
    case ganacheLocal.id:
      return "Local Ganache";
    case polygon.id:
      return "Polygon Mainnet";
    case polygonAmoy.id:
      return "Polygon Amoy";
    default:
      return `Chain ${chainId}`;
  }
}

export function getExplorerUrl(chainId: number): string {
  switch (chainId) {
    case ganacheLocal.id:
      return "";
    case polygon.id:
      return "https://polygonscan.com";
    case polygonAmoy.id:
      return "https://amoy.polygonscan.com";
    default:
      return "https://polygonscan.com";
  }
}

export function getTxUrl(chainId: number, txHash: string): string {
  const explorerUrl = getExplorerUrl(chainId);
  return explorerUrl ? `${explorerUrl}/tx/${txHash}` : "#";
}

export function getAddressUrl(chainId: number, address: string): string {
  const explorerUrl = getExplorerUrl(chainId);
  return explorerUrl ? `${explorerUrl}/address/${address}` : "#";
}
