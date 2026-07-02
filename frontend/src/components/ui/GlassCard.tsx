import type { HTMLAttributes, ReactNode } from "react";
import { motion } from "framer-motion";
import clsx from "clsx";

interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function GlassCard({ children, className, ...props }: GlassCardProps) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ type: "spring", stiffness: 220, damping: 22 }}
      className={clsx(
        "rounded-[2rem] border border-white/10 bg-white/[0.04] backdrop-blur-xl shadow-[0_24px_80px_rgba(5,8,18,0.55)]",
        className
      )}
      {...props}
    >
      {children}
    </motion.div>
  );
}