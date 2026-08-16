import { useEffect, useState, type ReactNode } from "react";
import { useLocation, Link, NavLink } from "react-router-dom";
import { Menu, X, ChevronRight, LayoutDashboard, Compass, FolderOpen, Heart, CheckSquare, BarChart2, Bell, Wallet, Settings, HelpCircle, ShieldAlert, Users, Target, Plus } from "lucide-react";
import clsx from "clsx";
import { useAccount } from "wagmi";
import { useAuth, SignedIn, SignedOut, UserButton } from "@clerk/clerk-react";
import { DesktopSidebar } from "@/components/navigation/DesktopSidebar";
import { MobileBottomNav } from "@/components/navigation/MobileBottomNav";
import { WalletConnectButton } from "@/components/WalletConnectButton";
import { BrandLogo } from "@/components/BrandLogo";

const ADMIN_WALLETS = (import.meta.env.VITE_ADMIN_WALLET_ADDRESSES || "")
  .split(",")
  .map((address: string) => address.trim().toLowerCase())
  .filter(Boolean);

const primaryNav = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Explore Campaigns", href: "/explore", icon: Compass },
  { label: "My Campaigns", href: "/my-campaigns", icon: FolderOpen },
  { label: "My Donations", href: "/my-donations", icon: Heart },
  { label: "Milestone Reviews", href: "/milestone-reviews", icon: CheckSquare },
  { label: "Ledger", href: "/ledger", icon: BarChart2 },
  { label: "Analytics", href: "/analytics", icon: BarChart2 }
];

const secondaryNav = [
  { label: "Notifications", href: "/notifications", icon: Bell },
  { label: "Wallet", href: "/wallet", icon: Wallet },
  { label: "Settings", href: "/settings", icon: Settings },
  { label: "Help", href: "/help", icon: HelpCircle }
];

const adminNav = [
  { label: "Admin Dashboard", href: "/admin", icon: ShieldAlert },
  { label: "Users", href: "/admin/users", icon: Users },
  { label: "Campaigns", href: "/admin/campaigns", icon: Target },
  { label: "Audit Log", href: "/admin/audit-log", icon: CheckSquare }
];

function MobileNavLink({
  href,
  label,
  icon: Icon,
  onClick
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick?: () => void;
}) {
  return (
    <NavLink
      to={href}
      end={href === "/"}
      onClick={onClick}
      className={({ isActive }) =>
        clsx(
          "flex items-center gap-3 rounded-2xl border px-4 py-3 transition-all duration-200",
          isActive
            ? "border-primary-500/30 bg-primary-600/15 text-primary-200"
            : "border-white/[0.08] bg-white/[0.02] text-slate-300 hover:border-white/[0.15] hover:bg-white/[0.05]"
        )
      }
    >
      {({ isActive }) => (
        <>
          <Icon className={clsx("h-4 w-4 shrink-0", isActive ? "text-primary-300" : "text-slate-500")} aria-hidden="true" />
          <span className="flex-1 text-sm font-medium">{label}</span>
          <ChevronRight className="h-4 w-4 text-slate-500" aria-hidden="true" />
        </>
      )}
    </NavLink>
  );
}

function MobileNavDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { address } = useAccount();
  const { isSignedIn } = useAuth();
  const isAdmin = isSignedIn && !!address && ADMIN_WALLETS.includes(address.toLowerCase());

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[70] lg:hidden">
      <button
        type="button"
        aria-label="Close mobile navigation"
        className="absolute inset-0 bg-slate-950/75 backdrop-blur-sm"
        onClick={onClose}
      />

      <aside className="absolute left-3 right-3 top-3 bottom-3 overflow-hidden rounded-[1.5rem] border border-white/[0.08] bg-slate-950/96 shadow-2xl shadow-black/40">
        <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-4">
          <BrandLogo size="sm" to="/" />
          <button
            type="button"
            className="rounded-full border border-white/[0.08] bg-white/[0.04] p-2 text-slate-300 transition-colors hover:bg-white/[0.08] hover:text-white"
            onClick={onClose}
            aria-label="Close menu"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="max-h-[calc(100%-4.5rem)] overflow-y-auto px-4 py-4">
          <div className="space-y-5">
            <div>
              <p className="section-label mb-3 px-1">Main</p>
              <div className="grid gap-2">
                {primaryNav.map((item) => (
                  <MobileNavLink key={item.href} href={item.href} label={item.label} icon={item.icon} onClick={onClose} />
                ))}
              </div>
            </div>

            <div>
              <p className="section-label mb-3 px-1">Account</p>
              <div className="grid gap-2">
                {secondaryNav.map((item) => (
                  <MobileNavLink key={item.href} href={item.href} label={item.label} icon={item.icon} onClick={onClose} />
                ))}
              </div>
            </div>

            {isAdmin && (
              <div>
                <p className="section-label mb-3 px-1 text-red-400">Administration</p>
                <div className="grid gap-2">
                  {adminNav.map((item) => (
                    <MobileNavLink key={item.href} href={item.href} label={item.label} icon={item.icon} onClick={onClose} />
                  ))}
                </div>
              </div>
            )}

            <div className="grid gap-3 border-t border-white/[0.06] pt-5">
              <Link
                to="/create-campaign"
                onClick={onClose}
                className="flex items-center justify-between rounded-2xl bg-gradient-to-r from-primary-600 to-secondary-600 px-4 py-4 text-sm font-semibold text-white shadow-glow-primary transition-opacity hover:opacity-90"
              >
                <span className="flex items-center gap-2">
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  Start a Campaign
                </span>
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <p className="text-center text-[10px] uppercase tracking-[0.3em] text-slate-500">Polygon Amoy Testnet</p>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      {/* Top accent gradient bar */}
      <div className="fixed top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-primary-500 via-secondary-500 to-blockchain-500 z-[60] opacity-80" />

      {/* Desktop persistent sidebar — 256px (w-64) wide */}
      <DesktopSidebar />

      {/* Main content area — offset by sidebar on large screens */}
      <div className="lg:pl-64 flex flex-col min-h-screen">
        <main
          id="main-content"
          className="flex-1 w-full max-w-[1400px] mx-auto px-4 pt-4 pb-24 lg:px-8 lg:pb-10 lg:pt-6"
          tabIndex={-1}
          aria-label="Main content"
        >
        {/* Top Header */}
        <header className="mb-6 flex flex-wrap items-center justify-between gap-3 z-40 relative">
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] p-2.5 text-slate-300 transition-colors hover:bg-white/[0.08] hover:text-white lg:hidden"
            onClick={() => setIsMobileMenuOpen(true)}
            aria-label="Open navigation menu"
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </button>

          <BrandLogo size="sm" to="/" className="lg:hidden" showTagline={false} />

          <div className="ml-auto flex flex-wrap items-center justify-end gap-3 min-w-0">
          <WalletConnectButton />

          <SignedIn>
            <UserButton afterSignOutUrl="/" />
          </SignedIn>

          <SignedOut>
            <div className="flex items-center gap-2">
              <Link
                to="/sign-in"
                className="text-sm font-medium text-slate-400 hover:text-slate-200 transition-colors px-4 py-2"
              >
                Sign In
              </Link>
              <Link
                to="/sign-up"
                className="text-sm font-medium bg-gradient-to-r from-primary-600 to-secondary-600 text-white hover:opacity-90 transition-all px-4 py-2 rounded-xl shadow-glow-primary"
              >
                Sign Up
              </Link>
            </div>
          </SignedOut>
          </div>
        </header>

        <div className="flex-1">
          {children}
        </div>
      </main>
      </div>

      {/* Mobile bottom nav — hidden on desktop */}
      <MobileBottomNav />

      <MobileNavDrawer open={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />
    </div>
  );
}

