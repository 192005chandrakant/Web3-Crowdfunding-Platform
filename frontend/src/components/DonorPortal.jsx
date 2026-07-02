const React = require("react");

function DonorPortal({ campaign, onContribute, onVote }) {
  const [amount, setAmount] = React.useState("");
  const [voteNote, setVoteNote] = React.useState("");

  return React.createElement(
    "section",
    { className: "rounded-3xl border border-magenta-400/15 bg-white/5 p-6 shadow-glow backdrop-blur-xl" },
    React.createElement("p", { className: "text-xs uppercase tracking-[0.3em] text-magenta-200/80" }, "Donor Portal"),
    React.createElement("h3", { className: "mt-2 font-display text-2xl font-semibold text-white" }, campaign.title),
    React.createElement(
      "div",
      { className: "mt-5 grid gap-4 sm:grid-cols-3" },
      React.createElement("div", { className: "rounded-2xl border border-white/10 bg-slate-950/50 p-4" }, [
        React.createElement("div", { key: "label", className: "text-xs uppercase tracking-[0.25em] text-slate-400" }, "Goal"),
        React.createElement("div", { key: "value", className: "mt-2 text-lg font-semibold text-white" }, `${campaign.goal} MATIC`)
      ]),
      React.createElement("div", { className: "rounded-2xl border border-white/10 bg-slate-950/50 p-4" }, [
        React.createElement("div", { key: "label", className: "text-xs uppercase tracking-[0.25em] text-slate-400" }, "Raised"),
        React.createElement("div", { key: "value", className: "mt-2 text-lg font-semibold text-cyan-300" }, `${campaign.raised} MATIC`)
      ]),
      React.createElement("div", { className: "rounded-2xl border border-white/10 bg-slate-950/50 p-4" }, [
        React.createElement("div", { key: "label", className: "text-xs uppercase tracking-[0.25em] text-slate-400" }, "Milestones"),
        React.createElement("div", { key: "value", className: "mt-2 text-lg font-semibold text-magenta-200" }, `${campaign.milestoneCount}`)
      ])
    ),
    React.createElement(
      "div",
      { className: "mt-6 grid gap-4 md:grid-cols-[1fr_auto]" },
      React.createElement(
        "label",
        { className: "space-y-2 rounded-2xl border border-white/10 bg-white/5 p-4" },
        React.createElement("span", { className: "block text-sm font-medium text-slate-200" }, "Contribution amount (MATIC)"),
        React.createElement("input", {
          value: amount,
          onChange: (event) => setAmount(event.target.value),
          className: "w-full rounded-xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-400/50",
          placeholder: "0.25"
        })
      ),
      React.createElement(
        "button",
        {
          type: "button",
          onClick: () => onContribute && onContribute(amount),
          className: "mt-auto rounded-full bg-magenta-400 px-5 py-3 text-sm font-semibold text-white transition hover:bg-magenta-300"
        },
        "Contribute"
      )
    ),
    React.createElement(
      "div",
      { className: "mt-4 rounded-2xl border border-white/10 bg-white/5 p-4" },
      React.createElement("label", { className: "space-y-2" }, [
        React.createElement("span", { key: "label", className: "block text-sm font-medium text-slate-200" }, "Vote note"),
        React.createElement("input", {
          key: "input",
          value: voteNote,
          onChange: (event) => setVoteNote(event.target.value),
          className: "w-full rounded-xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-magenta-400/50",
          placeholder: "Approve milestone 1"
        })
      ]),
      React.createElement(
        "div",
        { className: "mt-4 flex flex-wrap gap-3" },
        React.createElement(
          "button",
          {
            type: "button",
            onClick: () => onVote && onVote(true, voteNote),
            className: "rounded-full border border-cyan-400/40 px-4 py-2 text-sm font-semibold text-cyan-200 transition hover:bg-cyan-400/10"
          },
          "Support"
        ),
        React.createElement(
          "button",
          {
            type: "button",
            onClick: () => onVote && onVote(false, voteNote),
            className: "rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/5"
          },
          "Reject"
        )
      )
    )
  );
}

module.exports = { DonorPortal };