/**
 * Wagmi Multi-Provider Configuration — Strategy Pattern
 * ──────────────────────────────────────────────────────
 * VITE_BLOCKCHAIN_MODE=local  → MetaMask connects to local Ganache
 * VITE_BLOCKCHAIN_MODE=rpc    → MetaMask connects to Polygon Amoy via Alchemy (default)
 */
import { createConfig, http } from "wagmi";
import { injected, coinbaseWallet, walletConnect } from "wagmi/connectors";
import { polygon, polygonAmoy } from "wagmi/chains";
import { ganacheLocal } from "@/lib/chain";

const blockchainMode = import.meta.env.VITE_BLOCKCHAIN_MODE || "rpc";
const isLocalMode    = blockchainMode === "local";

// RPC URLs
const amoyRpcUrl    = import.meta.env.VITE_ALCHEMY_RPC_URL || "https://rpc-amoy.polygon.technology";
const ganacheRpcUrl = import.meta.env.VITE_GANACHE_RPC_URL || "http://127.0.0.1:7545";
const mainnetRpcUrl = import.meta.env.VITE_POLYGON_MAINNET_RPC_URL || "https://polygon-rpc.com";

// Chains: in local mode Ganache is primary; in rpc mode Amoy is primary
const chains = isLocalMode
  ? ([ganacheLocal, polygonAmoy, polygon] as const)
  : ([polygonAmoy, ganacheLocal, polygon] as const);

export const wagmiConfig = createConfig({
  chains,
  connectors: [
    injected(),
    coinbaseWallet({ appName: "MilestoneChain" })
  ],
  transports: {
    [polygon.id]:      http(mainnetRpcUrl),
    [polygonAmoy.id]:  http(amoyRpcUrl),
    [ganacheLocal.id]: http(ganacheRpcUrl)
  }
});

export { isLocalMode, blockchainMode };
