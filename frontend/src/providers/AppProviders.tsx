import type { ReactNode } from "react";
import { ApolloProvider } from "@apollo/client/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import { WagmiProvider } from "wagmi";
import { apolloClient } from "@/lib/apollo";
import { wagmiConfig } from "@/lib/wagmi";

const queryClient = new QueryClient();

interface AppProvidersProps {
  children: ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <ApolloProvider client={apolloClient}>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: "#130E1F",
                color: "rgba(248,249,250,0.92)",
                border: "1px solid rgba(255,255,255,0.1)"
              }
            }}
          />
        </ApolloProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
