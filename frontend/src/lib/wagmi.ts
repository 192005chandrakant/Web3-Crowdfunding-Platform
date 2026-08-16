import { createConfig, http } from "wagmi";
import { injected, coinbaseWallet } from "wagmi/connectors";
import { polygon, polygonAmoy } from "wagmi/chains";
import { ganacheLocal } from "@/lib/chain";

const mainnetRpcUrl = import.meta.env.VITE_POLYGON_MAINNET_RPC_URL || "https://polygon-rpc.com";
const amoyRpcUrl = import.meta.env.VITE_ALCHEMY_RPC_URL || "https://rpc-amoy.polygon.technology";
const ganacheRpcUrl = import.meta.env.VITE_GANACHE_RPC_URL || "http://127.0.0.1:8545";

export const wagmiConfig = createConfig({
  // Prefer local Ganache first for developer convenience
  chains: [ganacheLocal, polygonAmoy, polygon],
  connectors: [
    injected(),
    coinbaseWallet({
      appName: "MilestoneChain"
    })
  ],
  transports: {
    [polygon.id]:      http(mainnetRpcUrl),
    [polygonAmoy.id]:  http(amoyRpcUrl),
    [ganacheLocal.id]: http(ganacheRpcUrl)
  }
});
