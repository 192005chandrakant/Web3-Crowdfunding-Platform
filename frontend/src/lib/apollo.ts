import { ApolloClient, InMemoryCache, HttpLink } from "@apollo/client";

const rawBackendUrl =
  (import.meta.env.VITE_BACKEND_URL as string) || "http://localhost:5000";
const backendUrl = rawBackendUrl.replace(/\/+$/, "");
const defaultGraphEndpoint = `${backendUrl}/graphql`;

const graphEndpoint =
  (import.meta.env.VITE_GRAPHQL_ENDPOINT as string) || defaultGraphEndpoint;

export const apolloClient = new ApolloClient({
  link: new HttpLink({ uri: graphEndpoint }),
  cache: new InMemoryCache()
});

export function createApolloClient() {
  return apolloClient;
}
