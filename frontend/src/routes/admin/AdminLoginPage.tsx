import { useMemo } from "react";
import { Link, Navigate } from "react-router-dom";
import { SignIn, SignedIn, useAuth } from "@clerk/clerk-react";
import { useAccount } from "wagmi";
import { ShieldCheck, Lock, MousePointerClick, Sparkles, ArrowRight } from "lucide-react";
import clsx from "clsx";
import { Button, GlassCard } from "@/components/ui";
import { WalletConnectButton } from "@/components/WalletConnectButton";

const ADMIN_WALLETS = (import.meta.env.VITE_ADMIN_WALLET_ADDRESSES || "")
  .split(",")
  .map((address: string) => address.trim().toLowerCase())
  .filter(Boolean);

export function AdminLoginPage() {
  const { address } = useAccount();
  const { isSignedIn, isLoaded } = useAuth();
  const isAllowlistedAdmin = useMemo(
    () => !!address && ADMIN_WALLETS.includes(address.toLowerCase()),
    [address]
  );

  if (isLoaded && isSignedIn && isAllowlistedAdmin) {
    return <Navigate to="/admin" replace />;
  }

  return (
    <div className="page-container max-w-7xl">
      <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] items-start">
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary-500/20 bg-primary-500/10 px-3 py-1 text-xs font-semibold text-primary-300">
            <ShieldCheck className="h-3.5 w-3.5" />
            Enter Admin Mode
          </div>

          <div className="space-y-4">
            <h1 className="text-4xl font-display font-bold text-slate-100 tracking-tight">
              Secure platform control for administrators
            </h1>
            <p className="max-w-2xl text-slate-400 leading-relaxed">
              Admin access uses a hybrid model: connect the approved wallet, sign in with Clerk, and the platform opens the admin surface only for trusted accounts.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <GlassCard className="p-4">
              <Lock className="h-5 w-5 text-primary-300 mb-3" />
              <p className="font-semibold text-slate-100">Wallet allowlist</p>
              <p className="mt-1 text-xs text-slate-400">Approved admin wallets are promoted automatically.</p>
            </GlassCard>
            <GlassCard className="p-4">
              <MousePointerClick className="h-5 w-5 text-emerald-300 mb-3" />
              <p className="font-semibold text-slate-100">Explicit entry</p>
              <p className="mt-1 text-xs text-slate-400">A dedicated login page keeps admin intent obvious.</p>
            </GlassCard>
            <GlassCard className="p-4">
              <Sparkles className="h-5 w-5 text-amber-300 mb-3" />
              <p className="font-semibold text-slate-100">Audited actions</p>
              <p className="mt-1 text-xs text-slate-400">Role and moderation changes are written to the audit trail.</p>
            </GlassCard>
          </div>

          <GlassCard className="p-5 space-y-4">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h2 className="text-lg font-bold text-slate-100">Admin wallet status</h2>
                <p className="text-sm text-slate-400">Connect the approved wallet before entering admin mode.</p>
              </div>
              <div
                className={clsx(
                  "rounded-full px-3 py-1 text-xs font-semibold border",
                  isAllowlistedAdmin
                    ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
                    : "border-amber-500/20 bg-amber-500/10 text-amber-300"
                )}
              >
                {isAllowlistedAdmin ? "Allowlisted wallet detected" : "Admin wallet required"}
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <WalletConnectButton />
              <Button variant="outline" to="/sign-in" leadingIcon={<ArrowRight className="h-4 w-4" />}>
                Standard Sign In
              </Button>
            </div>

            {isAllowlistedAdmin && (
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-100">
                Your wallet is allowlisted. Sign in to continue, then open the admin dashboard.
              </div>
            )}
          </GlassCard>

          <div className="flex flex-wrap gap-3 text-sm text-slate-400">
            <span>First admin wallet: {ADMIN_WALLETS[0] || "not configured"}</span>
            <Link to="/admin" className="text-primary-300 hover:text-primary-200 font-medium">
              Go to dashboard
            </Link>
          </div>
        </div>

        <GlassCard className="p-6 border border-white/[0.08] bg-slate-900/80 backdrop-blur-xl">
          <div className="mb-5 flex items-center gap-3">
            <div className="rounded-2xl border border-primary-500/20 bg-primary-500/10 p-3 text-primary-300">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-100">Admin sign-in</h2>
              <p className="text-sm text-slate-400">Clerk sign-in for the trusted admin account</p>
            </div>
          </div>

          <div className="flex justify-center">
            <SignIn
              routing="path"
              path="/admin/login"
              signUpUrl="/sign-up"
              appearance={{
                elements: {
                  rootBox: "w-full",
                  card: "w-full border border-white/[0.08] rounded-2xl shadow-2xl bg-slate-950/70",
                  headerTitle: "hidden",
                  headerSubtitle: "hidden",
                  socialButtonsBlockButton: "hidden",
                  formButtonPrimary: "bg-gradient-to-r from-primary-600 to-secondary-600 text-white hover:opacity-90",
                  footerActionLink: "text-primary-300 hover:text-primary-200"
                }
              }}
            />
          </div>

          <SignedIn>
            <div className="mt-6 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 text-sm text-slate-300">
              Signed in. If your wallet is allowlisted, the admin dashboard will open automatically.
            </div>
          </SignedIn>
        </GlassCard>
      </div>
    </div>
  );
}