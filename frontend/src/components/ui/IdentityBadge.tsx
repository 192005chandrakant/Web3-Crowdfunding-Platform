import type { ReactNode } from "react";
import clsx from "clsx";

export type IdentityType = "organization" | "human";

interface IdentityBadgeProps {
  type: IdentityType;
  className?: string;
}

function ShieldIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current">
      <path d="M12 2 4 5v6c0 5 3.3 9.7 8 11 4.7-1.3 8-6 8-11V5l-8-3Zm0 4.1 4.8 1.8v3.2c0 3.7-2.2 7.1-4.8 8.3-2.6-1.2-4.8-4.6-4.8-8.3V7.9L12 6.1Z" />
    </svg>
  );
}

function HumanIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current">
      <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm0 2c-4.4 0-8 2.2-8 5v1h16v-1c0-2.8-3.6-5-8-5Z" />
    </svg>
  );
}

export function IdentityBadge({ type, className }: IdentityBadgeProps) {
  const isOrg = type === "organization";

  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold tracking-[0.18em] uppercase backdrop-blur-xl",
        isOrg
          ? "border-[#F5D06F]/30 bg-[#F5D06F]/10 text-[#F5D06F] shadow-[0_0_18px_rgba(245,208,111,0.22)]"
          : "border-[#00F0FF]/25 bg-[#00F0FF]/10 text-[#00F0FF] shadow-[0_0_18px_rgba(0,240,255,0.2)]",
        className
      )}
    >
      {isOrg ? <ShieldIcon /> : <HumanIcon />}
      {isOrg ? "Verified Org" : "Verified Human"}
    </span>
  );
}