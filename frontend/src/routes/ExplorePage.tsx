import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { CampaignCard } from "@/components/CampaignCard";
import type { CampaignCardData } from "@/components/CampaignCard";
import {
  Button,
  Badge,
  EmptyState,
  CampaignCardSkeleton,
  Alert
} from "@/components/ui";
import { useCampaignList } from "@/hooks/useCampaigns";
import { mapCampaignToCardData } from "@/lib/api";

const FALLBACK_CAMPAIGNS: CampaignCardData[] = [
  {
    id: "solar-clinic",
    title: "Solar-Powered Rural Clinic Network",
    description: "Bringing sustainable healthcare to 12 villages in northern Kenya.",
    creator: "Helix Health Foundation",
    creatorType: "organization",
    category: "Healthcare",
    raised: "74,200", goal: "100,000", currency: "MATIC",
    progress: 74, daysLeft: 18, donorCount: 342, milestoneCount: 4,
    isVerified: true, isFeatured: true
  }
];

const CATEGORIES = [
  "All", "general", "startup", "charity", "medical", "event"
];

type SortOption = "trending" | "newest" | "most-funded";

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "trending", label: "Trending" },
  { value: "newest", label: "Newest" },
  { value: "most-funded", label: "Most Funded" }
];

const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } }
};

export function ExplorePage() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [sort, setSort] = useState<SortOption>("trending");
  const [showFilters, setShowFilters] = useState(false);

  const { data, isLoading, isError } = useCampaignList({
    page: 1,
    limit: 24,
    category: category === "All" ? undefined : category,
    search: query.trim() || undefined
  });

  const campaigns = useMemo(() => {
    if (data?.items?.length) {
      return data.items.map((campaign) => mapCampaignToCardData(campaign));
    }
    if (!isLoading && isError) {
      return FALLBACK_CAMPAIGNS;
    }
    return [];
  }, [data, isLoading, isError]);

  const filtered = useMemo(() => {
    let results = [...campaigns];

    switch (sort) {
      case "most-funded":
        results.sort((a, b) => b.progress - a.progress);
        break;
      case "newest":
        results.reverse();
        break;
      default:
        results.sort((a, b) => (b.donorCount ?? 0) - (a.donorCount ?? 0));
    }

    return results;
  }, [campaigns, sort]);

  const hasActiveFilters = category !== "All";

  function clearFilters() {
    setCategory("All");
    setQuery("");
  }

  return (
    <div className="page-container">
      <div>
        <p className="section-label mb-1">Discover</p>
        <h1 className="font-display text-3xl font-bold text-slate-100">Explore Campaigns</h1>
        <p className="mt-1 text-sm text-slate-500">
          {data?.pagination.total ?? filtered.length} campaigns on MilestoneChain
        </p>
      </div>

      {isError && (
        <Alert variant="warning" title="Backend offline">
          Showing fallback data. Start the backend API at {import.meta.env.VITE_BACKEND_URL || "http://localhost:5000"}.
        </Alert>
      )}

      <div className="space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search campaigns…"
              className="input-field pl-9"
              aria-label="Search campaigns"
            />
            {query && (
              <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300" aria-label="Clear search">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <Button variant={showFilters ? "secondary" : "outline"} size="md" leadingIcon={<SlidersHorizontal className="h-4 w-4" />} onClick={() => setShowFilters((v) => !v)}>
            Filters
          </Button>
        </div>

        <div className="flex flex-wrap gap-2" role="group" aria-label="Sort options">
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setSort(opt.value)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                sort === opt.value
                  ? "border-primary-500/50 bg-primary-500/15 text-primary-300"
                  : "border-white/[0.08] bg-slate-800/40 text-slate-400 hover:border-white/[0.15] hover:text-slate-200"
              }`}
              aria-pressed={sort === opt.value}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <AnimatePresence>
          {showFilters && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="rounded-xl border border-white/[0.08] bg-slate-800/50 p-4">
                <p className="section-label mb-2">Category</p>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setCategory(cat)}
                      className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                        category === cat
                          ? "border-primary-500/50 bg-primary-500/15 text-primary-300"
                          : "border-white/[0.06] bg-slate-900/40 text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div>
        <p className="mb-4 text-xs text-slate-500">
          {filtered.length} campaign{filtered.length !== 1 ? "s" : ""} found
        </p>

        {isLoading ? (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <CampaignCardSkeleton key={index} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No campaigns found"
            description="Try adjusting your search or create the first campaign."
            action={<Button variant="outline" size="sm" to="/create-campaign">Create Campaign</Button>}
          />
        ) : (
          <motion.div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3" variants={stagger} initial="hidden" animate="show">
            {filtered.map((campaign) => (
              <CampaignCard key={campaign.id} campaign={campaign} animate />
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}
