import { useState, useEffect } from "react";
import { useAuth } from "@clerk/clerk-react";
import { useAccount } from "wagmi";
import { api, type ApiUser } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";

export function useCurrentUser() {
  const { isLoaded: clerkLoaded, isSignedIn } = useAuth();
  const { address } = useAccount();
  const { setUserRole } = useAuthStore();
  const [user, setUser] = useState<ApiUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      if (!clerkLoaded) return;

      // If user isn't signed in through Clerk and doesn't have a wallet, they are completely logged out
      if (!isSignedIn && !address) {
        setUser(null);
        setUserRole(null);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const res = await api.getCurrentUser();
        if (res.success && res.user) {
          setUser(res.user);
          setUserRole(res.user.role || null);
        } else {
          setUser(null);
          setUserRole(null);
        }
      } catch (err) {
        console.error("Failed to load current user", err);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    }

    loadUser();
  }, [clerkLoaded, isSignedIn, address, setUserRole]);

  const userId = user?._id || null;
  const role = user?.role;
  const requestedRole = user?.requestedRole || role;
  const accountStatus = user?.accountStatus || "active";
  const hasOnboarded = Boolean(user?.hasOnboarded);

  return {
    user,
    role,
    requestedRole,
    accountStatus,
    hasOnboarded,
    isAdmin: role === "admin",
    isCreator: role === "creator",
    isReviewer: role === "reviewer" || role === "moderator",
    isDonor: role === "donor",
    isPendingReview: accountStatus === "pending_review",
    isLoaded: clerkLoaded,
    isLoading: !clerkLoaded || isLoading
  };
}
