const React = require("react");
const { WalletConnector } = require("../components/WalletConnector");
const { CreatorDashboard } = require("../components/CreatorDashboard");
const { DonorPortal } = require("../components/DonorPortal");

function HomePage() {
  const campaign = {
    title: "Polygon Builder Grant Round",
    goal: "2,500",
    raised: "1,840",
    milestoneCount: 4
  };

  return React.createElement(
    "main",
    { className: "min-h-screen px-4 py-8 text-white sm:px-6 lg:px-10" },
    React.createElement(
      "div",
      { className: "mx-auto flex max-w-7xl flex-col gap-6" },
      React.createElement(
        "section",
        { className: "rounded-[2rem] border border-white/10 bg-white/5 p-8 shadow-glow backdrop-blur-xl" },
        React.createElement("p", { className: "text-xs uppercase tracking-[0.45em] text-cyan-300/70" }, "Web3 Milestone Crowdfunding"),
        React.createElement("h1", { className: "mt-3 max-w-3xl font-display text-4xl font-bold leading-tight text-white sm:text-5xl" }, "Non-custodial funding rails with milestone votes, proof uploads, and escrow release."),
        React.createElement("p", { className: "mt-4 max-w-3xl text-sm leading-7 text-slate-300 sm:text-base" }, "This frontend is prewired for wallet connection, SIWE authentication, creator proof submission, and donor governance actions against a Polygon-backed escrow system."),
        React.createElement(
          "div",
          { className: "mt-6 grid gap-4 md:grid-cols-3" },
          [
            ["Wallet auth", "Injected wallet and Coinbase Wallet support"],
            ["Proof flow", "IPFS upload entry point for milestone evidence"],
            ["Governance", "Contribution and approval controls for donors"]
          ].map(([title, description]) =>
            React.createElement(
              "div",
              { key: title, className: "rounded-2xl border border-white/10 bg-slate-950/50 p-4" },
              React.createElement("div", { className: "text-sm font-semibold text-cyan-200" }, title),
              React.createElement("div", { className: "mt-2 text-sm text-slate-300" }, description)
            )
          )
        )
      ),
      React.createElement(WalletConnector, {
        onAuthenticated: (payload) => {
          if (typeof window !== "undefined") {
            window.console.info("SIWE authenticated", payload);
          }
        }
      }),
      React.createElement(
        "div",
        { className: "grid gap-6 xl:grid-cols-2" },
        React.createElement(CreatorDashboard, {
          onUploadProof: async (file) => {
            if (typeof window !== "undefined") {
              window.console.info("Upload requested", file.name);
            }
          },
          onCreateCampaign: async (payload) => {
            if (typeof window !== "undefined") {
              window.console.info("Campaign registration requested", payload);
            }
          }
        }),
        React.createElement(DonorPortal, {
          campaign,
          onContribute: async (value) => {
            if (typeof window !== "undefined") {
              window.console.info("Contribution requested", value);
            }
          },
          onVote: async (support, note) => {
            if (typeof window !== "undefined") {
              window.console.info("Vote requested", { support, note });
            }
          }
        })
      )
    )
  );
}

module.exports = HomePage;