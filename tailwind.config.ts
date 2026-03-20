import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        forge: {
          bg: "rgb(var(--forge-bg) / <alpha-value>)",
          surface: "rgb(var(--forge-surface) / <alpha-value>)",
          glass: "rgb(var(--forge-glass) / <alpha-value>)",
          border: "rgb(var(--forge-border) / <alpha-value>)",
          fg: "rgb(var(--forge-fg) / <alpha-value>)",
          muted: "rgb(var(--forge-muted) / <alpha-value>)",
          red: "rgb(var(--forge-red) / <alpha-value>)",
          orange: "rgb(var(--forge-orange) / <alpha-value>)",
        },
      },
      boxShadow: {
        "forge-card": "var(--shadow-forge-card)",
        "forge-hero": "var(--shadow-forge-hero)",
        "forge-glow-red": "var(--shadow-forge-glow-red)",
        "forge-glow-orange": "var(--shadow-forge-glow-orange)",
      },
      backdropBlur: {
        forge: "18px",
      },
      animation: {
        "forge-overlay-fade": "forgeOverlayFade 220ms ease-out",
        "forge-panel-slide": "forgePanelSlideRight 260ms cubic-bezier(0.16, 1, 0.3, 1)",
        "forge-sheet-slide": "forgeSheetSlideBottom 260ms cubic-bezier(0.16, 1, 0.3, 1)",
        "forge-pop": "forgePopIn 360ms cubic-bezier(0.16, 1, 0.3, 1)",
      },
      keyframes: {
        forgeOverlayFade: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        forgePanelSlideRight: {
          "0%": { opacity: "0", transform: "translateX(32px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        forgeSheetSlideBottom: {
          "0%": { opacity: "0", transform: "translateY(32px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        forgePopIn: {
          "0%": { opacity: "0", transform: "translateY(18px) scale(0.985)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
