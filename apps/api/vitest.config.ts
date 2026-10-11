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
  },
});
