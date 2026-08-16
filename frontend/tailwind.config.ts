import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      // ─── Typography ────────────────────────────────────────────────────
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ["Sora", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"]
      },

      // ─── Color System ──────────────────────────────────────────────────
      colors: {
        // Primary — Indigo (actions, navigation, links, focus)
        primary: {
          50: "#eef2ff",
          100: "#e0e7ff",
          200: "#c7d2fe",
          300: "#a5b4fc",
          400: "#818cf8",
          500: "#6366f1",
          600: "#4f46e5",
          700: "#4338ca",
          800: "#3730a3",
          900: "#312e81",
          950: "#1e1b4b"
        },
        // Secondary — Purple (branding, identity, milestone accents)
        secondary: {
          50: "#faf5ff",
          100: "#f3e8ff",
          200: "#e9d5ff",
          300: "#d8b4fe",
          400: "#c084fc",
          500: "#a855f7",
          600: "#9333ea",
          700: "#7e22ce",
          800: "#6b21a8",
          900: "#581c87",
          950: "#3b0764"
        },
        // Blockchain — Blue (wallets, transactions, escrow, verification)
        blockchain: {
          50: "#eff6ff",
          100: "#dbeafe",
          200: "#bfdbfe",
          300: "#93c5fd",
          400: "#60a5fa",
          500: "#3b82f6",
          600: "#2563eb",
          700: "#1d4ed8",
          800: "#1e40af",
          900: "#1e3a8a",
          950: "#172554"
        },
        // Success — Emerald (completed, verified, released)
        success: {
          50: "#ecfdf5",
          100: "#d1fae5",
          200: "#a7f3d0",
          300: "#6ee7b7",
          400: "#34d399",
          500: "#10b981",
          600: "#059669",
          700: "#047857",
          800: "#065f46",
          900: "#064e3b",
          950: "#022c22"
        },
        // Warning — Amber (pending, waiting, unverified)
        warning: {
          50: "#fffbeb",
          100: "#fef3c7",
          200: "#fde68a",
          300: "#fcd34d",
          400: "#fbbf24",
          500: "#f59e0b",
          600: "#d97706",
          700: "#b45309",
          800: "#92400e",
          900: "#78350f",
          950: "#451a03"
        },
        // Danger — Red (rejected, failed, errors, fraud)
        danger: {
          50: "#fff1f2",
          100: "#ffe4e6",
          200: "#fecdd3",
          300: "#fda4af",
          400: "#fb7185",
          500: "#f43f5e",
          600: "#e11d48",
          700: "#be123c",
          800: "#9f1239",
          900: "#881337",
          950: "#4c0519"
        },
        // Neutral — Slate (backgrounds, surfaces, text)
        surface: {
          bg: "#0f172a",        // Page background
          base: "#111827",      // Base surface
          card: "#1e293b",      // Card
          elevated: "#263040",  // Elevated card
          dialog: "#2d3748",    // Dialog
          popover: "#374151",   // Popover
          tooltip: "#4b5563",   // Tooltip
          border: "rgba(148,163,184,0.12)",
          "border-strong": "rgba(148,163,184,0.22)"
        }
      },

      // ─── Shadow System ─────────────────────────────────────────────────
      boxShadow: {
        "xs": "0 1px 2px rgba(0,0,0,0.3)",
        "sm": "0 2px 8px rgba(0,0,0,0.35)",
        "md": "0 4px 24px rgba(0,0,0,0.4)",
        "lg": "0 8px 40px rgba(0,0,0,0.45)",
        "xl": "0 16px 64px rgba(0,0,0,0.5)",
        "card": "0 1px 3px rgba(0,0,0,0.3), 0 8px 32px rgba(0,0,0,0.35)",
        "dialog": "0 24px 80px rgba(0,0,0,0.6)",
        "glow-primary": "0 0 24px rgba(99,102,241,0.4)",
        "glow-success": "0 0 20px rgba(16,185,129,0.35)",
        "glow-blockchain": "0 0 20px rgba(59,130,246,0.35)",
        "inner-sm": "inset 0 1px 2px rgba(0,0,0,0.3)"
      },

      // ─── Border Radius ─────────────────────────────────────────────────
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
        "4xl": "2rem"
      },

      // ─── Spacing Extras ────────────────────────────────────────────────
      spacing: {
        "18": "4.5rem",
        "72": "18rem",
        "80": "20rem",
        "sidebar": "17rem"
      },

      // ─── Z-Index ───────────────────────────────────────────────────────
      zIndex: {
        "sidebar": "40",
        "nav": "50",
        "modal": "60",
        "tooltip": "70"
      },

      // ─── Background Images ─────────────────────────────────────────────
      backgroundImage: {
        "gradient-primary": "linear-gradient(135deg, #6366f1, #a855f7)",
        "gradient-blockchain": "linear-gradient(135deg, #3b82f6, #6366f1)",
        "gradient-success": "linear-gradient(135deg, #10b981, #3b82f6)",
        "app-bg": "radial-gradient(ellipse at top, rgba(99,102,241,0.08) 0%, transparent 50%), radial-gradient(ellipse at bottom right, rgba(168,85,247,0.06) 0%, transparent 50%), linear-gradient(180deg, #0f172a 0%, #111827 100%)"
      },

      // ─── Animation ─────────────────────────────────────────────────────
      transitionDuration: {
        "150": "150ms",
        "200": "200ms",
        "250": "250ms"
      },

      // ─── Keyframes ─────────────────────────────────────────────────────
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        },
        "scale-in": {
          "0%": { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" }
        },
        "shimmer": {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" }
        },
        "pulse-glow": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" }
        },
        "progress": {
          "0%": { width: "0%" },
          "100%": { width: "var(--progress-width)" }
        },
        "float": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" }
        },
        "float-slow": {
          "0%, 100%": { transform: "translateY(0) rotate(0deg)" },
          "33%": { transform: "translateY(-8px) rotate(1deg)" },
          "66%": { transform: "translateY(4px) rotate(-1deg)" }
        },
        "gradient-x": {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" }
        },
        "gradient-shift": {
          "0%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
          "100%": { backgroundPosition: "0% 50%" }
        },
        "glow-pulse-ring": {
          "0%, 100%": { boxShadow: "0 0 8px rgba(99,102,241,0.3), 0 0 24px rgba(99,102,241,0.1)" },
          "50%": { boxShadow: "0 0 16px rgba(99,102,241,0.5), 0 0 48px rgba(99,102,241,0.2)" }
        },
        "slide-up": {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        },
        "slide-down": {
          "0%": { opacity: "0", transform: "translateY(-16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        },
        "text-shimmer": {
          "0%": { backgroundPosition: "-200% center" },
          "100%": { backgroundPosition: "200% center" }
        },
        "border-glow": {
          "0%, 100%": { borderColor: "rgba(99,102,241,0.3)" },
          "50%": { borderColor: "rgba(168,85,247,0.5)" }
        },
        "spin-slow": {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" }
        },
        "bounce-subtle": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-4px)" }
        }
      },
      animation: {
        "fade-in": "fade-in 0.2s ease-out",
        "scale-in": "scale-in 0.2s ease-out",
        "shimmer": "shimmer 2s linear infinite",
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
        "float": "float 6s ease-in-out infinite",
        "float-slow": "float-slow 8s ease-in-out infinite",
        "gradient-x": "gradient-x 3s ease infinite",
        "gradient-shift": "gradient-shift 6s ease infinite",
        "glow-pulse-ring": "glow-pulse-ring 3s ease-in-out infinite",
        "slide-up": "slide-up 0.4s ease-out",
        "slide-down": "slide-down 0.4s ease-out",
        "text-shimmer": "text-shimmer 3s linear infinite",
        "border-glow": "border-glow 3s ease-in-out infinite",
        "spin-slow": "spin-slow 12s linear infinite",
        "bounce-subtle": "bounce-subtle 2s ease-in-out infinite"
      }
    }
  },
  plugins: []
};

export default config;
