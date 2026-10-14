// F6 (T5.1) — o bootstrap do banco de uma instalação nova, dentro do container.
//
// Duas trilhas, e a segunda existe por causa de um achado já registrado:
//
//  1. A trilha certa: `prisma migrate deploy` aplica a cadeia versionada. Se ela fechar, o job
//     termina aqui e não encosta em mais nada.
//  2. A trilha do achado **N54**: a cadeia não reconstitui um MySQL zerado. As migrations de
//     `20261010164015_add_clients` em diante redeclaram `company_users_user_id_fkey` e
//     `company_users_company_id_fkey`, e no MySQL o nome de uma chave vale para o banco inteiro —
//     o `deploy` para com `P3018 / 1826 Duplicate foreign key constraint name`. É o mesmo caminho
//     que `tools/preparar-banco-de-prova.cjs` usa para o banco de prova desde a T1: montar a
//     estrutura atual do schema (`db push`) e marcar o histórico das migrations como aplicado
//     (`migrate resolve --applied`), que é exatamente como um banco que já tem estrutura entra na
//     contabilidade do Prisma.
//
// A trilha 2 nunca roda num banco com dado de alguém: a guarda de linhas vem antes de qualquer
// escrita, e a recusa tem código de saída 1. Apagar um volume de prova é decisão de quem apaga
// (`docker compose down -v`); apagar uma instalação em uso não é decisão de script.
//
// O conserto definitivo do N54 — reescrever as migrations com nomes de chave únicos — está fora
// desta tarefa por regra da casa: migration já aplicada não se edita. Ele continua na T7 (clone
// limpo) e é medido aqui em vez de escondido.

const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const RAIZ = process.cwd();
const ESQUEMA = path.join(RAIZ, "apps", "api", "prisma", "schema.prisma");
const PASTA_DE_MIGRATIONS = path.join(RAIZ, "apps", "api", "prisma", "migrations");
const CLI = path.join(RAIZ, "node_modules", ".bin", "prisma");

function prisma(args) {
  try {
    const saida = execFileSync(CLI, args, { cwd: RAIZ, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    return { ok: true, saida };
  } catch (e) {
    return { ok: false, saida: String(e.stdout || "") + String(e.stderr || "") };
  }
}

function falhar(mensagem) {
  console.error("[migracoes] " + mensagem);
  process.exit(1);
}

if (!fs.existsSync(ESQUEMA)) falhar("schema nao encontrado em " + ESQUEMA + " — o job roda dentro da imagem da API, a partir de /app");

const primeiras = prisma(["migrate", "deploy", "--schema", ESQUEMA]);
if (primeiras.ok) {
  const aplicadas = (primeiras.saida.match(/Applying migration/gi) || []).length;
  const nadaPendente = /No pending migrations|already in sync/i.test(primeiras.saida);
  console.log("[migracoes] cadeia versionada aplicada: " + (nadaPendente ? "nenhuma pendencia" : aplicadas + " migration(s) nova(s)"));
  process.exit(0);
}

const erro = (primeiras.saida.split(/\r?\n/).find((l) => /Duplicate|error code|P3018/i.test(l)) || "erro desconhecido").trim();
console.warn("[migracoes] ATENCAO (achado N54): a cadeia versionada nao reconstitui um banco zerado — " + erro);
console.warn("[migracoes] trilha alternativa: estrutura atual do schema + historico marcado como aplicado.");

// A guarda precisa de conexão com o banco, e o cliente Prisma gerado está na imagem. O require é
// tardio de propósito: na trilha 1 ele nem chega a acontecer.
let c = null;
try {
  const { PrismaClient } = require("@prisma/client");
  c = new PrismaClient();
} catch (e) {
  falhar("sem cliente Prisma nao da para conferir o banco: " + String(e.message).slice(0, 120));
}

(async () => {
  const nome = new URL(process.env.DATABASE_URL).pathname.slice(1);
  const brutas = await c.$queryRaw`SELECT table_name AS t
                                   FROM information_schema.tables
                                   WHERE table_schema = ${nome} AND table_type = 'BASE TABLE'`;
  // Contagem exata, tabela a tabela: `information_schema.table_rows` no InnoDB é estimativa e
  // pode dizer zero numa casa com linhas. A guarda que decide "este banco tem dado de alguém" não
  // pode se apoiar em estimativa.
  let linhas = 0;
  const nomes = brutas.map((r) => String(r.t)).filter((t) => /^[A-Za-z0-9_]+$/.test(t));
  for (const t of nomes) {
    if (t === "_prisma_migrations") continue;
    const r = await c.$queryRawUnsafe("SELECT COUNT(*) AS n FROM `" + t + "`");
    linhas += Number((r[0] || {}).n || 0);
  }
  if (linhas > 0) {
    await c.$disconnect();
    falhar(
      "o banco " + nome + " tem " + linhas + " linha(s) em " + nomes.length + " tabela(s); o baseline do N54 so roda em banco sem dado de ninguem. " +
        "Numa pilha de prova apague o volume (`docker compose down -v`); numa instalacao real conserte a cadeia de migrations antes de subir."
    );
  }

  const push = prisma(["db", "push", "--skip-generate", "--schema", ESQUEMA]);
  if (!push.ok) {
    await c.$disconnect();
    falhar("db push falhou: " + push.saida.split(/\r?\n/).filter(Boolean).slice(-3).join(" / "));
  }

  const pastas = fs
    .readdirSync(PASTA_DE_MIGRATIONS)
    .filter((p) => fs.existsSync(path.join(PASTA_DE_MIGRATIONS, p, "migration.sql")))
    .sort();
  let marcadas = 0;
  let jaNoHistorico = 0;
  let comErro = 0;
  for (const pasta of pastas) {
    const r = prisma(["migrate", "resolve", "--applied", pasta, "--schema", ESQUEMA]);
    // P3008 e "ja esta no historico": a cadeia interrompida deixou a primeira migration aplicada,
    // e re-marcar o que ja foi marcado nao e erro de contabilidade, e sim o estado real do banco.
    if (r.ok) marcadas += 1;
    else if (/P3008|already recorded as applied/i.test(r.saida)) jaNoHistorico += 1;
    else comErro += 1;
  }
  if (comErro > 0 || marcadas + jaNoHistorico !== pastas.length) {
    await c.$disconnect();
    falhar("o baseline nao fechou a conta: " + marcadas + " marcada(s) + " + jaNoHistorico + " ja no historico de " + pastas.length);
  }

  const depois = prisma(["migrate", "deploy", "--schema", ESQUEMA]);
  await c.$disconnect();
  if (!depois.ok) falhar("mesmo depois do baseline o deploy nao fecha: " + depois.saida.split(/\r?\n/).filter(Boolean).slice(-3).join(" / "));

  console.log(
    "[migracoes] banco montado pela estrutura atual do schema e historico marcado: " +
      marcadas + " marcada(s) nova(s) + " + jaNoHistorico + " ja no historico = " + pastas.length + " migrations; `migrate deploy` nao tem pendencia"
  );
})().catch((e) => falhar("falha ao conferir o banco: " + String(e.message || e).slice(0, 200)));
