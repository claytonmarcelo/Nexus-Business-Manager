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

// O e-mail do administrador e publico de proposito: e ele que a regra de acesso
// documenta no README e no CREDENCIAIS.md. O que se protege e a senha.
const EMAIL_ADMIN = "nexusbussiness.admin@gmail.com";

module.exports = { EMAIL_ADMIN, SENHA_ADMIN: lerSenha() };
