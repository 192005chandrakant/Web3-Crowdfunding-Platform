import { useEffect, useMemo, useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { useAuth, useUser } from "@clerk/clerk-react";
import { useAccount } from "wagmi";
import { useNavigate } from "react-router-dom";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { CheckCircle2, Shield, Sparkles, Users, Clock3, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { GlassCard, Button, Badge } from "@/components/ui";
import { api } from "@/lib/api";

type DesiredRole = "donor" | "creator" | "reviewer";

const ROLE_META: Record<DesiredRole, { badgeClass: string; iconClass: string }> = {
  donor: { badgeClass: "border-emerald-500/20 bg-emerald-500/10", iconClass: "bg-emerald-500/10 text-emerald-300" },
  creator: { badgeClass: "border-blue-500/20 bg-blue-500/10", iconClass: "bg-blue-500/10 text-blue-300" },
  reviewer: { badgeClass: "border-amber-500/20 bg-amber-500/10", iconClass: "bg-amber-500/10 text-amber-300" }
};

export function AccountOnboardingPage() {
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const { address } = useAccount();
  const navigate = useNavigate();

  const {
    user: currentUser,
    isLoading: isUserLoading,
    hasOnboarded,
  } = useCurrentUser();

  const [selectedRole, setSelectedRole] = useState<DesiredRole>("donor");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);

  const accountStatus = currentUser?.accountStatus ?? "active";
  const requestedRole = currentUser?.requestedRole ?? selectedRole;
  const isPendingReview = accountStatus === "pending_review";

  // Pre-fill form when user data loads
  useEffect(() => {
    if (currentUser) {
      setSelectedRole((currentUser.requestedRole as DesiredRole) || "donor");
      setDisplayName(currentUser.displayName || user?.fullName || "");
      setEmail(currentUser.email || user?.primaryEmailAddress?.emailAddress || "");
    } else if (user) {
      setDisplayName(user.fullName || "");
      setEmail(user.primaryEmailAddress?.emailAddress || "");
    }
  }, [currentUser, user]);

  // Bypass logic: if onboarded and active, redirect to home
  useEffect(() => {
    if (hasOnboarded && accountStatus === "active" && !saving) {
      navigate("/");
    }
  }, [hasOnboarded, accountStatus, navigate, saving]);

  const roleCards = useMemo(() => ([
    {
      id: "donor" as const,
      title: "Donor",
      description: "Browse public campaigns, contribute, and vote where eligible.",
      icon: Users,
      tone: "emerald"
    },
    {
      id: "creator" as const,
      title: "Creator",
      description: "Apply for campaign creation and milestone management access.",
      icon: Sparkles,
      tone: "blue"
    },
    {
      id: "reviewer" as const,
      title: "Reviewer",
      description: "Review flagged content and platform submissions after admin approval.",
      icon: Shield,
      tone: "amber"
    }
  ]), []);

  if (!isLoaded || isUserLoading) {
    return (
      <div className="page-container flex min-h-[70vh] items-center justify-center">
        <div className="flex items-center gap-3 text-slate-400">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Preparing your account…</span>
        </div>
      </div>
    );
  }

  // Also do not render the form if we're bypassing to home
  if (hasOnboarded && accountStatus === "active") {
    return null;
  }

  if (!isSignedIn) {
    return <Navigate to="/sign-in" replace />;
  }

  async function handleSave() {
    setSaving(true);
    try {
      const resolvedWallet = address || currentUser?.walletAddress || undefined;
      const res = await api.upsertUser({
        walletAddress: resolvedWallet,
        clerkUserId: user?.id,
        displayName,
        email,
        requestedRole: selectedRole,
        role: selectedRole
      });

      // After save, if donor -> redirect. The hook will update in background but we can fast-path it.
      if (selectedRole === "donor") {
        toast.success("Account updated successfully.");
        window.location.href = "/"; // Force full reload to reset auth state completely
      } else {
        toast.success("Request submitted for admin review.");
        window.location.reload(); // Reload to fetch pending_review status properly
      }
    } catch (error: any) {
      toast.error(error.message || "Unable to save account details");
    } finally {
      setSaving(false);
    }
  }

  if (isPendingReview) {
    return (
      <div className="page-container max-w-4xl">
        <GlassCard className="p-8 border border-amber-500/20 bg-amber-500/5">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl bg-amber-500/10 p-3 text-amber-300">
              <Clock3 className="h-6 w-6" />
            </div>
            <div className="space-y-3">
              <div>
                <h1 className="text-2xl font-bold text-slate-100">Account pending review</h1>
                <p className="text-slate-400">
                  Your {requestedRole} request is awaiting admin approval. You can still browse public content, but privileged actions remain locked until the account is approved.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Badge variant="warning">Pending review</Badge>
                <Badge variant="primary">Public access enabled</Badge>
              </div>
              <div className="pt-2 flex gap-3">
                <Button to="/explore" variant="primary">Explore campaigns</Button>
                <Button to="/wallet" variant="outline">Wallet center</Button>
              </div>
            </div>
          </div>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="page-container max-w-6xl">
      <div className="mb-8 space-y-3">
        <h1 className="text-3xl font-display font-bold text-slate-100">Finish your account setup</h1>
        <p className="text-slate-400 max-w-2xl">
          Choose the access path you want for this platform. Donor access activates immediately. Creator and moderator/reviewer requests go to admin approval before privileged features unlock.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <GlassCard className="p-6 space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            {roleCards.map(({ id, title, description, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setSelectedRole(id)}
                className={`rounded-2xl border p-4 text-left transition-all ${selectedRole === id ? `border-primary-500/40 bg-primary-500/10 ${ROLE_META[id].badgeClass}` : "border-white/[0.08] bg-white/[0.02] hover:border-white/[0.16]"}`}
              >
                <div className={`mb-3 inline-flex rounded-xl p-2 ${ROLE_META[id].iconClass}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="font-semibold text-slate-100">{title}</h3>
                <p className="mt-2 text-sm text-slate-400 leading-relaxed">{description}</p>
              </button>
            ))}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-300">Display name</span>
              <input className="w-full rounded-xl border border-white/[0.08] bg-slate-900/60 px-4 py-3 text-slate-100 outline-none focus:border-primary-500/50" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-medium text-slate-300">Email</span>
              <input className="w-full rounded-xl border border-white/[0.08] bg-slate-900/60 px-4 py-3 text-slate-100 outline-none focus:border-primary-500/50" value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>
          </div>

          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 text-sm text-slate-400">
            <p className="font-medium text-slate-200">Policy notes</p>
            <p className="mt-1">Creator and moderator/reviewer accounts are reviewed by admin before activation. Suspicious requests remain pending instead of being auto-approved.</p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : selectedRole === "donor" ? "Activate donor account" : "Submit for review"}
            </Button>
            <Button variant="outline" to="/explore">Continue as visitor</Button>
          </div>
        </GlassCard>

        <GlassCard className="p-6 space-y-4">
          <div>
            <h2 className="text-xl font-bold text-slate-100">Current status</h2>
            <p className="text-sm text-slate-400">Your persisted account state is read from the database.</p>
          </div>
          <div className="space-y-3 rounded-2xl border border-white/[0.08] bg-slate-950/40 p-4 text-sm">
            <div className="flex items-center justify-between"><span className="text-slate-400">Wallet</span><span className="font-mono text-slate-200">{address || currentUser?.walletAddress || "not linked"}</span></div>
            <div className="flex items-center justify-between"><span className="text-slate-400">Requested role</span><span className="text-slate-200 capitalize">{requestedRole}</span></div>
            <div className="flex items-center justify-between"><span className="text-slate-400">Account status</span><span className="text-slate-200 capitalize">{accountStatus.replace("_", " ")}</span></div>
            <div className="flex items-center justify-between"><span className="text-slate-400">Approval rule</span><span className="text-slate-200">Admin review for creator/reviewer</span></div>
          </div>
          <Link to="/help" className="text-sm text-primary-300 hover:text-primary-200">Need help with account access?</Link>
        </GlassCard>
      </div>
    </div>
  );
}
