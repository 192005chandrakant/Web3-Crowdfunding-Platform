import type { ReactNode } from "react";
import clsx from "clsx";

export type BadgeVariant =
  | "default"
  | "primary"
  | "secondary"
  | "blockchain"
  | "success"
  | "warning"
  | "danger"
  | "outline";

export type BadgeSize = "sm" | "md";

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  className?: string;
  dot?: boolean;
}

const variantStyles: Record<BadgeVariant, string> = {
  default:    "bg-slate-700/60 text-slate-300 border-slate-600/40",
  primary:    "bg-primary-500/15 text-primary-300 border-primary-500/25",
  secondary:  "bg-secondary-500/15 text-secondary-300 border-secondary-500/25",
  blockchain: "bg-blockchain-500/15 text-blockchain-300 border-blockchain-500/25",
  success:    "bg-success-500/15 text-success-400 border-success-500/25",
  warning:    "bg-warning-500/15 text-warning-400 border-warning-500/25",
  danger:     "bg-danger-500/15 text-danger-400 border-danger-500/25",
  outline:    "bg-transparent text-slate-400 border-slate-600/60"
};

const dotColors: Record<BadgeVariant, string> = {
  default:    "bg-slate-400",
  primary:    "bg-primary-400",
  secondary:  "bg-secondary-400",
  blockchain: "bg-blockchain-400",
  success:    "bg-success-400",
  warning:    "bg-warning-400",
  danger:     "bg-danger-400",
  outline:    "bg-slate-400"
};

const sizeStyles: Record<BadgeSize, string> = {
  sm: "px-2 py-0.5 text-[10px]",
  md: "px-2.5 py-1 text-xs"
};

export function Badge({
  children,
  variant = "default",
  size = "md",
  className,
  dot = false
}: BadgeProps) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full border font-medium",
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
    >
      {dot && (
        <span
          className={clsx("h-1.5 w-1.5 rounded-full shrink-0", dotColors[variant])}
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  );
}
