import { useEffect, type ReactNode } from "react";
import { ClerkProvider, useAuth, useUser } from "@clerk/clerk-react";
import { ApolloProvider } from "@apollo/client/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import { WagmiProvider } from "wagmi";
import { useAccount } from "wagmi";
import { apolloClient } from "@/lib/apollo";
import { api } from "@/lib/api";
import { wagmiConfig } from "@/lib/wagmi";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: false,
      refetchOnWindowFocus: false
    }
  }
});

const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string;

if (!CLERK_PUBLISHABLE_KEY) {
  throw new Error("[AppProviders] VITE_CLERK_PUBLISHABLE_KEY is not set. Clerk auth cannot start.");
}

interface AppProvidersProps {
  children: ReactNode;
}

function AccountIdentitySync() {
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const { address } = useAccount();

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user?.id || !address) {
      return;
    }

    const controller = new AbortController();
    const syncIdentity = async () => {
      try {
        await api.upsertUser({
          walletAddress: address,
          clerkUserId: user.id,
          displayName: user.fullName || undefined,
          email: user.primaryEmailAddress?.emailAddress || undefined
        });
      } catch (error) {
        console.warn("[AccountIdentitySync] Unable to sync linked wallet", error);
      }
    };

    syncIdentity();
    return () => controller.abort();
  }, [address, isLoaded, isSignedIn, user?.fullName, user?.id, user?.primaryEmailAddress?.emailAddress]);

  return null;
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY} afterSignOutUrl="/">
      <WagmiProvider config={wagmiConfig}>
        <QueryClientProvider client={queryClient}>
          <ApolloProvider client={apolloClient}>
            <AccountIdentitySync />
            {children}
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: "#130E1F",
                  color: "rgba(248,249,250,0.92)",
                  border: "1px solid rgba(255,255,255,0.1)"
                },
                success: {
                  iconTheme: { primary: "#10b981", secondary: "#fff" }
                },
                error: {
                  iconTheme: { primary: "#ef4444", secondary: "#fff" }
                }
              }}
            />
          </ApolloProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </ClerkProvider>
  );
}
