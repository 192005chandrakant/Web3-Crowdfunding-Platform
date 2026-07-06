import type { ReactNode } from "react";
import clsx from "clsx";
import {
  Info,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  X
} from "lucide-react";

export type AlertVariant = "info" | "success" | "warning" | "danger";

interface AlertProps {
  variant?: AlertVariant;
  title?: string;
  children: ReactNode;
  className?: string;
  onDismiss?: () => void;
  /** Show icon */
  icon?: boolean;
}

const variantConfig: Record<
  AlertVariant,
  { container: string; icon: React.ComponentType<{ className?: string }>; iconClass: string }
> = {
  info: {
    container: "bg-blockchain-500/10 border-blockchain-500/25 text-blockchain-300",
    icon: Info,
    iconClass: "text-blockchain-400"
  },
  success: {
    container: "bg-success-500/10 border-success-500/25 text-success-300",
    icon: CheckCircle2,
    iconClass: "text-success-400"
  },
  warning: {
    container: "bg-warning-500/10 border-warning-500/25 text-warning-300",
    icon: AlertTriangle,
    iconClass: "text-warning-400"
  },
  danger: {
    container: "bg-danger-500/10 border-danger-500/25 text-danger-300",
    icon: XCircle,
    iconClass: "text-danger-400"
  }
};

export function Alert({
  variant = "info",
  title,
  children,
  className,
  onDismiss,
  icon = true
}: AlertProps) {
  const config = variantConfig[variant];
  const Icon = config.icon;

  return (
    <div
      role="alert"
      className={clsx(
        "relative flex gap-3 rounded-xl border p-4 text-sm",
        config.container,
        className
      )}
    >
      {icon && (
        <Icon
          className={clsx("mt-0.5 h-4 w-4 shrink-0", config.iconClass)}
          aria-hidden="true"
        />
      )}
      <div className="flex-1 min-w-0">
        {title && (
          <p className="font-semibold mb-0.5">{title}</p>
        )}
        <div className="leading-relaxed opacity-90">{children}</div>
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="shrink-0 rounded-md p-0.5 opacity-60 hover:opacity-100 transition-opacity"
          aria-label="Dismiss alert"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
