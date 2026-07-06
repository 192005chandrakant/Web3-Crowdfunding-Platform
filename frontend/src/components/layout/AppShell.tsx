import type { ReactNode } from "react";
import { DesktopSidebar } from "@/components/navigation/DesktopSidebar";
import { MobileBottomNav } from "@/components/navigation/MobileBottomNav";
import { WalletConnectButton } from "@/components/WalletConnectButton";

import { Link } from "react-router-dom";
import { SignedIn, SignedOut, UserButton } from "@clerk/clerk-react";

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="relative min-h-screen">
      {/* Desktop persistent sidebar — 256px (w-64) wide */}
      <DesktopSidebar />

      {/* Main content area — offset by sidebar on large screens */}
      <main
        id="main-content"
        className={[
          "min-h-screen flex flex-col",
          // Mobile: full width with bottom nav padding
          "px-4 pt-4 pb-24",
          // Desktop: left padding accounts for 256px sidebar
          "lg:ml-64 lg:px-8 lg:pb-10 lg:pt-6",
          // Max width cap with auto centering
          "max-w-[1400px]"
        ].join(" ")}
        tabIndex={-1}
        aria-label="Main content"
      >
        {/* Top Header */}
        <header className="flex justify-end items-center gap-4 mb-6 z-40 relative">
          <WalletConnectButton />
          
          <SignedIn>
            <UserButton afterSignOutUrl="/" />
          </SignedIn>
          
          <SignedOut>
            <div className="flex items-center gap-2">
              <Link 
                to="/sign-in" 
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-4 py-2"
              >
                Sign In
              </Link>
              <Link 
                to="/sign-up" 
                className="text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors px-4 py-2 rounded-lg"
              >
                Sign Up
              </Link>
            </div>
          </SignedOut>
        </header>

        <div className="flex-1">
          {children}
        </div>
      </main>

      {/* Mobile bottom nav — hidden on desktop */}
      <MobileBottomNav />
    </div>
  );
}
