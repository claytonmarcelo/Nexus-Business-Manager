import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// As duas portas do painel saem de ambiente, com o padrao sendo a casa real:
// 5173 falando com a API 3001. A pilha de prova (tools/servidor-de-prova.cjs) passa
// 5174 e 3002 por variavel e assim existe sem encostar na porta de quem trabalha —
// foi o achado N65 (docs/AUDITORIA.md): com as duas janelas disputando a 3001, quem
// digitasse a senha no navegador real caia no banco de prova, onde a conta daquela
// pessoa nao existe. strictPort so vale quando a porta foi declarada: na casa real o
// comportamento de sempre (subir na proxima livre) permanece, e na prova uma porta
// ocupada e um erro que para a corrida, nao um endereco diferente no ponteiro.
const PORTA_DECLARADA = process.env.NEXUS_WEB_PORT || "";
const PORTA = Number(PORTA_DECLARADA || "5173");
const ALVO_DO_PROXY = process.env.NEXUS_PROXY_TARGET || "http://localhost:3001";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: PORTA,
    strictPort: PORTA_DECLARADA !== "",
    host: true,
    proxy: {
      // Evita CORS no dev: o frontend fala /api e o Vite encaminha para a API.
      "/api": { target: ALVO_DO_PROXY, changeOrigin: true },
    },
  },
});
