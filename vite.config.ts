import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "prompt",
      injectRegister: false,
      includeAssets: ["brand/*.png"],
      manifest: {
        id: "/",
        name: "FilaFlow · Inventario de filamentos",
        short_name: "FilaFlow",
        description: "Organiza tus bobinas, colores y gramos disponibles.",
        lang: "es",
        start_url: "/",
        scope: "/",
        display: "standalone",
        theme_color: "#2457d6",
        background_color: "#f5f7fa",
        icons: [
          {
            src: "/brand/filaflow-symbol-v1.png",
            sizes: "1254x1254",
            type: "image/png",
            purpose: "any",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,woff,woff2,png}"],
        navigateFallback: "index.html",
        cleanupOutdatedCaches: true,
        // Only static application assets are cached; Firebase requests stay online.
        runtimeCaching: [],
      },
    }),
  ],
  server: { port: 5173, strictPort: true },
  build: { sourcemap: false },
});
