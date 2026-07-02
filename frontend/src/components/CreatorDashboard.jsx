const React = require("react");

function CreatorDashboard({ onUploadProof, onCreateCampaign }) {
  const [file, setFile] = React.useState(null);
  const [campaignTitle, setCampaignTitle] = React.useState("");
  const [milestoneTitle, setMilestoneTitle] = React.useState("");

  async function handleUpload() {
    if (!file || !onUploadProof) {
      return;
    }

    await onUploadProof(file);
  }

  async function handleCreateCampaign() {
    if (!onCreateCampaign) {
      return;
    }

    await onCreateCampaign({ campaignTitle, milestoneTitle });
  }

  return React.createElement(
    "section",
    { className: "rounded-3xl border border-cyan-400/15 bg-slate-950/70 p-6 shadow-glow" },
    React.createElement("p", { className: "text-xs uppercase tracking-[0.3em] text-cyan-300/80" }, "Creator Dashboard"),
    React.createElement("h3", { className: "mt-2 font-display text-2xl font-semibold text-white" }, "Submit proofs and manage milestone release flow"),
    React.createElement(
      "div",
      { className: "mt-6 grid gap-4 md:grid-cols-2" },
      React.createElement(
        "label",
        { className: "space-y-2 rounded-2xl border border-white/10 bg-white/5 p-4" },
        React.createElement("span", { className: "block text-sm font-medium text-slate-200" }, "Campaign title"),
        React.createElement("input", {
          value: campaignTitle,
          onChange: (event) => setCampaignTitle(event.target.value),
          className: "w-full rounded-xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-white outline-none ring-0 placeholder:text-slate-500 focus:border-cyan-400/50",
          placeholder: "Seed round campaign"
        })
      ),
      React.createElement(
        "label",
        { className: "space-y-2 rounded-2xl border border-white/10 bg-white/5 p-4" },
        React.createElement("span", { className: "block text-sm font-medium text-slate-200" }, "Milestone title"),
        React.createElement("input", {
          value: milestoneTitle,
          onChange: (event) => setMilestoneTitle(event.target.value),
          className: "w-full rounded-xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-white outline-none ring-0 placeholder:text-slate-500 focus:border-magenta-400/50",
          placeholder: "Prototype delivery"
        })
      )
    ),
    React.createElement(
      "div",
      { className: "mt-4 rounded-2xl border border-white/10 bg-white/5 p-4" },
      React.createElement("input", {
        type: "file",
        onChange: (event) => setFile(event.target.files?.[0] || null),
        className: "block w-full text-sm text-slate-300 file:mr-4 file:rounded-full file:border-0 file:bg-cyan-400 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-slate-950 hover:file:bg-cyan-300"
      }),
      React.createElement(
        "div",
        { className: "mt-4 flex flex-wrap gap-3" },
        React.createElement(
          "button",
          {
            type: "button",
            onClick: handleUpload,
            className: "rounded-full bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
          },
          "Upload Proof to IPFS"
        ),
        React.createElement(
          "button",
          {
            type: "button",
            onClick: handleCreateCampaign,
            className: "rounded-full border border-magenta-400/30 px-4 py-2 text-sm font-semibold text-magenta-200 transition hover:bg-magenta-400/10"
          },
          "Register Campaign"
        )
      )
    )
  );
}

module.exports = { CreatorDashboard };