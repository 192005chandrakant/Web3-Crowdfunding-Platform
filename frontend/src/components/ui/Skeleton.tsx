import clsx from "clsx";

interface SkeletonProps {
  className?: string;
  /** Override shape to circle (for avatars) */
  circle?: boolean;
}

/** Single skeleton block */
export function Skeleton({ className, circle = false }: SkeletonProps) {
  return (
    <div
      className={clsx(
        "skeleton bg-slate-800",
        circle ? "rounded-full" : "rounded-lg",
        className
      )}
      aria-hidden="true"
    />
  );
}

/** Stacked lines skeleton */
export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={clsx("space-y-2", className)} aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={clsx(
            "h-4",
            i === lines - 1 ? "w-3/5" : i % 2 === 0 ? "w-full" : "w-4/5"
          )}
        />
      ))}
    </div>
  );
}

/** Campaign card skeleton */
export function CampaignCardSkeleton() {
  return (
    <div
      className="overflow-hidden rounded-2xl border border-white/[0.06] bg-slate-800/40"
      aria-hidden="true"
      aria-label="Loading campaign"
    >
      {/* Hero image */}
      <Skeleton className="h-48 w-full rounded-none" />
      <div className="space-y-3 p-5">
        {/* Title */}
        <Skeleton className="h-5 w-3/4" />
        {/* Creator */}
        <div className="flex items-center gap-2">
          <Skeleton circle className="h-6 w-6" />
          <Skeleton className="h-3.5 w-28" />
        </div>
        {/* Progress bar */}
        <Skeleton className="h-2 w-full rounded-full" />
        {/* Footer row */}
        <div className="flex justify-between">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-20" />
        </div>
      </div>
    </div>
  );
}

/** Generic page section skeleton */
export function SectionSkeleton() {
  return (
    <div className="space-y-4" aria-hidden="true">
      <Skeleton className="h-8 w-48" />
      <SkeletonText lines={4} />
    </div>
  );
}
