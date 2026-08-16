import { useId } from "react";
import { Link } from "react-router-dom";
import clsx from "clsx";

type LogoSize = "sm" | "md" | "lg";
type LogoVariant = "full" | "mark";

interface BrandLogoProps {
  size?: LogoSize;
  variant?: LogoVariant;
  to?: string;
  className?: string;
  markClassName?: string;
  textClassName?: string;
  showTagline?: boolean;
}

const sizeMap = {
  sm: {
    mark: "h-8 w-8",
    name: "text-sm",
    tagline: "text-[10px]"
  },
  md: {
    mark: "h-10 w-10",
    name: "text-base",
    tagline: "text-[11px]"
  },
  lg: {
    mark: "h-12 w-12",
    name: "text-lg",
    tagline: "text-xs"
  }
};

function LogoMark({ className }: { className?: string }) {
  const id = useId();
  const bgId = `${id}-bg`;
  const lineId = `${id}-line`;
  const glowId = `${id}-glow`;

  return (
    <svg
      viewBox="0 0 48 48"
      role="img"
      aria-label="MilestoneChain logo mark"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id={bgId} x1="8" y1="5" x2="40" y2="43" gradientUnits="userSpaceOnUse">
          <stop stopColor="#22d3ee" />
          <stop offset="0.52" stopColor="#6366f1" />
          <stop offset="1" stopColor="#a855f7" />
        </linearGradient>
        <linearGradient id={lineId} x1="13" y1="34" x2="35" y2="14" gradientUnits="userSpaceOnUse">
          <stop stopColor="#ecfeff" />
          <stop offset="1" stopColor="#bbf7d0" />
        </linearGradient>
        <filter id={glowId} x="-24" y="-24" width="96" height="96" colorInterpolationFilters="sRGB">
          <feGaussianBlur stdDeviation="3.4" result="blur" />
          <feColorMatrix in="blur" type="matrix" values="0 0 0 0 0.20 0 0 0 0 0.74 0 0 0 0 1 0 0 0 0.42 0" />
          <feBlend in="SourceGraphic" />
        </filter>
      </defs>

      <rect x="3.5" y="3.5" width="41" height="41" rx="12" fill="#020617" />
      <rect x="4" y="4" width="40" height="40" rx="11.5" fill={`url(#${bgId})`} opacity="0.95" />
      <path d="M13 31.5L20.2 24.8L26.8 28.2L35 16.5" fill="none" stroke={`url(#${lineId})`} strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" filter={`url(#${glowId})`} />
      <path d="M14 36H34" stroke="#e0f2fe" strokeWidth="2" strokeLinecap="round" opacity="0.72" />

      <rect x="10.4" y="27.8" width="7.2" height="7.2" rx="2.2" fill="#0f172a" stroke="#a7f3d0" strokeWidth="1.7" />
      <rect x="20.4" y="21.1" width="7.2" height="7.2" rx="2.2" fill="#0f172a" stroke="#cffafe" strokeWidth="1.7" />
      <rect x="30.4" y="12.9" width="7.2" height="7.2" rx="2.2" fill="#0f172a" stroke="#ddd6fe" strokeWidth="1.7" />

      <path d="M17.6 31.4H20.4" stroke="#e0f2fe" strokeWidth="1.5" strokeLinecap="round" opacity="0.85" />
      <path d="M27.6 24.7H30.4" stroke="#e0f2fe" strokeWidth="1.5" strokeLinecap="round" opacity="0.85" />
      <circle cx="14" cy="31.4" r="1.5" fill="#34d399" />
      <circle cx="24" cy="24.7" r="1.5" fill="#67e8f9" />
      <circle cx="34" cy="16.5" r="1.5" fill="#c4b5fd" />
    </svg>
  );
}

export function BrandLogo({
  size = "md",
  variant = "full",
  to,
  className,
  markClassName,
  textClassName,
  showTagline = true
}: BrandLogoProps) {
  const sizes = sizeMap[size];
  const content = (
    <span className={clsx("inline-flex items-center gap-3 min-w-0", className)}>
      <span className="relative shrink-0">
        <span className="absolute inset-0 rounded-xl bg-cyan-400/20 blur-md" aria-hidden="true" />
        <LogoMark className={clsx(sizes.mark, "relative drop-shadow-[0_0_16px_rgba(34,211,238,0.24)]", markClassName)} />
      </span>
      {variant === "full" && (
        <span className={clsx("min-w-0 leading-none", textClassName)}>
          <span className={clsx("block font-display font-extrabold text-slate-100", sizes.name)}>
            MilestoneChain
          </span>
          {showTagline && (
            <span className={clsx("mt-1 block font-medium text-slate-500", sizes.tagline)}>
              Transparent Funding
            </span>
          )}
        </span>
      )}
    </span>
  );

  if (!to) {
    return content;
  }

  return (
    <Link to={to} className="inline-flex rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-400" aria-label="MilestoneChain home">
      {content}
    </Link>
  );
}



