import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Compass,
  FolderOpen,
  Bell,
  Wallet
} from "lucide-react";
import clsx from "clsx";

const mobileItems = [
  { label: "Home",    href: "/",        icon: LayoutDashboard },
  { label: "Explore", href: "/explore", icon: Compass },
  { label: "Mine",    href: "/my-campaigns", icon: FolderOpen },
  { label: "Alerts",  href: "/notifications", icon: Bell },
  { label: "Wallet",  href: "/wallet",  icon: Wallet }
] as const;

export function MobileBottomNav() {
  return (
    <nav
      className={clsx(
        "fixed bottom-0 left-0 right-0 z-50",
        "flex items-stretch lg:hidden",
        "border-t border-white/[0.08] bg-slate-900/95 backdrop-blur-xl",
        "safe-area-pb"
      )}
      aria-label="Mobile navigation"
    >
      {mobileItems.map((item) => (
        <NavLink
          key={item.href}
          to={item.href}
          end={item.href === "/"}
          className={({ isActive }) =>
            clsx(
              "flex flex-1 flex-col items-center justify-center gap-1 px-1 py-3 relative",
              "text-[10px] font-medium transition-colors duration-200",
              isActive
                ? "text-primary-400"
                : "text-slate-500 hover:text-slate-300"
            )
          }
          aria-label={item.label}
        >
          {({ isActive }) => (
            <>
              <item.icon
                className={clsx(
                  "h-5 w-5 transition-all duration-200",
                  isActive ? "text-primary-400 scale-110" : "text-current"
                )}
                aria-hidden="true"
              />
              <span>{item.label}</span>
              {isActive && (
                <span
                  className="absolute top-0 left-1/2 -translate-x-1/2 h-[2px] w-8 rounded-b-full bg-gradient-to-r from-primary-400 to-secondary-400"
                  aria-hidden="true"
                />
              )}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
