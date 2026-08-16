import type { ButtonHTMLAttributes, AnchorHTMLAttributes, ReactNode } from "react";
import { motion } from "framer-motion";
import clsx from "clsx";
import { Loader2 } from "lucide-react";
import { Link } from "react-router-dom";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "blockchain"
  | "success"
  | "danger"
  | "outline"
  | "ghost"
  | "link"
  // Legacy aliases — kept for backwards compatibility
  | "primary-glow"
  | "glass-outline";

export type ButtonSize = "xs" | "sm" | "md" | "lg";

type ButtonBaseProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
  children: ReactNode;
  fullWidth?: boolean;
  className?: string;
  /** Render as a React Router Link */
  to?: string;
  disabled?: boolean;
};

type ButtonProps = ButtonBaseProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof ButtonBaseProps>;

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-gradient-to-r from-primary-600 to-secondary-600 text-white shadow-glow-primary " +
    "hover:opacity-90 hover:shadow-lg active:opacity-100",
  secondary:
    "bg-secondary-600/20 text-secondary-300 border border-secondary-500/30 " +
    "hover:bg-secondary-600/30",
  blockchain:
    "bg-blockchain-600/20 text-blockchain-300 border border-blockchain-500/30 " +
    "hover:bg-blockchain-600/30",
  success:
    "bg-success-600/20 text-success-400 border border-success-500/30 " +
    "hover:bg-success-600/30",
  danger:
    "bg-danger-600/20 text-danger-400 border border-danger-500/30 " +
    "hover:bg-danger-600/30",
  outline:
    "border border-white/[0.12] bg-transparent text-slate-300 " +
    "hover:border-white/[0.22] hover:bg-white/[0.04] hover:text-slate-100",
  ghost:
    "bg-transparent text-slate-400 " +
    "hover:bg-white/[0.05] hover:text-slate-200",
  link:
    "bg-transparent text-primary-400 underline-offset-4 " +
    "hover:underline hover:text-primary-300",
  // Legacy aliases — map to nearest new variant
  "primary-glow":
    "bg-gradient-to-r from-primary-600 to-secondary-600 text-white shadow-glow-primary " +
    "hover:opacity-90 hover:shadow-lg active:opacity-100",
  "glass-outline":
    "border border-white/[0.12] bg-white/[0.04] text-slate-300 backdrop-blur-sm " +
    "hover:border-white/[0.22] hover:bg-white/[0.08] hover:text-slate-100"
};

const sizeStyles: Record<ButtonSize, string> = {
  xs: "h-7 gap-1.5 rounded-lg px-2.5 text-xs",
  sm: "h-8 gap-1.5 rounded-lg px-3 text-xs",
  md: "h-10 gap-2 rounded-xl px-4 text-sm",
  lg: "h-12 gap-2 rounded-xl px-6 text-base"
};

const baseClasses = (
  variant: ButtonVariant,
  size: ButtonSize,
  isDisabled: boolean,
  fullWidth: boolean,
  className?: string
) =>
  clsx(
    "relative inline-flex items-center justify-center font-semibold",
    "transition-all duration-150 select-none",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/60",
    "focus-visible:ring-offset-1 focus-visible:ring-offset-slate-900",
    variant !== "link" && sizeStyles[size],
    variantStyles[variant],
    fullWidth && "w-full",
    isDisabled && "pointer-events-none opacity-50 cursor-not-allowed",
    className
  );

function ButtonContent({
  isLoading,
  leadingIcon,
  trailingIcon,
  children
}: {
  isLoading: boolean;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
  children: ReactNode;
}) {
  if (isLoading) {
    return (
      <>
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        <span>Loading…</span>
      </>
    );
  }
  return (
    <>
      {leadingIcon && <span className="shrink-0" aria-hidden="true">{leadingIcon}</span>}
      {children}
      {trailingIcon && <span className="shrink-0" aria-hidden="true">{trailingIcon}</span>}
    </>
  );
}

export function Button({
  variant = "primary",
  size = "md",
  isLoading = false,
  leadingIcon,
  trailingIcon,
  children,
  className,
  disabled,
  fullWidth = false,
  to,
  onClick,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || isLoading;
  const resolvedClass = baseClasses(variant, size, isDisabled, fullWidth, className);

  // Render as React Router Link when `to` is provided
  if (to) {
    return (
      <motion.div
        whileTap={{ scale: isDisabled ? 1 : 0.97 }}
        whileHover={{ y: isDisabled || variant === "link" ? 0 : -1 }}
        transition={{ duration: 0.15 }}
        className={fullWidth ? "block w-full" : "inline-block"}
      >
        <Link to={to} className={resolvedClass} aria-disabled={isDisabled}>
          <ButtonContent
            isLoading={isLoading}
            leadingIcon={leadingIcon}
            trailingIcon={trailingIcon}
          >
            {children}
          </ButtonContent>
        </Link>
      </motion.div>
    );
  }

  return (
    <motion.button
      whileTap={{ scale: isDisabled ? 1 : 0.97 }}
      whileHover={{ y: isDisabled || variant === "link" ? 0 : -1 }}
      transition={{ duration: 0.15 }}
      className={resolvedClass}
      disabled={isDisabled}
      aria-busy={isLoading}
      onClick={onClick}
      {...(props as React.ComponentPropsWithoutRef<typeof motion.button>)}
    >
      <ButtonContent
        isLoading={isLoading}
        leadingIcon={leadingIcon}
        trailingIcon={trailingIcon}
      >
        {children}
      </ButtonContent>
    </motion.button>
  );
}
