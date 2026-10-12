import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// Configuração própria para a suíte do navegador: o vite.config.ts continua
// mandando no build, e aqui entra só o que o teste precisa — ambiente jsdom e o
// plugin do React para transformar o JSX dos componentes.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}"],
    // Os CSS do projeto não são carregados nos testes: o que se verifica aqui é
    // estado e declaração inline, não cascata de stylesheet.
    css: false,
  },
});
