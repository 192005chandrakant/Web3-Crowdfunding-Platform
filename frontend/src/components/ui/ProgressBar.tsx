import { motion } from "framer-motion";

interface ProgressBarProps {
  value: number;
  label?: string;
}

export function ProgressBar({ value, label }: ProgressBarProps) {
  const clampedValue = Math.min(100, Math.max(0, value));

  return (
    <div className="space-y-2">
      {label ? <div className="text-xs uppercase tracking-[0.3em] text-white/60">{label}</div> : null}
      <div className="h-2 overflow-hidden rounded-full bg-white/10">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${clampedValue}%` }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="h-full rounded-full bg-gradient-to-r from-[#00F0FF] via-[#8A2BE2] to-[#D946EF] shadow-[0_0_18px_rgba(0,240,255,0.35)]"
        />
      </div>
    </div>
  );
}