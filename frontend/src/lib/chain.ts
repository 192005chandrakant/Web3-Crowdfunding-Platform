import { polygonAmoy, polygon } from "wagmi/chains";

/**
 * The chain the app targets by default.
 * Override via VITE_TARGET_CHAIN_ID env var.
 */
export const TARGET_CHAIN_ID: number =
  Number(import.meta.env.VITE_TARGET_CHAIN_ID) || polygonAmoy.id;

export function getChainLabel(chainId: number): string {
  switch (chainId) {
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
    case polygon.id:
      return "https://polygonscan.com";
    case polygonAmoy.id:
      return "https://amoy.polygonscan.com";
    default:
      return "https://polygonscan.com";
  }
}

export function getTxUrl(chainId: number, txHash: string): string {
  return `${getExplorerUrl(chainId)}/tx/${txHash}`;
}

export function getAddressUrl(chainId: number, address: string): string {
  return `${getExplorerUrl(chainId)}/address/${address}`;
}
