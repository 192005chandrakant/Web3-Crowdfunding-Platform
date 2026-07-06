import type { ReactNode } from "react";
import clsx from "clsx";
import { Inbox } from "lucide-react";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  /** Compact variant for inline usage */
  compact?: boolean;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  compact = false
}: EmptyStateProps) {
  return (
    <div
      className={clsx(
        "flex flex-col items-center justify-center text-center",
        compact ? "py-8 px-4" : "py-16 px-6",
        className
      )}
      role="status"
      aria-label={title}
    >
      {/* Icon */}
      <div
        className={clsx(
          "mb-4 rounded-full border border-white/[0.08] bg-slate-800/60 flex items-center justify-center",
          compact ? "h-12 w-12" : "h-16 w-16"
        )}
        aria-hidden="true"
      >
        {icon ?? (
          <Inbox
            className={clsx(
              "text-slate-500",
              compact ? "h-5 w-5" : "h-7 w-7"
            )}
          />
        )}
      </div>

      {/* Text */}
      <h3
        className={clsx(
          "font-semibold text-slate-300",
          compact ? "text-sm" : "text-base"
        )}
      >
        {title}
      </h3>
      {description && (
        <p
          className={clsx(
            "mt-1.5 text-slate-500 max-w-sm",
            compact ? "text-xs" : "text-sm"
          )}
        >
          {description}
        </p>
      )}

      {/* Action */}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
