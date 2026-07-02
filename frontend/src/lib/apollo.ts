import { ApolloClient, InMemoryCache, HttpLink } from "@apollo/client";

const graphEndpoint = process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT || "";

export function createApolloClient() {
  return new ApolloClient({
    link: new HttpLink({ uri: graphEndpoint || "http://127.0.0.1:8000/subgraphs/name/crowdfunding" }),
    cache: new InMemoryCache()
  });
}