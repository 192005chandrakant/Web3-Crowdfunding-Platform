import React, { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Filter, ShieldCheck, RefreshCw, ChevronLeft, ChevronRight, History } from "lucide-react";
import { GlassCard, Button, Badge, Skeleton } from "@/components/ui";
import { api, AdminAuditLogItem } from "@/lib/api";

function AuditLogCard({ item }: { item: AdminAuditLogItem }) {
  const labelColor =
    item.action.includes("role") ? "text-blue-300 bg-blue-500/10 border-blue-500/20" :
    item.action.includes("verification") ? "text-emerald-300 bg-emerald-500/10 border-emerald-500/20" :
    item.action.includes("campaign") ? "text-amber-300 bg-amber-500/10 border-amber-500/20" :
    "text-slate-300 bg-white/[0.04] border-white/[0.08]";

  return (
    <details className="rounded-2xl border border-white/[0.08] bg-slate-900/70 p-4 open:bg-slate-900/90 transition-colors">
      <summary className="cursor-pointer list-none">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className={labelColor}>{item.action}</Badge>
              <span className="text-xs text-slate-500 uppercase tracking-wider">{item.resourceType}</span>
            </div>
            <div className="text-sm text-slate-300">
              <span className="font-mono text-slate-200">{item.actorWalletAddress.slice(0, 6)}…{item.actorWalletAddress.slice(-4)}</span>
              <span className="text-slate-500"> updated </span>
              <span className="font-medium text-slate-100">{item.resourceId.slice(0, 10)}…</span>
            </div>
          </div>
          <div className="text-xs text-slate-500">{new Date(item.createdAt).toLocaleString()}</div>
        </div>
      </summary>

      <div className="mt-4 grid gap-4 md:grid-cols-3 text-sm">
        <div>
          <p className="text-xs uppercase tracking-wider text-slate-500 mb-2">Before</p>
          <pre className="overflow-x-auto rounded-xl border border-white/[0.06] bg-black/20 p-3 text-slate-300 text-xs">{JSON.stringify(item.beforeState, null, 2)}</pre>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-slate-500 mb-2">After</p>
          <pre className="overflow-x-auto rounded-xl border border-white/[0.06] bg-black/20 p-3 text-slate-300 text-xs">{JSON.stringify(item.afterState, null, 2)}</pre>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-slate-500 mb-2">Metadata</p>
          <pre className="overflow-x-auto rounded-xl border border-white/[0.06] bg-black/20 p-3 text-slate-300 text-xs">{JSON.stringify(item.metadata, null, 2)}</pre>
        </div>
      </div>
    </details>
  );
}

export function AdminAuditLogPage() {
  const [page, setPage] = useState(1);
  const [action, setAction] = useState<string>("");
  const [resourceType, setResourceType] = useState<string>("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const limit = 10;

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [action, resourceType, debouncedSearch]);

  const query = useMemo(() => ({
    page,
    limit,
    action: action || undefined,
    resourceType: resourceType || undefined,
    search: debouncedSearch || undefined
  }), [page, action, resourceType, debouncedSearch]);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["adminAuditLogs", query],
    queryFn: () => api.adminGetAuditLogs(query),
    refetchInterval: 15000
  });

  const items = data?.items || [];
  const totalPages = data?.pagination?.totalPages || 1;

  return (
    <div className="page-container max-w-7xl space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-300 mb-3">
            <History className="h-3.5 w-3.5" />
            Audit Trail
          </div>
          <h1 className="text-3xl font-display font-bold text-slate-100">Admin activity log</h1>
          <p className="mt-2 text-slate-400">Every role change and moderation action is tracked here for accountability.</p>
        </div>

        <Button variant="outline" size="sm" leadingIcon={<RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />} onClick={() => refetch()}>
          Refresh
        </Button>
      </div>

      <GlassCard className="p-5 space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
          <Filter className="h-4 w-4 text-slate-400" />
          Filters
        </div>
        <div className="grid gap-3 md:grid-cols-4">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search wallet, action, or resource"
            className="input-field"
          />
          <select value={action} onChange={(event) => setAction(event.target.value)} className="input-field">
            <option value="">All actions</option>
            <option value="user_role_updated">user_role_updated</option>
            <option value="user_verification_updated">user_verification_updated</option>
            <option value="campaign_flagged">campaign_flagged</option>
            <option value="campaign_unflagged">campaign_unflagged</option>
            <option value="campaign_status_updated">campaign_status_updated</option>
          </select>
          <select value={resourceType} onChange={(event) => setResourceType(event.target.value)} className="input-field">
            <option value="">All resource types</option>
            <option value="user">user</option>
            <option value="campaign">campaign</option>
            <option value="platform">platform</option>
          </select>
          <div className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-sm text-slate-400">
            <ShieldCheck className="h-4 w-4 text-emerald-300" />
            Audited actions only
          </div>
        </div>
      </GlassCard>

      <div className="space-y-4">
        {isLoading ? (
          [...Array(4)].map((_, index) => <Skeleton key={index} className="h-28 w-full" />)
        ) : items.length === 0 ? (
          <GlassCard className="p-8 text-center text-slate-500">
            No audit logs found for the current filters.
          </GlassCard>
        ) : (
          items.map((item) => <AuditLogCard key={item._id} item={item} />)
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <div className="text-sm text-slate-400">Page {page} of {totalPages}</div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((current) => current - 1)} leadingIcon={<ChevronLeft className="h-4 w-4" />}>
              Previous
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((current) => current + 1)} trailingIcon={<ChevronRight className="h-4 w-4" />}>
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}