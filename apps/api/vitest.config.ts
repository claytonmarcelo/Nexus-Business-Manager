import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["test/**/*.test.ts"],
    // Banco compartilhado: executa suites em série para evitar corrida de dados.
    pool: "forks",
    poolOptions: { forks: { singleFork: true } },
    testTimeout: 20000,
    hookTimeout: 20000,
  },
});
