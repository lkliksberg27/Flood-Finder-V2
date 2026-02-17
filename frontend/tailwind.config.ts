import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Flood status palette
        flood: {
          ok: "#22c55e",       // green-500
          warn: "#f59e0b",     // amber-500
          alert: "#ef4444",    // red-500
        },
        // Dark dashboard palette
        surface: {
          0: "#0a0e17",       // deepest background
          1: "#111827",       // card background
          2: "#1e293b",       // elevated surface
          3: "#334155",       // borders, dividers
        },
        accent: {
          DEFAULT: "#3b82f6", // primary blue
          muted: "#1e3a5f",
        },
      },
      fontFamily: {
        sans: ['"DM Sans"', "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "monospace"],
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "fade-in": "fadeIn 0.5s ease-out",
        "slide-up": "slideUp 0.4s ease-out",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
