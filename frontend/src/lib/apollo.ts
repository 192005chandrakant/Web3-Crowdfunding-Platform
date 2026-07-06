import { ApolloClient, InMemoryCache, HttpLink } from "@apollo/client";

const graphEndpoint = import.meta.env.VITE_GRAPHQL_ENDPOINT || "";

export const apolloClient = new ApolloClient({
  link: new HttpLink({ uri: graphEndpoint || "http://localhost:4000/graphql" }),
  cache: new InMemoryCache()
});

export function createApolloClient() {
  return apolloClient;
}