// Senha do administrador global, usada apenas pelas provas e varreduras que fazem
// login real no navegador (tools/verify-*.cjs, tools/shoot-*.cjs, tools/audit-*.cjs).
//
// A senha nao mora neste repositorio. Ela e lida, nesta ordem:
//   1. NEXUS_ADMIN_EMAIL / NEXUS_ADMIN_SENHA no ambiente - a escrita de quem quer
//      uma conta especifica, e ela vale para os dois lados ao mesmo tempo;
//   2. tools/prova-admin.local.json - a conta de prova do banco
//      `nexusbusinessmanager_teste`, criada por `npm run db:prova`;
//   3. tools/senha-admin.local.cjs - arquivo local, ignorado pelo git, com
//      module.exports = "a senha" (a conta de desenvolvimento desta maquina);
//   4. SUPER_ADMIN_EMAIL do .env da API, so para o endereco.
// Sem a senha em nenhuma das fontes, a prova para na hora com um aviso claro em
// vez de mandar credencial errada para a API e falhar no meio do caminho.
//
// O degrau 2 entrou com a decisao D6 do dono (tarefa T1): as ferramentas de
// navegador so podem escrever no banco de prova, entao o administrador que elas
// usam e o daquele banco - endereco ficticio da RFC 6761, senha gerada na hora e
// gravada num arquivo local que o git nao pega. A conferencia de
// `tools/banco-de-prova.cjs` e o que prova, antes de cada escrita, que o servidor
// que atende a tela responde mesmo pelo banco de prova.
const fs = require("fs");
const path = require("path");

function lerContaDeProva() {
  const local = path.join(__dirname, "prova-admin.local.json");
  if (!fs.existsSync(local)) return null;
  try {
    const lida = JSON.parse(fs.readFileSync(local, "utf8"));
    if (lida && lida.email && lida.senha) return lida;
  } catch {
    // arquivo quebrado: a prova cai na ordem antiga e o aviso e o de sempre.
  }
  return null;
}

// Ambiente mandando em qualquer um dos dois lados deixa de lado a conta de prova:
// quem exportou NEXUS_ADMIN_* quer uma conta especifica, nao a que o banco de
// prova criou.
const CONTA_DE_PROVA = process.env.NEXUS_ADMIN_EMAIL || process.env.NEXUS_ADMIN_SENHA ? null : lerContaDeProva();

function lerSenha() {
  const doAmbiente = process.env.NEXUS_ADMIN_SENHA;
  if (doAmbiente) return doAmbiente;
  if (CONTA_DE_PROVA) return CONTA_DE_PROVA.senha;
  const local = path.join(__dirname, "senha-admin.local.cjs");
  if (fs.existsSync(local)) {
    const carregado = require(local);
    const senha = typeof carregado === "string" ? carregado : carregado && carregado.senha;
    if (senha) return senha;
  }
  console.error(
    "[provas] sem a senha do administrador. Prepare o banco de prova com `npm run db:prova`, ou crie " +
      "tools/senha-admin.local.cjs com module.exports = \"a senha\", ou exporte NEXUS_ADMIN_SENHA.",
  );
  process.exit(2);
}

// R2: o endereco do administrador global tambem saiu das ferramentas. A ordem e a
// mesma da senha, com a conta de prova no meio. O valor real nunca fica escrito em
// arquivo rastreado: o que a prova precisa e exatamente o que esta instalacao
// definiu.
function lerEmail() {
  if (process.env.NEXUS_ADMIN_EMAIL) return process.env.NEXUS_ADMIN_EMAIL;
  if (CONTA_DE_PROVA) return CONTA_DE_PROVA.email;
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
