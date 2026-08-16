import type { HTMLAttributes, ReactNode } from "react";
import { motion } from "framer-motion";
import clsx from "clsx";

interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  /** Disable the hover lift animation */
  noHover?: boolean;
  /** Use a more subtle padding-less container */
  flush?: boolean;
  /** Add animated gradient border on hover */
  glowBorder?: boolean;
}

export function GlassCard({
  children,
  className,
  noHover = false,
  flush = false,
  glowBorder = false,
  ...props
}: GlassCardProps) {
  return (
    <motion.div
      whileHover={noHover ? undefined : { y: -2 }}
      transition={{ type: "spring", stiffness: 280, damping: 24 }}
      className={clsx(
        "rounded-2xl border border-white/[0.08] bg-slate-800/50 backdrop-blur-sm",
        "shadow-card transition-all duration-200",
        "hover:border-white/[0.14] hover:shadow-lg",
        glowBorder && "gradient-border",
        !flush && "p-6",
        className
      )}
      {...(props as React.ComponentPropsWithoutRef<typeof motion.div>)}
    >
      {children}
    </motion.div>
  );
}
