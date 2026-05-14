import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./features/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "sans-serif",
        ],
      },
      colors: {
        bg: {
          primary: "var(--c-bg-primary)",
          secondary: "var(--c-bg-secondary)",
          card: "var(--c-bg-card)",
          elevated: "var(--c-bg-elevated)",
          input: "var(--c-bg-input)",
          overlay: "var(--c-bg-overlay)",
        },
        border: {
          DEFAULT: "var(--c-border)",
          accent: "var(--c-border-accent)",
        },
        fg: {
          primary: "var(--c-fg-primary)",
          secondary: "var(--c-fg-secondary)",
          muted: "var(--c-fg-muted)",
          label: "var(--c-fg-label)",
        },
        brand: {
          green: "#10b981",
          "green-hover": "#059669",
          "green-bg": "var(--c-green-bg)",
          "green-border": "rgba(16,185,129,0.3)",
          red: "#ef4444",
          "red-hover": "#dc2626",
          "red-bg": "var(--c-red-bg)",
          "red-border": "rgba(239,68,68,0.3)",
          blue: "#3b82f6",
          "blue-hover": "#2563eb",
          "blue-bg": "var(--c-blue-bg)",
          "blue-border": "rgba(59,130,246,0.3)",
        },
      },
      borderRadius: {
        sm: "6px",
        DEFAULT: "10px",
        lg: "14px",
      },
      boxShadow: {
        card: "0 4px 6px -1px rgba(0,0,0,0.3), 0 2px 4px -2px rgba(0,0,0,0.2)",
        modal:
          "0 10px 25px -5px rgba(0,0,0,0.5), 0 8px 10px -6px rgba(0,0,0,0.3)",
        "green-glow": "0 4px 12px rgba(16,185,129,0.3)",
        "red-glow": "0 4px 12px rgba(239,68,68,0.3)",
        "blue-glow": "0 2px 8px rgba(59,130,246,0.35)",
      },
      width: {
        sidebar: "260px",
      },
      spacing: {
        sidebar: "260px",
      },
    },
  },
  plugins: [],
};

export default config;
