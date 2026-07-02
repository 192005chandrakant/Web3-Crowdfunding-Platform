const React = require("react");
const { WagmiProvider } = require("wagmi");
const { QueryClient, QueryClientProvider } = require("@tanstack/react-query");
const { wagmiConfig } = require("../lib/wagmi");

const queryClient = new QueryClient();

function Web3Provider({ children }) {
  return React.createElement(
    WagmiProvider,
    { config: wagmiConfig },
    React.createElement(QueryClientProvider, { client: queryClient }, children)
  );
}

module.exports = { Web3Provider };