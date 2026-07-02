import { createConfig, http } from "wagmi";
import { injected, coinbaseWallet } from "wagmi/connectors";
import { polygon, polygonAmoy } from "wagmi/chains";

const rpcUrl = process.env.NEXT_PUBLIC_ALCHEMY_RPC_URL || "http://127.0.0.1:7545";

export const wagmiConfig = createConfig({
  chains: [polygon, polygonAmoy],
  connectors: [
    injected(),
    coinbaseWallet({
      appName: "Premium Nebula Crowdfunding"
    })
  ],
  transports: {
    [polygon.id]: http(rpcUrl),
    [polygonAmoy.id]: http(rpcUrl)
  }
});