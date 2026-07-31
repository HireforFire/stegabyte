import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Brand accents — match PortfolioSite (indigo + cyan)
        indigo: {
          DEFAULT: "#6366f1",
          rgb: "99, 102, 241",
          muted: "rgba(99, 102, 241, 0.5)",
          glow: "rgba(99, 102, 241, 0.25)",
        },
        cyan: {
          DEFAULT: "#06b6d4",
          rgb: "6, 182, 212",
          muted: "rgba(6, 182, 212, 0.5)",
          glow: "rgba(6, 182, 212, 0.25)",
        },
        // Status colors
        emerald: {
          DEFAULT: "#10b981",
          muted: "rgba(16, 185, 129, 0.5)",
        },
        amber: {
          DEFAULT: "#f59e0b",
          muted: "rgba(245, 158, 11, 0.5)",
        },
        crimson: {
          DEFAULT: "#ef4444",
          muted: "rgba(239, 68, 68, 0.5)",
        },
        // Mono scale (used for opacity utilities like text-white/50)
        white: {
          DEFAULT: "#ffffff",
          90: "rgba(255, 255, 255, 0.9)",
          80: "rgba(255, 255, 255, 0.8)",
          70: "rgba(255, 255, 255, 0.7)",
          60: "rgba(255, 255, 255, 0.6)",
          50: "rgba(255, 255, 255, 0.5)",
          40: "rgba(255, 255, 255, 0.4)",
          30: "rgba(255, 255, 255, 0.3)",
          25: "rgba(255, 255, 255, 0.25)",
          20: "rgba(255, 255, 255, 0.2)",
          15: "rgba(255, 255, 255, 0.15)",
          10: "rgba(255, 255, 255, 0.1)",
          8: "rgba(255, 255, 255, 0.08)",
          6: "rgba(255, 255, 255, 0.06)",
          5: "rgba(255, 255, 255, 0.05)",
          3: "rgba(255, 255, 255, 0.03)",
          2: "rgba(255, 255, 255, 0.02)",
        },
        black: {
          DEFAULT: "#000000",
          95: "rgba(0, 0, 0, 0.95)",
          80: "rgba(0, 0, 0, 0.8)",
          60: "rgba(0, 0, 0, 0.6)",
          40: "rgba(0, 0, 0, 0.4)",
          20: "rgba(0, 0, 0, 0.2)",
        },
        // Backwards-compatible legacy aliases (existing code uses these)
        border: "rgba(255, 255, 255, 0.08)",
        input: "rgba(255, 255, 255, 0.08)",
        ring: "rgba(99, 102, 241, 0.5)",
        background: "#000000",
        foreground: "#ffffff",
        primary: {
          DEFAULT: "#6366f1",
          foreground: "#ffffff",
        },
        secondary: {
          DEFAULT: "rgba(255, 255, 255, 0.05)",
          foreground: "rgba(255, 255, 255, 0.7)",
        },
        muted: {
          DEFAULT: "rgba(255, 255, 255, 0.03)",
          foreground: "rgba(255, 255, 255, 0.4)",
        },
        accent: {
          DEFAULT: "#06b6d4",
          foreground: "#ffffff",
        },
        card: {
          DEFAULT: "rgba(0, 0, 0, 0.6)",
          foreground: "#ffffff",
        },
        destructive: {
          DEFAULT: "#ef4444",
          foreground: "#ffffff",
        },
        electric: {
          DEFAULT: "#06b6d4",
          blue: "#3b82f6",
          purple: "#a855f7",
        },
      },
      borderRadius: {
        lg: "0.5rem",
        md: "0.375rem",
        sm: "0.25rem",
      },
      backdropBlur: {
        xs: "2px",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "fade-up": {
          from: { opacity: "0", transform: "translateY(16px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "fade-down": {
          from: { opacity: "0", transform: "translateY(-16px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "pulse-glow-indigo": {
          "0%, 100%": { boxShadow: "0 0 20px rgba(99, 102, 241, 0.15)" },
          "50%": { boxShadow: "0 0 40px rgba(99, 102, 241, 0.3)" },
        },
        "pulse-glow-cyan": {
          "0%, 100%": { boxShadow: "0 0 20px rgba(6, 182, 212, 0.15)" },
          "50%": { boxShadow: "0 0 40px rgba(6, 182, 212, 0.3)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" },
        },
        "scan-line": {
          "0%": { top: "0%", opacity: "0" },
          "10%": { opacity: "0.6" },
          "90%": { opacity: "0.6" },
          "100%": { top: "100%", opacity: "0" },
        },
        "node-float": {
          "0%": { opacity: "0", transform: "translateY(0) scale(0)" },
          "20%": { opacity: "0.6", transform: "translateY(-15px) scale(1)" },
          "80%": { opacity: "0.6", transform: "translateY(-45px) scale(1)" },
          "100%": { opacity: "0", transform: "translateY(-60px) scale(0)" },
        },
        "pulse-line": {
          "0%": { width: "0%", opacity: "0", left: "50%" },
          "30%": { opacity: "0.12", width: "100%", left: "0%" },
          "70%": { opacity: "0.12", width: "100%", left: "0%" },
          "100%": { width: "0%", opacity: "0", left: "50%" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.4s ease-out",
        "fade-up": "fade-up 0.5s ease-out",
        "fade-down": "fade-down 0.5s ease-out",
        shimmer: "shimmer 2.2s linear infinite",
        "pulse-glow-indigo": "pulse-glow-indigo 4s ease-in-out infinite",
        "pulse-glow-cyan": "pulse-glow-cyan 4s ease-in-out infinite",
        float: "float 6s ease-in-out infinite",
        "scan-line": "scan-line 5s linear infinite",
        "node-float": "node-float 5s ease-in-out infinite",
        "pulse-line": "pulse-line 6s ease-in-out infinite",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
