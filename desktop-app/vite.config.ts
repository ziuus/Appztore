import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],

  // Expose all VITE_* env vars to the frontend (default behaviour, made explicit)
  envPrefix: "VITE_",

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },

  // Proxy backend API calls in dev so CORS is never an issue locally
  server: {
    proxy: {
      "/api": {
        target: process.env.VITE_API_ENDPOINT || "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },
});
