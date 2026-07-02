import type { ButtonHTMLAttributes, ReactNode } from "react";
import { motion } from "framer-motion";
import clsx from "clsx";

type ButtonVariant = "primary-glow" | "glass-outline" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  isLoading?: boolean;
  children: ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  "primary-glow": "bg-gradient-to-r from-[#8A2BE2] to-[#D946EF] text-white/95 shadow-[0_0_30px_rgba(217,70,239,0.3)] hover:shadow-[0_0_40px_rgba(217,70,239,0.45)]",
  "glass-outline": "border border-white/10 bg-white/5 text-white/90 backdrop-blur-xl hover:border-white/20 hover:bg-white/10",
  ghost: "bg-transparent text-white/80 hover:bg-white/5 hover:text-white/95"
};

export function Button({ variant = "primary-glow", isLoading = false, children, className, disabled, ...props }: ButtonProps) {
  const isDisabled = disabled || isLoading;

  return (
    <motion.button
      whileTap={{ scale: isDisabled ? 1 : 0.98 }}
      whileHover={{ y: isDisabled ? 0 : -1 }}
      className={clsx(
        "inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-[#00F0FF]/40 focus:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-60",
        variantStyles[variant],
        className
      )}
      disabled={isDisabled}
      {...props}
    >
      {isLoading ? (
        <span className="inline-flex items-center gap-2">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white/90" />
          Loading
        </span>
      ) : (
        children
      )}
    </motion.button>
  );
}