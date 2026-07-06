import { Button } from "@/components/ui";
import { Home } from "lucide-react";

export function NotFoundPage() {
  return (
    <section className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-4">
      <div className="max-w-md rounded-2xl border border-white/[0.08] bg-slate-800/50 p-10 text-center shadow-dialog">
        <p className="section-label mb-4">404</p>
        <h1 className="font-display text-5xl font-bold text-slate-100">Page not found</h1>
        <p className="mx-auto mt-4 max-w-sm text-sm leading-relaxed text-slate-500">
          The page you requested does not exist. It may have moved or the URL may be incorrect.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Button variant="primary" size="md" to="/" leadingIcon={<Home className="h-4 w-4" />}>
            Return Home
          </Button>
          <Button variant="outline" size="md" to="/explore">
            Explore Campaigns
          </Button>
        </div>
      </div>
    </section>
  );
}
