/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ALCHEMY_RPC_URL?: string;
  readonly VITE_GANACHE_RPC_URL?: string;
  readonly VITE_POLYGON_MAINNET_RPC_URL?: string;
  readonly VITE_GRAPHQL_ENDPOINT?: string;
  readonly VITE_CHAIN_ID?: string;
  readonly VITE_TARGET_CHAIN_ID?: string;
  readonly VITE_CLERK_PUBLISHABLE_KEY?: string;
  readonly VITE_BACKEND_URL?: string;
  readonly VITE_FACTORY_CONTRACT_ADDRESS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
