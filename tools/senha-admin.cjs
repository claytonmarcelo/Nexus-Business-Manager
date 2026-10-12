// Senha do administrador global, usada apenas pelas provas e varreduras que fazem
// login real no navegador (tools/verify-*.cjs, tools/shoot-*.cjs, tools/audit-*.cjs).
//
// A senha nao mora neste repositorio. Ela e lida, nesta ordem:
//   1. NEXUS_ADMIN_SENHA no ambiente;
//   2. tools/senha-admin.local.cjs - arquivo local, ignorado pelo git, com
//      module.exports = "a senha".
// Sem as duas, a prova para na hora com um aviso claro em vez de mandar
// credencial errada para a API e falhar no meio do caminho.
const fs = require("fs");
const path = require("path");

function lerSenha() {
  const doAmbiente = process.env.NEXUS_ADMIN_SENHA;
  if (doAmbiente) return doAmbiente;
  const local = path.join(__dirname, "senha-admin.local.cjs");
  if (fs.existsSync(local)) {
    const carregado = require(local);
    const senha = typeof carregado === "string" ? carregado : carregado && carregado.senha;
    if (senha) return senha;
  }
  console.error(
    "[provas] sem a senha do administrador. Crie tools/senha-admin.local.cjs com " +
      "module.exports = \"a senha\" ou exporte NEXUS_ADMIN_SENHA.",
  );
  process.exit(2);
}

// R2: o endereco do administrador global tambem saiu das ferramentas. A ordem e a
// mesma da senha - NEXUS_ADMIN_EMAIL no ambiente, depois o arquivo local
// ignorado, depois o SUPER_ADMIN_EMAIL do .env da API. O valor real nunca fica
// escrito em arquivo rastreado: o que a prova precisa e exatamente o que esta
// instalacao definiu.
function lerEmail() {
  if (process.env.NEXUS_ADMIN_EMAIL) return process.env.NEXUS_ADMIN_EMAIL;
  const local = path.join(__dirname, "senha-admin.local.cjs");
  if (fs.existsSync(local)) {
    const carregado = require(local);
    if (carregado && typeof carregado === "object" && carregado.email) return carregado.email;
  }
  const envDaApi = path.join(__dirname, "..", "apps", "api", ".env");
  if (fs.existsSync(envDaApi)) {
    const linha = fs.readFileSync(envDaApi, "utf8").match(/^SUPER_ADMIN_EMAIL=(.*)$/m);
    const valor = linha && linha[1].trim().replace(/^["']|["']$/g, "");
    if (valor) return valor;
  }
  console.error(
    "[provas] sem o endereco do administrador. Exporte NEXUS_ADMIN_EMAIL, ou",
      "defina SUPER_ADMIN_EMAIL no apps/api/.env, ou grave { email } em",
      "tools/senha-admin.local.cjs.",
  );
  process.exit(2);
}

const EMAIL_ADMIN = lerEmail();

module.exports = { EMAIL_ADMIN, SENHA_ADMIN: lerSenha() };
