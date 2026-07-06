import { NavLink, Link } from "react-router-dom";
import {
  LayoutDashboard,
  Compass,
  FolderOpen,
  Heart,
  CheckSquare,
  BarChart2,
  Bell,
  Wallet,
  Settings,
  HelpCircle,
  Shield,
  ChevronRight,
  ShieldAlert,
  Users,
  Target
} from "lucide-react";
import clsx from "clsx";


import { useAccount } from "wagmi";
import { useAuth } from "@clerk/clerk-react";

const ADMIN_WALLETS = (import.meta.env.VITE_ADMIN_WALLET_ADDRESSES || "")
  .split(",")
  .map((a: string) => a.trim().toLowerCase())
  .filter(Boolean);

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

const primaryNav: NavItem[] = [
  { label: "Dashboard",         href: "/",                  icon: LayoutDashboard },
  { label: "Explore Campaigns", href: "/explore",           icon: Compass },
  { label: "My Campaigns",      href: "/my-campaigns",      icon: FolderOpen },
  { label: "My Donations",      href: "/my-donations",      icon: Heart },
  { label: "Milestone Reviews", href: "/milestone-reviews", icon: CheckSquare, badge: 3 },
  { label: "Ledger",            href: "/ledger",            icon: BarChart2 },
  { label: "Analytics",         href: "/analytics",         icon: BarChart2 }
];

const secondaryNav: NavItem[] = [
  { label: "Notifications", href: "/notifications", icon: Bell, badge: 5 },
  { label: "Wallet",        href: "/wallet",        icon: Wallet },
  { label: "Settings",      href: "/settings",      icon: Settings },
  { label: "Help",          href: "/help",          icon: HelpCircle }
];

const adminNav: NavItem[] = [
  { label: "Admin Dashboard",   href: "/admin",           icon: ShieldAlert },
  { label: "Users",             href: "/admin/users",     icon: Users },
  { label: "Campaigns",         href: "/admin/campaigns", icon: Target }
];

function NavItem({ item }: { item: NavItem }) {
  return (
    <NavLink
      to={item.href}
      end={item.href === "/"}
      className={({ isActive }) =>
        clsx(
          "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150",
          isActive
            ? "bg-primary-600/20 text-primary-300 border border-primary-500/25"
            : "text-slate-400 hover:bg-white/[0.05] hover:text-slate-200 border border-transparent"
        )
      }
    >
      {({ isActive }) => (
        <>
          <item.icon
            className={clsx(
              "h-4 w-4 shrink-0 transition-colors",
              isActive ? "text-primary-400" : "text-slate-500 group-hover:text-slate-300"
            )}
          />
          <span className="flex-1">{item.label}</span>
          {item.badge != null && item.badge > 0 && (
            <span
              className={clsx(
                "inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full px-1.5 text-[10px] font-semibold",
                isActive
                  ? "bg-primary-500/30 text-primary-300"
                  : "bg-slate-700 text-slate-400"
              )}
            >
              {item.badge}
            </span>
          )}
        </>
      )}
    </NavLink>
  );
}

export function DesktopSidebar() {
  const { address } = useAccount();
  const { isSignedIn } = useAuth();
  const isAdmin = isSignedIn && !!address && ADMIN_WALLETS.includes(address.toLowerCase());

  return (
    <aside
      className={clsx(
        "hidden lg:flex lg:flex-col",
        "fixed inset-y-0 left-0 z-40 w-64",
        "border-r border-white/[0.06] bg-slate-900/95 backdrop-blur-xl"
      )}
      aria-label="Main navigation"
    >
      {/* Brand */}
      <div className="flex h-16 items-center gap-3 border-b border-white/[0.06] px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary-600 to-secondary-600 shadow-glow-primary">
          <Shield className="h-4 w-4 text-white" aria-hidden="true" />
        </div>
        <div>
          <p className="text-sm font-bold text-slate-100 leading-none">MilestoneChain</p>
          <p className="mt-0.5 text-[10px] font-medium uppercase tracking-widest text-slate-500">
            Transparent Funding
          </p>
        </div>
      </div>

      {/* Scrollable nav area */}
      <nav className="flex flex-1 flex-col overflow-y-auto px-3 py-4" aria-label="Primary navigation">
        {/* Primary links */}
        <div className="space-y-0.5">
          <p className="section-label mb-2 px-3">Main</p>
          {primaryNav.map((item) => (
            <NavItem key={item.href} item={item} />
          ))}
        </div>

        {/* Divider */}
        <div className="my-4 border-t border-white/[0.06]" />

        {/* Secondary links */}
        <div className="space-y-0.5">
          <p className="section-label mb-2 px-3">Account</p>
          {secondaryNav.map((item) => (
            <NavItem key={item.href} item={item} />
          ))}
        </div>

        {/* Admin links (conditionally rendered) */}
        {isAdmin && (
          <>
            <div className="my-4 border-t border-white/[0.06]" />
            <div className="space-y-0.5">
              <p className="section-label mb-2 px-3 text-red-400">Administration</p>
              {adminNav.map((item) => (
                <NavItem key={item.href} item={item} />
              ))}
            </div>
          </>
        )}
      </nav>

      {/* Footer: Create Campaign CTA */}
      <div className="border-t border-white/[0.06] p-4">
        <Link
          to="/create-campaign"
          className={clsx(
            "flex w-full items-center justify-between rounded-xl px-4 py-3",
            "bg-gradient-to-r from-primary-600 to-secondary-600",
            "text-sm font-semibold text-white",
            "shadow-glow-primary transition-all duration-200",
            "hover:opacity-90 hover:shadow-lg",
            "focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-400"
          )}
        >
          <span>Start a Campaign</span>
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Link>
        <p className="mt-3 text-center text-[10px] text-slate-600">
          Polygon Amoy Testnet
        </p>
      </div>
    </aside>
  );
}
