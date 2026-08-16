import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src")
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (id.includes("react-router-dom")) return "router";
            if (id.includes("@clerk")) return "clerk";
            if (id.includes("wagmi") || id.includes("viem") || id.includes("@tanstack/query-core")) return "web3";
            if (id.includes("@apollo") || id.includes("graphql")) return "graphql";
            if (id.includes("framer-motion")) return "motion";
            if (id.includes("lucide-react")) return "icons";
            if (id.includes("react-hot-toast")) return "toasts";
            if (id.includes("zustand")) return "state";
            return "vendor";
          }
        }
      }
    }
  },
  server: {
    host: true,
    port: 3000
  },
  preview: {
    host: true,
    port: 4173
  }
});