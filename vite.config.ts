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
      injectRegister: "auto",
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
      },
      devOptions: {
        enabled: true,
      },
      includeAssets: ["NEWFORGEICON.PNG"],
      manifest: {
        name: "FORGE",
        short_name: "FORGE",
        description: "Forge – strength training log",
        theme_color: "#000000",
        background_color: "#000000",
        display: "standalone",
        start_url: "/",
        scope: "/",
        icons: [
          {
            src: "/NEWFORGEICON.PNG",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/NEWFORGEICON.PNG",
            sizes: "512x512",
            type: "image/png",
          },
        ],
      },
    }),
  ],
});



