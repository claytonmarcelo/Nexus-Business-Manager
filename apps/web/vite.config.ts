import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    host: true,
    proxy: {
      // Evita CORS no dev: o frontend fala /api e o Vite encaminha para a API.
      "/api": { target: "http://localhost:3001", changeOrigin: true },
    },
  },
});
