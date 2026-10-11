import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["test/**/*.test.ts"],
    // Banco compartilhado: executa suites em série para evitar corrida de dados.
    // No vitest 5 os dois botões são obrigatórios: `singleFork` reúne tudo em
    // um processo, `fileParallelism: false` fecha o agendador que por padrão
    // chegou a rodar arquivos em paralelo — com o banco dividido, um teste de
    // manutenção (503) do CMS atropelava o finance/clients do lado.
    pool: "forks",
    poolOptions: { forks: { singleFork: true } },
    fileParallelism: false,
    // O vitest 5 roda a suíte tão rápido que um arquivo inteiro ultrapassa os
    // 100req/min do limitador global — e a suíte passaria a tropeçar em 429
    // conforme a velocidade da máquina. Aqui o limitador global recebe folga
    // de ambiente (dotenv não sobrescreve o que já existe); os rate-limits
    // por rota — login, cadastro, recuperação — continuam nos valores reais,
    // porque é o comportamento deles que os testes de auth provam.
    env: { RATE_LIMIT_MAX: "100000" },
    testTimeout: 20000,
    hookTimeout: 20000,
    // Medidor de cobertura do prompt de auditoria (A0/C1). O `npm test` comum
    // continua igual; a medição só acontece em `npm run test:coverage`, porque
    // instrumentar cada arquivo deixa a suíte mais lenta e ninguém precisa
    // disso a cada correção.
    coverage: {
      provider: "v8",
      reportsDirectory: "./coverage",
      // Só o código de produção da API entra na conta. Os testes ficam de fora,
      // senão a cobertura subiria medindo a si mesma.
      include: ["src/**/*.ts"],
      exclude: ["src/server.ts", "src/**/*.d.ts"],
      reporter: ["text", "text-summary", "html", "lcov"],
      // Os portões mínimos por arquivo entram na Fase 7 (CI), quando a suíte
      // estiver completa. Antes disso um threshold alto quebraria o build sem
      // que houvesse nada a corrigir.
    },
  },
});
