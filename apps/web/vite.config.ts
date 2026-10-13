import { readFileSync } from "node:fs";
import { join } from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// A versão que o rodapé mostra é a do package.json, lida no build: nenhum
// componente digita número de versão, e a tela não pode prometer versão que o
// próprio pacote não tem.
const pacote = JSON.parse(readFileSync(join(__dirname, "package.json"), "utf8"));

export default defineConfig({
  define: { __APP_VERSION__: JSON.stringify(pacote.version) },
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
