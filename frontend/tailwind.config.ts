import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{js,jsx,ts,tsx}"] ,
  theme: {
    extend: {
      colors: {
        void: {
          50: "#F5F3FF",
          100: "#EDE7FF",
          200: "#D6CBF7",
          300: "#B89AF0",
          400: "#9A67EA",
          500: "#8A2BE2",
          600: "#7620C3",
          700: "#5D189A",
          800: "#130E1F",
          900: "#0B0812"
        },
        nebula: {
          amethyst: "#D946EF",
          cyan: "#00F0FF",
          gold: "#F5D06F"
        },
        surface: {
          50: "rgba(255,255,255,0.03)",
          100: "rgba(255,255,255,0.05)"
        }
      },
      boxShadow: {
        glow: "0 0 30px rgba(217, 70, 239, 0.3)",
        glowCyan: "0 0 30px rgba(0, 240, 255, 0.3)",
        glass: "0 24px 80px rgba(5, 8, 18, 0.55)"
      },
      fontFamily: {
        display: ["var(--font-display)", "serif"],
        body: ["var(--font-body)", "sans-serif"]
      },
      backgroundImage: {
        "nebula-radial": "radial-gradient(circle at top, rgba(217, 70, 239, 0.15), transparent 30%), radial-gradient(circle at 80% 0%, rgba(0, 240, 255, 0.12), transparent 26%), linear-gradient(180deg, #0B0812 0%, #130E1F 100%)"
      },
      borderRadius: {
        "4xl": "2rem"
      }
    }
  },
  plugins: []
};

export default config;