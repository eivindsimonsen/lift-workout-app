import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { VitePWA } from "vite-plugin-pwa";
import { resolve } from "path";

export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      registerType: "prompt",
      version: "1.0.1",
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        skipWaiting: true,
        clientsClaim: true,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "supabase-cache",
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
              },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-cache",
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
            },
          },
        ],
      },
      includeAssets: ["favicon.ico", "apple-touch-icon.png", "masked-icon.svg"],
      manifest: {
        name: "Treningsloggen",
        short_name: "Treningsloggen",
        description: "Din personlige treningslogg med full kontroll over treningsøktene dine",
        version: "1.0.1",
        theme_color: "#1F2937",
        background_color: "#1F2937",
        display: "standalone",
        orientation: "portrait",
        scope: "/",
        start_url: "/",
        display_override: ["standalone", "minimal-ui"],
        edge_side_panel: {
          preferred_width: 400,
        },
        icons: [
          {
            src: "icon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any maskable",
          },
          {
            src: "icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
        categories: ["fitness", "health", "lifestyle"],
        lang: "no",
        dir: "ltr",
      },
      devOptions: {
        enabled: true,
        type: "module",
      },
      injectRegister: "auto",
    }),
  ],
  server: {
    host: "0.0.0.0", // Allow external connections
    port: 5173,
    // Allow all localtunnel URLs and other development domains
    allowedHosts: [
      "localhost",
      "127.0.0.1",
      ".loca.lt", // Allow all localtunnel subdomains
      ".tunnel.dev", // Allow all tunnel.dev subdomains
      ".serveo.net", // Allow all serveo subdomains
    ],
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
  define: {
    __VUE_OPTIONS_API__: true,
    __VUE_PROD_DEVTOOLS__: false,
  },
  optimizeDeps: {
    include: ["vue", "vue-router"],
  },
});
