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
          "var(--font-sans)",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "sans-serif",
        ],
        display: [
          "var(--font-geist-sans)",
          "var(--font-sans)",
          "-apple-system",
          "sans-serif",
        ],
        mono: [
          "var(--font-mono)",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "monospace",
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
        // Tokens semânticos contábeis — uso preferido em código novo.
        credit: {
          DEFAULT: "var(--c-credit)",
          hover: "var(--c-credit-hover)",
          bg: "var(--c-credit-bg)",
          border: "var(--c-credit-border)",
        },
        debit: {
          DEFAULT: "var(--c-debit)",
          hover: "var(--c-debit-hover)",
          bg: "var(--c-debit-bg)",
          border: "var(--c-debit-border)",
        },
        accent: {
          DEFAULT: "var(--c-accent)",
          hover: "var(--c-accent-hover)",
          bg: "var(--c-accent-bg)",
          border: "var(--c-accent-border)",
          ink: "var(--c-accent-ink)",
        },
        // Aliases de compatibilidade: classes brand-* legadas mapeadas para os tokens Ledger.
        // (green→credit, red→debit, blue→accent.) Permite migrar telas gradualmente.
        brand: {
          green: "var(--c-credit)",
          "green-hover": "var(--c-credit-hover)",
          "green-bg": "var(--c-credit-bg)",
          "green-border": "var(--c-credit-border)",
          red: "var(--c-debit)",
          "red-hover": "var(--c-debit-hover)",
          "red-bg": "var(--c-debit-bg)",
          "red-border": "var(--c-debit-border)",
          blue: "var(--c-accent)",
          "blue-hover": "var(--c-accent-hover)",
          "blue-bg": "var(--c-accent-bg)",
          "blue-border": "var(--c-accent-border)",
        },
      },
      borderRadius: {
        sm: "3px",
        DEFAULT: "4px",
        lg: "6px",
      },
      boxShadow: {
        // Sombras mais contidas — superfícies se distinguem por hairlines, não por elevação dramática.
        card: "0 1px 0 0 rgba(0,0,0,0.25)",
        modal:
          "0 16px 40px -12px rgba(0,0,0,0.55), 0 4px 12px -4px rgba(0,0,0,0.3)",
        // Glows neutralizados — não usar em código novo.
        "green-glow": "none",
        "red-glow": "none",
        "blue-glow": "none",
      },
      width: {
        sidebar: "240px",
      },
      spacing: {
        sidebar: "240px",
      },
    },
  },
  plugins: [],
};

export default config;
