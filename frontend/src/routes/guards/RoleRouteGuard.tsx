import { useEffect, useState, type ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import { useAccount } from "wagmi";
import { Loader2 } from "lucide-react";
import { useCurrentUser } from "@/hooks/useCurrentUser";

type AllowedRole = "creator" | "moderator" | "reviewer" | "admin";

type RoleRouteGuardProps = {
  children: ReactNode;
  roles: AllowedRole[];
  requireActive?: boolean;
  redirectTo?: string;
};

export function RoleRouteGuard({ children, roles, requireActive = true, redirectTo = "/onboarding" }: RoleRouteGuardProps) {
  const { isLoaded, isSignedIn } = useAuth();
  const { 
    role: currentRole, 
    accountStatus,
    isLoading
  } = useCurrentUser();

  if (!isLoaded || isLoading) {
    return (
      <div className="page-container flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <Loader2 className="w-10 h-10 text-primary-500 animate-spin" />
        <p className="text-slate-400 font-medium">Verifying access...</p>
      </div>
    );
  }

  if (!isSignedIn) {
    return <Navigate to="/sign-in" replace />;
  }

  if (requireActive && accountStatus && accountStatus !== "active") {
    return <Navigate to={redirectTo} replace />;
  }

  if (!currentRole || !roles.includes(currentRole as AllowedRole)) {
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
}
