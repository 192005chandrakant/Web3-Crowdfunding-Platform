import clsx from "clsx";
import {
  ShieldCheck,
  Lock,
  Users,
  LinkIcon,
  BadgeCheck,
  FileSearch,
  Wifi
} from "lucide-react";
import { Tooltip } from "@/components/ui/Tooltip";

export interface TrustData {
  creatorVerified?: boolean;
  identityVerified?: boolean;
  contractAudited?: boolean;
  escrowActive?: boolean;
  communityTrusted?: boolean;
  onChainVerified?: boolean;
  /** Auditor name */
  auditor?: string;
  /** Contract address */
  contractAddress?: string;
  /** Escrow wallet (shortened) */
  escrowWallet?: string;
}

interface TrustBadgeItem {
  key: keyof TrustData;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  tooltip: string;
  activeClasses: string;
  inactiveClasses: string;
}

const TRUST_ITEMS: TrustBadgeItem[] = [
  {
    key: "creatorVerified",
    icon: BadgeCheck,
    label: "Verified Creator",
    tooltip:
      "The campaign creator has completed identity verification. KYC documents have been reviewed and approved.",
    activeClasses:  "border-success-500/35 bg-success-500/10 text-success-400",
    inactiveClasses: "border-slate-700/50 bg-slate-800/40 text-slate-400"
  },
  {
    key: "identityVerified",
    icon: ShieldCheck,
    label: "Identity Verified",
    tooltip:
      "This account is linked to a World ID or Gitcoin Passport, confirming unique human or organization identity.",
    activeClasses:  "border-blockchain-500/35 bg-blockchain-500/10 text-blockchain-400",
    inactiveClasses: "border-slate-700/50 bg-slate-800/40 text-slate-400"
  },
  {
    key: "contractAudited",
    icon: FileSearch,
    label: "Contract Audited",
    tooltip:
      "The smart contract governing this campaign's escrow has been independently audited for security vulnerabilities.",
    activeClasses:  "border-primary-500/35 bg-primary-500/10 text-primary-400",
    inactiveClasses: "border-slate-700/50 bg-slate-800/40 text-slate-400"
  },
  {
    key: "escrowActive",
    icon: Lock,
    label: "Escrow Active",
    tooltip:
      "All donated funds are locked in a smart contract escrow. Funds can only be released when milestones are verified and approved by the community.",
    activeClasses:  "border-warning-500/35 bg-warning-500/10 text-warning-400",
    inactiveClasses: "border-slate-700/50 bg-slate-800/40 text-slate-400"
  },
  {
    key: "communityTrusted",
    icon: Users,
    label: "Community Trusted",
    tooltip:
      "This campaign has received positive community ratings from verified donors based on transparency and communication.",
    activeClasses:  "border-secondary-500/35 bg-secondary-500/10 text-secondary-400",
    inactiveClasses: "border-slate-700/50 bg-slate-800/40 text-slate-400"
  },
  {
    key: "onChainVerified",
    icon: Wifi,
    label: "On-chain Verified",
    tooltip:
      "Campaign data, milestone states, and transactions are recorded on the blockchain and can be independently verified by anyone.",
    activeClasses:  "border-success-500/35 bg-success-500/10 text-success-300",
    inactiveClasses: "border-slate-700/50 bg-slate-800/40 text-slate-400"
  }
];

interface TrustIndicatorsProps {
  trust: TrustData;
  className?: string;
  /** Compact row layout for card footers */
  compact?: boolean;
}

export function TrustIndicators({ trust, className, compact = false }: TrustIndicatorsProps) {
  return (
    <div className={clsx("space-y-3", className)}>
      {!compact && (
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">
            Trust & Verification
          </p>
          {/* Score bar */}
          <div className="flex items-center gap-2">
            {TRUST_ITEMS.map((item) => {
              const active = !!trust[item.key];
              return (
                <div
                  key={item.key}
                  className={clsx(
                    "h-1.5 flex-1 rounded-full transition-colors",
                    active ? "bg-success-500" : "bg-slate-800"
                  )}
                  aria-hidden="true"
                />
              );
            })}
            <span className="shrink-0 text-xs font-semibold text-slate-400">
              {TRUST_ITEMS.filter((i) => !!trust[i.key]).length}/{TRUST_ITEMS.length}
            </span>
          </div>
        </div>
      )}

      <div className={clsx("flex flex-wrap gap-2", compact && "gap-1.5")}>
        {TRUST_ITEMS.map((item) => {
          const active = !!trust[item.key];
          const Icon = item.icon;

          return (
            <Tooltip key={item.key} content={item.tooltip} placement="top">
              <span
                className={clsx(
                  "inline-flex items-center gap-1.5 rounded-full border font-medium transition-colors",
                  compact ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs",
                  active ? item.activeClasses : item.inactiveClasses,
                  !active && "opacity-50"
                )}
                aria-label={`${item.label}: ${active ? "verified" : "not verified"}`}
              >
                <Icon
                  className={compact ? "h-3 w-3" : "h-3.5 w-3.5"}
                  aria-hidden="true"
                />
                {item.label}
              </span>
            </Tooltip>
          );
        })}
      </div>

      {/* Contract / Escrow meta (full mode only) */}
      {!compact && (trust.contractAddress || trust.escrowWallet) && (
        <div className="space-y-2 rounded-xl border border-white/[0.06] bg-slate-900/50 p-3 text-[11px]">
          {trust.contractAddress && (
            <div className="flex items-center justify-between gap-3">
              <span className="text-slate-500 flex items-center gap-1.5">
                <LinkIcon className="h-3 w-3" aria-hidden="true" />
                Contract
              </span>
              <code className="font-mono text-slate-400 truncate max-w-[180px]">
                {trust.contractAddress}
              </code>
            </div>
          )}
          {trust.escrowWallet && (
            <div className="flex items-center justify-between gap-3">
              <span className="text-slate-500 flex items-center gap-1.5">
                <Lock className="h-3 w-3" aria-hidden="true" />
                Escrow
              </span>
              <code className="font-mono text-slate-400 truncate max-w-[180px]">
                {trust.escrowWallet}
              </code>
            </div>
          )}
          {trust.auditor && (
            <div className="flex items-center justify-between gap-3">
              <span className="text-slate-500 flex items-center gap-1.5">
                <FileSearch className="h-3 w-3" aria-hidden="true" />
                Audited by
              </span>
              <span className="text-slate-300 font-medium">{trust.auditor}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
