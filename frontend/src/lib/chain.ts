/**
 * Chain configuration — Strategy Pattern
 * ────────────────────────────────────────
 * TARGET_CHAIN_ID is driven by VITE_BLOCKCHAIN_MODE:
 *   rpc   → 80002 (Polygon Amoy via Alchemy) — default
 *   local → reads VITE_LOCAL_CHAIN_ID, falls back to 1337
 */
import { defineChain } from "viem";
import { polygonAmoy, polygon } from "wagmi/chains";

const blockchainMode = import.meta.env.VITE_BLOCKCHAIN_MODE || "rpc";
const isLocalMode    = blockchainMode === "local";

// In local mode, use VITE_LOCAL_CHAIN_ID (default 1337)
// In rpc  mode, always use 80002 (Polygon Amoy)
export const TARGET_CHAIN_ID: number = isLocalMode
  ? (Number(import.meta.env.VITE_LOCAL_CHAIN_ID) || 1337)
  : 80002;

const ganacheChainId = Number(import.meta.env.VITE_LOCAL_CHAIN_ID) || 1337;
const ganacheRpcUrl  = import.meta.env.VITE_GANACHE_RPC_URL || "http://127.0.0.1:7545";

export const ganacheLocal = defineChain({
  id: ganacheChainId,
  name: "Local Ganache",
  nativeCurrency: {
    decimals: 18,
    name:     "MATIC",
    symbol:   "MATIC"
  },
  rpcUrls: {
    default: { http: [ganacheRpcUrl] }
  }
});

export function getChainLabel(chainId: number): string {
  if (chainId === polygonAmoy.id) {
    return isLocalMode ? "Local Ganache (Amoy fork)" : "Polygon Amoy Testnet";
  }
  if (chainId === 1337 || chainId === 31337 || chainId === 5777) {
    return "Local Ganache";
  }
  if (chainId === polygon.id) {
    return "Polygon Mainnet";
  }
  if (chainId === 1) {
    return "Ethereum Mainnet";
  }
  if (chainId === 11155111) {
    return "Sepolia Testnet";
  }
  if (isLocalMode && chainId === ganacheLocal.id) {
    return "Local Ganache";
  }
  return `Chain ${chainId}`;
}

export function getTargetChainMetadata() {
  const isAmoy = TARGET_CHAIN_ID === 80002;
  return {
    chainIdHex: `0x${TARGET_CHAIN_ID.toString(16)}`,
    chainName: isAmoy ? "Polygon Amoy Testnet" : `Local Ganache (${TARGET_CHAIN_ID})`,
    nativeCurrency: isAmoy
      ? { name: "POL", symbol: "POL", decimals: 18 }
      : { name: "ETH", symbol: "ETH", decimals: 18 },
    rpcUrls: isAmoy
      ? [import.meta.env.VITE_ALCHEMY_RPC_URL || "https://rpc-amoy.polygon.technology"]
      : [import.meta.env.VITE_GANACHE_RPC_URL || "http://127.0.0.1:7545"],
    blockExplorerUrls: isAmoy ? ["https://amoy.polygonscan.com"] : []
  };
}

export function getExplorerUrl(chainId: number): string {
  switch (chainId) {
    case ganacheLocal.id: return "";
    case polygon.id:      return "https://polygonscan.com";
    case polygonAmoy.id:  return "https://amoy.polygonscan.com";
    default:              return "https://amoy.polygonscan.com";
  }
}

export function getTxUrl(chainId: number, txHash: string): string {
  const base = getExplorerUrl(chainId);
  return base ? `${base}/tx/${txHash}` : "#";
}

export function getAddressUrl(chainId: number, address: string): string {
  const base = getExplorerUrl(chainId);
  return base ? `${base}/address/${address}` : "#";
}
