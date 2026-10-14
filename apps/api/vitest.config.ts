import { defineConfig } from "vitest/config";
import "dotenv/config";

// Decisão D6 do dono, tarefa T1: a suíte não escreve no banco de desenvolvimento.
//
// Antes desta linha não havia nada que impedisse: `src/config/env.ts` lê o
// `apps/api/.env` da máquina, e o `.env` declara o banco de desenvolvimento. Cada
// `npm test` — 317 segundos, 350 casos, dezenas de contas e casas criadas —
// deixava o rastro no banco de quem está trabalhando. A contagem medida antes
// desta mudança (541 usuários / 45 empresas / 49 vínculos, 42 delas com o nome do
// padrão dos helpers de teste) está no achado N55 de `docs/AUDITORIA.md`.
//
// Aqui o endereço do banco de prova vira o `DATABASE_URL` do processo de teste, e
// a suíte se recusa a subir sem ele: fallback silencioso para o banco de
// desenvolvimento é exatamente o acidente que se quer evitar. O dotenv não
// sobrescreve o que já existe no ambiente, então a injeção abaixo chega antes do
// `src/config/env.ts` rodar.
const BANCO_DE_PROVA = "nexusbusinessmanager_teste";

function nomeDoBanco(url: string | undefined): string {
  if (!url) return "";
  try {
    return new URL(url).pathname.replace(/^\//, "");
  } catch {
    return "";
  }
}

const URL_DE_PROVA = (process.env.DATABASE_URL_TESTE ?? "").trim();
if (!URL_DE_PROVA) {
  throw new Error(
    "DATABASE_URL_TESTE não está no apps/api/.env — a suíte se recusa a rodar no banco de desenvolvimento. " +
      "Declare a variável e rode `npm run db:prova` (decisão D6 do dono, achado N55)."
  );
}
if (nomeDoBanco(URL_DE_PROVA) !== BANCO_DE_PROVA) {
  throw new Error(
    `DATABASE_URL_TESTE aponta para "${nomeDoBanco(URL_DE_PROVA)}", e o nome combinado do banco de prova é ${BANCO_DE_PROVA}.`
  );
}
if (nomeDoBanco(process.env.DATABASE_URL) === BANCO_DE_PROVA) {
  throw new Error(
    "O DATABASE_URL do .env também aponta para o banco de prova: desenvolvimento e prova não podem ser o mesmo banco (D6)."
  );
}

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
    // `DATABASE_URL` é a linha da decisão D6: dentro do teste, o banco é sempre
    // o de prova, nunca o do servidor de desenvolvimento. `MAIL_TRANSPORT=memory`
    // é a linha da F4 (D1): sem ela, cada teste que pede recuperação de senha
    // imprimiria o código gerado no console do vitest — inútil (a caixa de teste
    // é injetada por quem precisa ler a mensagem) e barulhento para quem lê a
    // saída. Nenhum teste depende de escrever num servidor de e-mail.
    env: { RATE_LIMIT_MAX: "100000", DATABASE_URL: URL_DE_PROVA, MAIL_TRANSPORT: "memory" },

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
