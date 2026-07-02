const React = require("react");
const { SiweMessage } = require("siwe");
const { useAccount, useConnect, useDisconnect, useSignMessage, useChainId } = require("wagmi");

function WalletConnector({ onAuthenticated }) {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { connectors, connectAsync, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { signMessageAsync, isPending: isSigning } = useSignMessage();

  async function handleSignIn() {
    if (!address) {
      return;
    }

    const domain = typeof window !== "undefined" ? window.location.host : "localhost";
    const uri = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
    const message = new SiweMessage({
      domain,
      address,
      statement: "Sign in to the milestone crowdfunding platform.",
      uri,
      version: "1",
      chainId: chainId || 137,
      nonce: String(Date.now())
    });

    const preparedMessage = message.prepareMessage();
    const signature = await signMessageAsync({ message: preparedMessage });

    if (onAuthenticated) {
      onAuthenticated({ message: preparedMessage, signature, address });
    }
  }

  return React.createElement(
    "section",
    { className: "rounded-3xl border border-white/10 bg-white/5 p-6 shadow-glow backdrop-blur-xl" },
    React.createElement(
      "div",
      { className: "flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between" },
      React.createElement("div", null, [
        React.createElement("p", { key: "label", className: "text-xs uppercase tracking-[0.3em] text-cyan-300/80" }, "Wallet Access"),
        React.createElement("h2", { key: "title", className: "mt-2 font-display text-2xl font-semibold text-white" }, "Connect, authenticate, and sign with SIWE")
      ]),
      React.createElement(
        "div",
        { className: "flex flex-wrap gap-3" },
        isConnected
          ? React.createElement(
              React.Fragment,
              null,
              React.createElement(
                "button",
                {
                  type: "button",
                  onClick: handleSignIn,
                  disabled: isSigning,
                  className: "rounded-full bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
                },
                isSigning ? "Signing..." : "Sign In"
              ),
              React.createElement(
                "button",
                {
                  type: "button",
                  onClick: () => disconnect(),
                  className: "rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-white transition hover:border-white/30 hover:bg-white/5"
                },
                "Disconnect"
              )
            )
          : connectors.map((connector) =>
              React.createElement(
                "button",
                {
                  key: connector.uid,
                  type: "button",
                  onClick: () => connectAsync({ connector }),
                  disabled: isPending,
                  className: "rounded-full border border-magenta-400/30 bg-magenta-400/10 px-4 py-2 text-sm font-semibold text-magenta-200 transition hover:bg-magenta-400/20 disabled:cursor-not-allowed disabled:opacity-60"
                },
                `Connect ${connector.name}`
              )
            )
      )
    ),
    React.createElement(
      "div",
      { className: "mt-6 rounded-2xl border border-white/10 bg-slate-950/40 p-4 text-sm text-slate-300" },
      isConnected
        ? `Connected as ${address}`
        : "No wallet connected yet. Use an injected wallet or Coinbase Wallet to start the SIWE flow."
    )
  );
}

module.exports = { WalletConnector };