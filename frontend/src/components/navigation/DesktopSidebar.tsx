import Link from "next/link";

const navigationItems = [
  { label: "Explore", href: "/" },
  { label: "Campaigns", href: "/#campaigns" },
  { label: "Create", href: "/#create" },
  { label: "Docs", href: "/#docs" }
];

export function DesktopSidebar() {
  return (
    <aside className="hidden lg:fixed lg:inset-y-6 lg:left-6 lg:flex lg:w-72 lg:flex-col lg:rounded-[2rem] lg:border lg:border-white/10 lg:bg-white/5 lg:p-5 lg:backdrop-blur-xl lg:shadow-glass">
      <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
        <p className="text-xs uppercase tracking-[0.35em] text-nebula-cyan/80">Premium Nebula</p>
        <h1 className="mt-3 font-display text-2xl text-white/90">Crowdfunding SaaS</h1>
        <p className="mt-2 text-sm leading-6 text-white/70">
          Non-custodial milestone funding for Polygon with Graph-indexed transparency.
        </p>
      </div>

      <nav className="mt-8 flex flex-1 flex-col gap-2">
        {navigationItems.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80 transition hover:border-nebula-cyan/30 hover:bg-white/10 hover:text-white"
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="mt-auto rounded-[1.5rem] border border-white/10 bg-gradient-to-br from-white/10 to-white/5 p-4 shadow-glowCyan">
        <p className="text-xs uppercase tracking-[0.3em] text-nebula-cyan/80">Network</p>
        <p className="mt-2 text-sm text-white/80">Polygon / Amoy ready</p>
      </div>
    </aside>
  );
}