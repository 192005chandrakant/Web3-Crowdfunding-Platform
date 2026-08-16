/**
 * QVPowerExplainer — Interactive educational component
 *
 * Shows users how quadratic voting works with:
 * - Live slider: "If I donate X POL, my voting power is Y"
 * - 4 test case cards from the algorithm spec
 * - Sybil attack defense explanation
 * - Minimum threshold info
 */

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Shield, Zap, Users, AlertTriangle } from "lucide-react";
import { GlassCard } from "@/components/ui";
import { computeQVDisplay, MIN_CONTRIBUTION_POL } from "@/hooks/useQuadraticVoting";

interface QVPowerExplainerProps {
  currentDonationPOL?: number;
  className?: string;
  /** Compact mode — shows only the slider, not the full test cases */
  compact?: boolean;
}

const TEST_CASES = [
  {
    id: "broad_base",
    icon: "👥",
    title: "The Broad Base Wins",
    tagline: "Community consensus beats whale influence",
    color: "emerald",
    gradient: "from-emerald-500/20 to-teal-500/10",
    border: "border-emerald-500/30",
    scenario: "Both groups raise $5,000 total. Who wins the vote?",
    groups: [
      {
        label: "Group A (Dedicated Few)",
        detail: "50 people × 100 POL each",
        power: "50 × √100 = 500 QV votes",
        highlight: false
      },
      {
        label: "Group B (Broad Base)",
        detail: "500 people × 10 POL each",
        power: "500 × √10 ≈ 1,580 QV votes",
        highlight: true
      }
    ],
    result: "Group B wins despite equal total funding. Quadratic voting favors breadth over depth.",
    won: "Group B"
  },
  {
    id: "sybil",
    icon: "🛡️",
    title: "Sybil Attack Defense",
    tagline: "Fake wallets can't fake human identity",
    color: "blue",
    gradient: "from-blue-500/20 to-cyan-500/10",
    border: "border-blue-500/30",
    scenario: "A whale tries to create 100 fake wallets to multiply their votes.",
    groups: [
      {
        label: "100 Fake Wallets (no identity)",
        detail: "100 × 50 POL = 5,000 POL total",
        power: "100 × √50 = 707 votes (BLOCKED)",
        highlight: false
      },
      {
        label: "After Sybil Defense",
        detail: "99 fake wallets rejected by World ID / Gitcoin",
        power: "Only 1 real wallet → √5,000 ≈ 70.7 votes",
        highlight: true
      }
    ],
    result: "The attacker is forced to their real QV power (70.7 votes) instead of 707 fraudulent votes.",
    won: "Defense"
  },
  {
    id: "deciding_whale",
    icon: "🐋",
    title: "The Deciding Whale",
    tagline: "Whales tip close votes but can't override majorities",
    color: "violet",
    gradient: "from-violet-500/20 to-purple-500/10",
    border: "border-violet-500/30",
    scenario: "Community is divided. A large investor holds the tie-breaker.",
    groups: [
      {
        label: "60 supporters (50 POL each)",
        detail: "60 × √50 = 424 QV votes (APPROVE)",
        power: "424 votes",
        highlight: true
      },
      {
        label: "40 opponents (50 POL) + 1 Whale (5,000 POL)",
        detail: "40 × √50 + √5,000 = 282 + 70.7 = 352.7",
        power: "352.7 votes (REJECT)",
        highlight: false
      }
    ],
    result: "Approve wins 424 vs 352.7. The whale's power (70.7) is real but can't override the crowd majority.",
    won: "Approve"
  },
  {
    id: "micro_spam",
    icon: "🚫",
    title: "Micro-Donation Spam Blocked",
    tagline: "Minimum threshold stops penny-spammers",
    color: "orange",
    gradient: "from-orange-500/20 to-amber-500/10",
    border: "border-orange-500/30",
    scenario: "1,000 fake friends donate 0.001 POL each to game the system.",
    groups: [
      {
        label: "1,000 spam donations (0.001 POL each = threshold)",
        detail: "Exactly at minimum → 1,000 × √0.001 = 31.6 votes",
        power: "31.6 votes (minimal impact)",
        highlight: false
      },
      {
        label: "Legitimate investor (1,000 POL)",
        detail: "√1,000 = 31.6 votes",
        power: "31.6 votes — equal to 1,000 spammers!",
        highlight: true
      }
    ],
    result: "Even at 1,000 micro-donations, the spammer equals just one real investor. The minimum threshold filters true spam.",
    won: "Threshold"
  }
];

function TestCaseCard({ testCase }: { testCase: typeof TEST_CASES[0] }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const colorMap: Record<string, string> = {
    emerald: "text-emerald-400",
    blue: "text-blue-400",
    violet: "text-violet-400",
    orange: "text-orange-400"
  };
  const textColor = colorMap[testCase.color] || "text-slate-400";

  return (
    <div
      className={`rounded-xl border ${testCase.border} bg-gradient-to-br ${testCase.gradient} overflow-hidden`}
    >
      <button
        className="w-full p-4 flex items-center justify-between gap-3 text-left"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">{testCase.icon}</span>
          <div>
            <p className={`font-semibold text-sm ${textColor}`}>{testCase.title}</p>
            <p className="text-xs text-slate-400 mt-0.5">{testCase.tagline}</p>
          </div>
        </div>
        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
        </motion.div>
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3 border-t border-white/[0.06] pt-3">
              <p className="text-xs text-slate-300">{testCase.scenario}</p>
              <div className="space-y-2">
                {testCase.groups.map((group, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-lg ${
                      group.highlight
                        ? "bg-white/10 border border-slate-300 dark:border-white/20"
                        : "bg-black/20"
                    }`}
                  >
                    <p className={`text-xs font-semibold ${group.highlight ? textColor : "text-slate-400"}`}>
                      {group.label}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">{group.detail}</p>
                    <p className={`text-xs font-mono mt-1 ${group.highlight ? "text-white" : "text-slate-500"}`}>
                      → {group.power}
                    </p>
                  </div>
                ))}
              </div>
              <div className={`p-2.5 rounded-lg bg-black/30 border ${testCase.border}`}>
                <p className={`text-xs font-semibold ${textColor} mb-0.5`}>Result: {testCase.won} wins</p>
                <p className="text-xs text-slate-400 leading-relaxed">{testCase.result}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function QVPowerExplainer({
  currentDonationPOL = 0,
  className = "",
  compact = false
}: QVPowerExplainerProps) {
  const [sliderValue, setSliderValue] = useState(currentDonationPOL || 1);
  const qvPower = computeQVDisplay(sliderValue);

  return (
    <GlassCard className={`overflow-hidden ${className}`}>
      {/* Header */}
      <div className="p-5 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-violet-500/20">
            <Zap className="w-5 h-5 text-violet-400" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-100">Quadratic Voting Power</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Voting power = √(POL donated) — community-first governance
            </p>
          </div>
        </div>
      </div>

      <div className="p-5 space-y-5">
        {/* Interactive Slider */}
        <div className="p-4 rounded-xl bg-gradient-to-br from-violet-500/10 to-purple-500/5 border border-violet-500/20">
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-medium text-slate-200">
              Donation Amount
            </label>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-white font-mono">{parseFloat(qvPower).toFixed(2)}</span>
              <span className="text-sm text-violet-300">votes</span>
            </div>
          </div>

          <input
            type="range"
            min={MIN_CONTRIBUTION_POL}
            max={1000}
            step={0.1}
            value={sliderValue}
            onChange={(e) => setSliderValue(parseFloat(e.target.value))}
            className="w-full h-2 bg-slate-700 rounded-full appearance-none cursor-pointer accent-violet-500"
          />

          <div className="flex justify-between mt-2">
            <span className="text-xs text-slate-500">{MIN_CONTRIBUTION_POL} POL</span>
            <span className="text-sm font-mono text-violet-300 font-semibold">
              {sliderValue.toFixed(2)} POL
            </span>
            <span className="text-xs text-slate-500">1,000 POL</span>
          </div>

          {/* Formula display */}
          <div className="mt-3 text-center font-mono text-xs text-slate-400">
            √({sliderValue.toFixed(2)}) ={" "}
            <span className="text-violet-300 font-bold text-sm">{parseFloat(qvPower).toFixed(4)}</span>{" "}
            QV votes
          </div>
        </div>

        {/* Key insight */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-xl bg-slate-800/40 text-center">
            <Users className="w-5 h-5 text-cyan-400 mx-auto mb-1" />
            <p className="text-xs text-slate-500">Broad support</p>
            <p className="text-sm font-bold text-cyan-300 mt-0.5">Amplified</p>
          </div>
          <div className="p-3 rounded-xl bg-slate-800/40 text-center">
            <Shield className="w-5 h-5 text-emerald-400 mx-auto mb-1" />
            <p className="text-xs text-slate-500">Whale influence</p>
            <p className="text-sm font-bold text-emerald-300 mt-0.5">Diminished</p>
          </div>
        </div>

        {/* Minimum threshold note */}
        <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-300/80 leading-relaxed">
            <span className="font-semibold text-amber-300">Minimum to vote:</span>{" "}
            {MIN_CONTRIBUTION_POL} POL donation required.
            This prevents micro-donation spam while keeping the bar low for testers.
          </p>
        </div>

        {/* Test cases (not in compact mode) */}
        {!compact && (
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-widest text-slate-500 mb-3">
              Real-World Scenarios
            </p>
            {TEST_CASES.map((tc) => (
              <TestCaseCard key={tc.id} testCase={tc} />
            ))}
          </div>
        )}
      </div>
    </GlassCard>
  );
}
