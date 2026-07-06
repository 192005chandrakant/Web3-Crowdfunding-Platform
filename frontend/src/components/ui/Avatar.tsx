import clsx from "clsx";

export type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl";

interface AvatarProps {
  src?: string | null;
  alt?: string;
  size?: AvatarSize;
  fallback?: string;
  className?: string;
  /** Optional indicator dot in the corner */
  indicator?: "online" | "offline" | "warning";
}

const sizeStyles: Record<AvatarSize, string> = {
  xs: "h-6 w-6 text-[10px]",
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-12 w-12 text-base",
  xl: "h-16 w-16 text-lg"
};

const indicatorSize: Record<AvatarSize, string> = {
  xs: "h-1.5 w-1.5",
  sm: "h-2 w-2",
  md: "h-2.5 w-2.5",
  lg: "h-3 w-3",
  xl: "h-3.5 w-3.5"
};

const indicatorColor = {
  online: "bg-success-400",
  offline: "bg-slate-500",
  warning: "bg-warning-400"
};

function getInitials(text: string): string {
  return text
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

export function Avatar({
  src,
  alt = "",
  size = "md",
  fallback,
  className,
  indicator
}: AvatarProps) {
  const initials = fallback ? getInitials(fallback) : "?";

  return (
    <div className={clsx("relative inline-flex shrink-0", className)}>
      <div
        className={clsx(
          "rounded-full overflow-hidden border border-white/[0.1]",
          "flex items-center justify-center",
          "bg-gradient-to-br from-primary-700 to-secondary-700",
          sizeStyles[size]
        )}
      >
        {src ? (
          <img
            src={src}
            alt={alt}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <span
            className="font-semibold text-slate-200 select-none"
            aria-label={alt || fallback}
          >
            {initials}
          </span>
        )}
      </div>

      {indicator && (
        <span
          className={clsx(
            "absolute bottom-0 right-0 rounded-full border-2 border-slate-900",
            indicatorSize[size],
            indicatorColor[indicator]
          )}
          aria-label={`Status: ${indicator}`}
        />
      )}
    </div>
  );
}
