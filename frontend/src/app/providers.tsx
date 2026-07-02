"use client";

import type { ReactNode } from "react";
import { ApolloProvider } from "@apollo/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import { WagmiProvider } from "wagmi";
import { wagmiConfig } from "@/lib/wagmi";
import { createApolloClient } from "@/lib/apollo";

const queryClient = new QueryClient();
const apolloClient = createApolloClient();

export function Providers({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <ApolloProvider client={apolloClient}>
          {children}
          <Toaster position="top-right" toastOptions={{ style: { background: "#130E1F", color: "rgba(248,249,250,0.92)" } }} />
        </ApolloProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}