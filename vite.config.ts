import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

const backendPort = process.env.PORT ?? "8787";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icon.svg"],
      manifest: {
        name: "Tal-Echo Auftritte",
        short_name: "Tal-Echo",
        description: "Auftrittsanfragen für das Ländlertrio Tal-Echo erfassen, abstimmen und im Kalender festhalten",
        theme_color: "#4a3223",
        background_color: "#f5ead9",
        display: "standalone",
        start_url: "/",
        icons: [
          {
            src: "icon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any maskable"
          }
        ]
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg}"]
      }
    })
  ],
  server: {
    // Erlaubt Zugriff über einen Cloudflare Quick Tunnel (z.B. für Tests übers
    // Mobilfunknetz), da Vite standardmässig unbekannte Hostnamen blockt.
    allowedHosts: [".trycloudflare.com"],
    proxy: {
      "/api": {
        target: `http://localhost:${backendPort}`,
        changeOrigin: true
      },
      "/uploads": {
        target: `http://localhost:${backendPort}`,
        changeOrigin: true
      }
    }
  }
});
