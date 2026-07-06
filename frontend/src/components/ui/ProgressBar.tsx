import { motion, useReducedMotion } from "framer-motion";
import clsx from "clsx";

export type ProgressVariant = "primary" | "success" | "warning" | "danger" | "blockchain";

interface ProgressBarProps {
  value: number;
  label?: string;
  /** Show numeric percentage */
  showValue?: boolean;
  variant?: ProgressVariant;
  size?: "sm" | "md" | "lg";
  className?: string;
  animated?: boolean;
}

const variantStyles: Record<ProgressVariant, string> = {
  primary:    "from-primary-500 to-secondary-500",
  success:    "from-success-500 to-success-400",
  warning:    "from-warning-500 to-warning-400",
  danger:     "from-danger-500 to-danger-400",
  blockchain: "from-blockchain-500 to-primary-500"
};

const sizeStyles = {
  sm: "h-1.5",
  md: "h-2",
  lg: "h-3"
};

export function ProgressBar({
  value,
  label,
  showValue = false,
  variant = "primary",
  size = "md",
  className,
  animated = true
}: ProgressBarProps) {
  const clampedValue = Math.min(100, Math.max(0, value));
  const prefersReducedMotion = useReducedMotion();

  return (
    <div className={clsx("space-y-1.5", className)}>
      {(label != null || showValue) && (
        <div className="flex items-center justify-between">
          {label && (
            <span className="text-xs font-medium text-slate-400">{label}</span>
          )}
          {showValue && (
            <span className="text-xs font-semibold tabular-nums text-slate-300">
              {clampedValue}%
            </span>
          )}
        </div>
      )}

      <div
        className={clsx(
          "overflow-hidden rounded-full bg-slate-800/80",
          sizeStyles[size]
        )}
        role="progressbar"
        aria-valuenow={clampedValue}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label ?? `${clampedValue}% complete`}
      >
        <motion.div
          initial={animated && !prefersReducedMotion ? { width: 0 } : false}
          animate={{ width: `${clampedValue}%` }}
          transition={
            animated && !prefersReducedMotion
              ? { duration: 0.8, ease: [0.16, 1, 0.3, 1] }
              : { duration: 0 }
          }
          className={clsx(
            "h-full rounded-full bg-gradient-to-r",
            variantStyles[variant]
          )}
        />
      </div>
    </div>
  );
}
