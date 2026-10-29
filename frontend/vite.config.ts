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
            // ── @tanstack must be declared BEFORE the vendor catch-all ──────────
            // Prevents circular: web3(wagmi) → vendor(@tanstack) → web3(wagmi)
            if (id.includes("@tanstack")) return "query";
            if (id.includes("wagmi") || id.includes("@wagmi") || id.includes("viem")) return "web3";
            if (id.includes("@clerk")) return "clerk";
            if (id.includes("@apollo") || id.includes("graphql")) return "graphql";
            if (id.includes("framer-motion")) return "motion";
            if (id.includes("lucide-react")) return "icons";
            if (id.includes("react-hot-toast")) return "toasts";
            if (id.includes("zustand")) return "state";
            // react-router-dom merged into vendor (removes empty "router" chunk)
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