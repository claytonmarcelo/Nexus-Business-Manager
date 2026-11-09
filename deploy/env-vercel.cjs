// Sobe o ambiente de produção da API no projeto da Vercel sem imprimir valor nenhum:
// lê o .env da raiz (SMTP e administrador), o .env.tidb.local (banco gerenciado) e
// gera os segredos que não podem ser reaproveitados do desenvolvimento.
//
//   node deploy/env-vercel.cjs prj_XXXX [--url https://painel.exemplo.app] [--team team_XXX]
//
// O token sai de VERCEL_TOKEN ou do auth.json do CLI da Vercel nesta máquina.
// Idempotente: chave que já existe no projeto é pulada, não sobrescrita — rodar de
// novo não invalida sessão de ninguém nem troca segredo no ar.
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const os = require("node:os");

const args = process.argv.slice(2);
const projectId = args.find((a) => a.startsWith("prj_"));
if (!projectId) {
  console.error("uso: node deploy/env-vercel.cjs prj_XXXX [--url https://...] [--team team_XXX]");
  process.exit(1);
}
const flag = (nome) => {
  const i = args.indexOf(nome);
  return i >= 0 ? args[i + 1] : undefined;
};
const teamId = flag("--team");
const webUrl = (flag("--url") || "https://nexus-business-manager.vercel.app").replace(/\/$/, "");

function lerEnv(arquivo) {
  const alvo = path.join(__dirname, "..", arquivo);
  if (!fs.existsSync(alvo)) return {};
  const saida = {};
  for (const linha of fs.readFileSync(alvo, "utf8").split(/\r?\n/)) {
    const m = linha.match(/^([A-Z_]+)=(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    saida[m[1]] = v;
  }
  return saida;
}

function token() {
  if (process.env.VERCEL_TOKEN) return process.env.VERCEL_TOKEN;
  const caminhos = [
    path.join(process.env.APPDATA || "", "com.vercel.cli", "Data", "auth.json"),
    path.join(os.homedir(), ".local", "share", "com.vercel.cli", "auth.json"),
    path.join(os.homedir(), ".vercel", "auth.json"),
  ];
  for (const c of caminhos) {
    if (c && fs.existsSync(c)) {
      const j = JSON.parse(fs.readFileSync(c, "utf8"));
      if (j.token) return j.token;
    }
  }
  console.error("sem token: defina VERCEL_TOKEN ou entre com `vercel login`");
  process.exit(1);
}

const raiz = lerEnv(".env");
const tidb = lerEnv(".env.tidb.local");
const obrigatorias = ["DATABASE_URL"];
for (const k of obrigatorias) {
  if (!tidb[k]) {
    console.error(`falta ${k} em .env.tidb.local (arquivo gitignored com a conexão do banco gerenciado)`);
    process.exit(1);
  }
}
for (const k of ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS", "MAIL_FROM", "SUPER_ADMIN_EMAIL"]) {
  if (!raiz[k]) {
    console.error(`falta ${k} no .env da raiz`);
    process.exit(1);
  }
}

const desejadas = {
  NODE_ENV: "production",
  DATABASE_URL: tidb.DATABASE_URL,
  JWT_ACCESS_SECRET: crypto.randomBytes(48).toString("base64url"),
  JWT_REFRESH_SECRET: crypto.randomBytes(48).toString("base64url"),
  TOTP_ENCRYPTION_KEY: crypto.randomBytes(32).toString("hex"),
  SUPER_ADMIN_EMAIL: raiz.SUPER_ADMIN_EMAIL,
  MAIL_TRANSPORT: "smtp",
  SMTP_HOST: raiz.SMTP_HOST,
  SMTP_PORT: raiz.SMTP_PORT,
  SMTP_USER: raiz.SMTP_USER,
  SMTP_PASS: raiz.SMTP_PASS,
  SMTP_SECURE: raiz.SMTP_SECURE || "",
  MAIL_FROM: raiz.MAIL_FROM,
  REQUIRE_EMAIL_VERIFICATION: "1",
  CORS_ORIGIN: webUrl,
  WEB_BASE_URL: webUrl,
  TRUST_PROXY: "1",
  CRON_ENABLED: "0",
  AUTH_EXPOSE_RESET_TOKEN: "0",
};

async function api(caminho, metodo = "GET", corpo) {
  const url = new URL("https://api.vercel.com" + caminho);
  if (teamId) url.searchParams.set("teamId", teamId);
  const r = await fetch(url, {
    method: metodo,
    headers: { Authorization: "Bearer " + token(), "Content-Type": "application/json" },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  const j = await r.json().catch(() => ({}));
  return { status: r.status, j };
}

(async () => {
  const atuais = await api(`/v10/projects/${projectId}/env`);
  if (atuais.status !== 200) {
    console.error("não li o ambiente do projeto:", atuais.status, atuais.j.error?.message || "");
    process.exit(1);
  }
  const existentes = new Set((atuais.j.envs || []).map((e) => e.key));
  let criadas = 0;
  let puladas = 0;
  for (const [key, value] of Object.entries(desejadas)) {
    if (existentes.has(key)) {
      puladas += 1;
      console.log(`  [pulada] ${key} já existe no projeto`);
      continue;
    }
    const r = await api(`/v10/projects/${projectId}/env`, "POST", {
      key,
      value,
      type: "encrypted",
      target: ["production", "preview"],
    });
    if (r.status !== 200 && r.status !== 201) {
      console.error(`  [falha] ${key}: ${r.status} ${r.j.error?.message || ""}`);
      process.exit(1);
    }
    criadas += 1;
    console.log(`  [criada] ${key}`);
  }
  console.log(`ambiente: ${criadas} criadas, ${puladas} puladas (valores nunca saem daqui)`);
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
