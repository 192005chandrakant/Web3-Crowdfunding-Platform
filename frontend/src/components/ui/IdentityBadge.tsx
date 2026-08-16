import clsx from "clsx";
import { Building2, User } from "lucide-react";
import { Tooltip } from "./Tooltip";

export type IdentityType = "organization" | "human";

interface IdentityBadgeProps {
  type: IdentityType;
  name?: string;
  className?: string;
  showTooltip?: boolean;
}

const config: Record<
  IdentityType,
  { icon: React.ComponentType<{ className?: string }>; label: string; classes: string; tooltip: string }
> = {
  organization: {
    icon: Building2,
    label: "Verified Org",
    classes:
      "border-warning-500/40 dark:border-warning-500/30 bg-warning-500/10 text-warning-400",
    tooltip:
      "This organization has been verified by MilestoneChain. Identity documents and legal registration have been reviewed."
  },
  human: {
    icon: User,
    label: "Verified Human",
    classes:
      "border-blockchain-500/30 bg-blockchain-500/10 text-blockchain-400",
    tooltip:
      "This individual has been verified through World ID or Gitcoin Passport, confirming unique human identity."
  }
};

export function IdentityBadge({
  type,
  name,
  className,
  showTooltip = false
}: IdentityBadgeProps) {
  const { icon: Icon, label, classes, tooltip } = config[type];

  const badge = (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1",
        "text-[11px] font-semibold uppercase tracking-wide",
        classes,
        className
      )}
    >
      <Icon className="h-3 w-3 shrink-0" aria-hidden="true" />
      {name ?? label}
    </span>
  );

  if (showTooltip) {
    return (
      <Tooltip content={tooltip} placement="bottom">
        {badge}
      </Tooltip>
    );
  }

  return badge;
}
