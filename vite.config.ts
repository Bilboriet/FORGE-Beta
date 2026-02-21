import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// https://vite.dev/config/
export default defineConfig({
  build: {
    // Current app bundle is intentionally large; avoid noisy non-blocking warning in CI logs.
    chunkSizeWarningLimit: 900,
  },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
      },
      devOptions: {
        enabled: true,
      },
      includeAssets: ["PWA-Icon.png"],
      manifest: {
        name: "FORGE",
        short_name: "FORGE",
        description: "Forge – strength training log",
        theme_color: "#0b0c0f",
        background_color: "#0b0c0f",
        display: "standalone",
        start_url: "/",
        icons: [
          {
            src: "/PWA-Icon.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any maskable",
          },
          {
            src: "/PWA-Icon.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
    }),
  ],
});
