import {
  Lock,
  Play,
  Eye,
  Vote,
  CheckCircle2,
  XCircle,
  ArrowUpCircle,
  Star,
  Clock,
  Zap,
  AlertTriangle,
  PauseCircle
} from "lucide-react";
import clsx from "clsx";

export type MilestoneStatus =
  | "locked"
  | "in-progress"
  | "under-review"
  | "voting"
  | "approved"
  | "rejected"
  | "funds-released"
  | "completed"
  | "active"
  | "confirmed"
  | "pending"
  | "paused"
  | "draft"
  | "suspended"
  | "cancelled"
  | "failed"
  | string;

interface StatusConfig {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  classes: string;
}

const STATUS_CONFIG: Record<string, StatusConfig> = {
  "locked": {
    label: "Locked",
    icon: Lock,
    classes: "bg-slate-700/50 text-slate-400 border-slate-600/40"
  },
  "in-progress": {
    label: "In Progress",
    icon: Play,
    classes: "bg-blockchain-500/15 text-blockchain-300 border-blockchain-500/25"
  },
  "under-review": {
    label: "Under Review",
    icon: Eye,
    classes: "bg-warning-500/15 text-warning-400 border-warning-500/25"
  },
  "voting": {
    label: "Voting",
    icon: Vote,
    classes: "bg-secondary-500/15 text-secondary-300 border-secondary-500/25"
  },
  "approved": {
    label: "Approved",
    icon: CheckCircle2,
    classes: "bg-success-500/15 text-success-400 border-success-500/25"
  },
  "rejected": {
    label: "Rejected",
    icon: XCircle,
    classes: "bg-danger-500/15 text-danger-400 border-danger-500/25"
  },
  "funds-released": {
    label: "Funds Released",
    icon: ArrowUpCircle,
    classes: "bg-primary-500/15 text-primary-300 border-primary-500/25"
  },
  "completed": {
    label: "Completed",
    icon: Star,
    classes: "bg-success-600/20 text-success-300 border-success-500/30"
  },
  // Campaign & Donation extended statuses
  "active": {
    label: "Active Vault",
    icon: Zap,
    classes: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
  },
  "confirmed": {
    label: "Confirmed",
    icon: CheckCircle2,
    classes: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25"
  },
  "pending": {
    label: "Pending",
    icon: Clock,
    classes: "bg-amber-500/15 text-amber-400 border-amber-500/25 animate-pulse"
  },
  "paused": {
    label: "Paused",
    icon: PauseCircle,
    classes: "bg-slate-700/60 text-slate-300 border-slate-500/40"
  },
  "draft": {
    label: "Draft",
    icon: Lock,
    classes: "bg-slate-800 text-slate-400 border-slate-700/60"
  },
  "suspended": {
    label: "Suspended",
    icon: AlertTriangle,
    classes: "bg-rose-500/20 text-rose-400 border-rose-500/30"
  },
  "cancelled": {
    label: "Cancelled",
    icon: XCircle,
    classes: "bg-rose-500/15 text-rose-400 border-rose-500/25"
  },
  "failed": {
    label: "Failed",
    icon: XCircle,
    classes: "bg-rose-600/20 text-rose-400 border-rose-500/30"
  }
};

interface StatusChipProps {
  status: MilestoneStatus;
  className?: string;
  /** Show animated pulse dot for active states */
  animated?: boolean;
}

export function StatusChip({ status, className, animated = false }: StatusChipProps) {
  const normalizedStatus = typeof status === "string" ? status.toLowerCase() : "active";
  const config: StatusConfig = STATUS_CONFIG[normalizedStatus] || {
    label: status ? String(status).charAt(0).toUpperCase() + String(status).slice(1).replace(/-/g, " ") : "Active",
    icon: CheckCircle2,
    classes: "bg-primary-500/15 text-primary-300 border-primary-500/25"
  };
  const Icon = config.icon || CheckCircle2;
  const isActive = normalizedStatus === "in-progress" || normalizedStatus === "voting" || normalizedStatus === "active";

  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold whitespace-nowrap transition-colors",
        config.classes,
        className
      )}
      role="status"
      aria-label={`Status: ${config.label}`}
    >
      {animated && isActive ? (
        <span className="relative flex h-1.5 w-1.5 shrink-0" aria-hidden="true">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-60" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-current" />
        </span>
      ) : (
        <Icon className="h-3 w-3 shrink-0" aria-hidden="true" />
      )}
      <span>{config.label}</span>
    </span>
  );
}

