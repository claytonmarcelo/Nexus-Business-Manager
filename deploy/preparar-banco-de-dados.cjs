// F6 (T5.1) — o bootstrap do banco de uma instalação nova, dentro do container.
//
// Desde a C1 (2026-10-15) o histórico de migrations começa com um baseline único
// (docs/adr/0024-baseline-de-migrations.md): `prisma migrate deploy` aplica em banco vazio
// e o achado N54 está fechado. O fallback de `db push` que existia aqui foi removido.
//
// O que o job faz:
//   1. `prisma migrate deploy` — aplica o baseline e todas as migrations seguintes.
//   2. Se a cadeia fechar com sucesso, o job termina com código 0.
//   3. Se falhar, o job reporta o erro e sai com código 1 — sem tentar nenhum caminho
//      alternativo. Um erro de migration numa instalação real é um problema a ser
//      corrigido na cadeia, não contornado por `db push`.

const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const RAIZ = process.cwd();
const ESQUEMA = path.join(RAIZ, "apps", "api", "prisma", "schema.prisma");

function falhar(mensagem) {
  console.error("[migracoes] " + mensagem);
  process.exit(1);
}

if (!fs.existsSync(ESQUEMA))
  falhar("schema nao encontrado em " + ESQUEMA + " — o job roda dentro da imagem da API, a partir de /app");

let saida;
try {
  saida = execFileSync(
    path.join(RAIZ, "node_modules", ".bin", "prisma"),
    ["migrate", "deploy", "--schema", ESQUEMA],
    { cwd: RAIZ, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }
  );
} catch (e) {
  const msg = String(e.stdout || "") + String(e.stderr || "");
  const linhaErro = msg.split(/\r?\n/).find((l) => /error|fail/i.test(l)) || msg.slice(0, 200);
  falhar("migrate deploy falhou: " + linhaErro.trim());
}

const aplicadas = (saida.match(/Applying migration/gi) || []).length;
const nadaPendente = /No pending migrations|already in sync/i.test(saida);
console.log("[migracoes] cadeia versionada aplicada: " + (nadaPendente ? "nenhuma pendencia" : aplicadas + " migration(s) nova(s)"));
process.exit(0);
