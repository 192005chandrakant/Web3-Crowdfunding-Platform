const { createConfig, http } = require("wagmi");
const { injected, coinbaseWallet } = require("wagmi/connectors");
const { polygon, polygonAmoy } = require("wagmi/chains");

const alchemyRpcUrl = process.env.NEXT_PUBLIC_ALCHEMY_RPC_URL || "http://127.0.0.1:8545";

const wagmiConfig = createConfig({
  chains: [polygon, polygonAmoy],
  connectors: [
    injected(),
    coinbaseWallet({
      appName: "Milestone Crowdfunding"
    })
  ],
  transports: {
    [polygon.id]: http(alchemyRpcUrl),
    [polygonAmoy.id]: http(alchemyRpcUrl)
  }
});

module.exports = {
  alchemyRpcUrl,
  wagmiConfig
};