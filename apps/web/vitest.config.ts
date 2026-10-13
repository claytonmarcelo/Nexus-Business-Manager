import { readFileSync } from "node:fs";
import { join } from "node:path";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// Configuração própria para a suíte do navegador: o vite.config.ts continua
// mandando no build, e aqui entra só o que o teste precisa — ambiente jsdom e o
// plugin do React para transformar o JSX dos componentes.
// Mesma injeção do vite.config.ts: sem ela o teste montaria um rodapé sem versão
// e a suíte do navegador passaria longe do dado que a vitrine mostra.
const pacote = JSON.parse(readFileSync(join(__dirname, "package.json"), "utf8"));

export default defineConfig({
  define: { __APP_VERSION__: JSON.stringify(pacote.version) },
  plugins: [react()],
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}"],
    // Os CSS do projeto não são carregados nos testes: o que se verifica aqui é
    // estado e declaração inline, não cascata de stylesheet.
    css: false,
  },
});
