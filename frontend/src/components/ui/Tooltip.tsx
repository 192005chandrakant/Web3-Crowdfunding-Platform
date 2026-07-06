import type { ReactNode } from "react";
import { useState, useRef, useId } from "react";
import clsx from "clsx";

type TooltipPlacement = "top" | "bottom" | "left" | "right";

interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  placement?: TooltipPlacement;
  className?: string;
  /** Delay before showing tooltip (ms) */
  delay?: number;
}

const placementStyles: Record<TooltipPlacement, string> = {
  top:    "bottom-full left-1/2 -translate-x-1/2 mb-2",
  bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
  left:   "right-full top-1/2 -translate-y-1/2 mr-2",
  right:  "left-full top-1/2 -translate-y-1/2 ml-2"
};

export function Tooltip({
  content,
  children,
  placement = "top",
  className,
  delay = 200
}: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tooltipId = useId();

  function show() {
    timerRef.current = setTimeout(() => setVisible(true), delay);
  }

  function hide() {
    if (timerRef.current) clearTimeout(timerRef.current);
    setVisible(false);
  }

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      <span aria-describedby={tooltipId}>{children}</span>

      {visible && (
        <span
          id={tooltipId}
          role="tooltip"
          className={clsx(
            "pointer-events-none absolute z-tooltip w-max max-w-xs",
            "rounded-lg border border-white/[0.1] bg-slate-800 px-3 py-2",
            "text-xs text-slate-200 shadow-dialog",
            "animate-scale-in",
            placementStyles[placement],
            className
          )}
        >
          {content}
        </span>
      )}
    </span>
  );
}
