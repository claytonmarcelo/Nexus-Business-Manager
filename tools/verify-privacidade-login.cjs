// F5, item 1 (Problema C): privacidade do formulario de entrada, medida em Chrome
// e em Edge, nos dois navegadores reais desta maquina.
//
// O que a tela promete e o que esta prova mede, navegador por navegador:
//   1. o formulario monta sempre vazio — inclusive quando ha um e-mail lembrado;
//   2. o campo de e-mail nao se oferece ao gerenciador de senhas (autoComplete
//      "off", name/id neutros) e o de senha pede "new-password";
//   3. os dois campos continuam tendo rotulo associado (a neutralidade nao pode
//      virar campo sem nome para quem usa leitor de tela);
//   4. a senha digita e zerada depois do envio, quando a tela desmonta e quando o
//      navegador devolve a pagina do historico (pageshow persistida);
//   5. nenhum armazenamento do navegador guarda a senha;
//   6. o e-mail lembrado sai do navegador em todo logout, e a preferencia de tema
//      fica no lugar;
//   7. se o proprio navegador preencher algum campo ao reabrir a tela, isto e
//      medido e informado — preenchimento de navegador e limitacao dele, nao da
//      aplicacao, e por isso aparece aqui como resultado real.
//
// A falha de credencial usa um endereco que nao existe em lugar nenhum
// (exemplo.invalido, RFC 6761). A contagem de bloqueio do servidor e chaveada por
// endereco, entao uma tentativa errada contra uma conta que nao existe nao chega
// perto de trancar a conta de prova.
//
// Nenhum valor de segredo e impresso: a senha aparece apenas como comparacao.
const puppeteer = require("puppeteer-core");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { EMAIL_ADMIN, SENHA_ADMIN } = require("./senha-admin.cjs");
const { conferirServidorDeProva } = require("./banco-de-prova.cjs");

const BASE = require("./pilha-de-prova.cjs").baseDoNavegador();
const CHAVE_LEMBRADO = "nexus.remember.email";
const CHAVE_TEMA = "nexus.theme";
const ENDERECO_INEXISTENTE = "ninguem@exemplo.invalido";
const SENHA_FALSA_DE_PROVA = "SenhaQueNaoExiste1!";

const NAVEGADORES = [
  { nome: "Chrome", executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" },
  { nome: "Edge", executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" },
];

let total = 0;
let falhas = 0;
function ok(cond, msg) {
  total++;
  if (cond) console.log("OK    " + msg);
  else {
    falhas++;
    console.log("FAIL  " + msg);
  }
}

const espera = (ms) => new Promise((r) => setTimeout(r, ms));

/** Estado dos dois campos: valor, atributos que o navegador le, rotulo associado. */
function lerCampos() {
  const pega = (seletor) => {
    const el = document.querySelector(seletor);
    if (!el) return null;
    const rotulos = [...el.labels || []].map((l) => (l.textContent || "").trim());
    return {
      value: el.value,
      autocomplete: el.autocomplete,
      name: el.getAttribute("name"),
      id: el.id,
      type: el.type,
      rotulo: rotulos,
    };
  };
  return { email: pega('input[type="email"]'), senha: pega('input[type="password"]') };
}

function armazenamentoDaAba() {
  const chaves = [];
  for (const area of [localStorage, sessionStorage]) {
    for (let i = 0; i < area.length; i++) {
      const k = area.key(i);
      chaves.push({ area: area === localStorage ? "local" : "session", chave: k, valor: area.getItem(k) });
    }
  }
  return chaves;
}

async function novaAba(browser) {
  const page = await browser.newPage();
  await page.evaluateOnNewDocument(() => {
    window.__pageshow = { disparou: false, persistida: false };
    window.addEventListener(
      "pageshow",
      (evento) => {
        window.__pageshow = { disparou: true, persistida: Boolean(evento.persisted) };
      },
      true,
    );
  });
  return page;
}

async function vaParaLogin(page) {
  await page.goto(BASE + "/login", { waitUntil: "networkidle0" });
  await page.waitForSelector('input[type="email"]');
  await page.waitForSelector('input[type="password"]');
}

async function provaNavegador(navegador) {
  console.log("");
  console.log("── " + navegador.nome + " ──────────────────────────────────────────────");
  if (!fs.existsSync(navegador.executablePath)) {
    ok(false, navegador.nome + " nao esta instalado neste computador (" + navegador.executablePath + ")");
    return;
  }

  // Perfil novo: sem senha salva, sem historico de formulario. Do jeito que
  // qualquer pessoa abre o navegador numa maquina que nunca viu o sistema.
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "nexus-privacidade-"));
  const browser = await puppeteer.launch({
    executablePath: navegador.executablePath,
    headless: "new",
    userDataDir,
    args: ["--no-sandbox", "--disable-gpu"],
    defaultViewport: { width: 1440, height: 900 },
  });

  try {
    const page = await novaAba(browser);

    // 1 e 2 e 3. Montagem limpa e contrato de atributos.
    await vaParaLogin(page);
    await page.evaluate((chave) => localStorage.removeItem(chave), CHAVE_LEMBRADO);
    await page.reload({ waitUntil: "networkidle0" });
    await espera(400);
    let campos = await page.evaluate(lerCampos);
    ok(Boolean(campos.email) && Boolean(campos.senha), navegador.nome + ": os dois campos existem na tela");
    ok(campos.email.value === "", navegador.nome + ": o campo de e-mail monta vazio");
    ok(campos.senha.value === "", navegador.nome + ": o campo de senha monta vazio");
    ok(campos.email.autocomplete === "off", navegador.nome + ": e-mail com autoComplete off (" + campos.email.autocomplete + ")");
    ok(
      campos.senha.autocomplete === "new-password",
      navegador.nome + ": senha com autoComplete new-password (" + campos.senha.autocomplete + ")",
    );
    const neutros = [campos.email.name, campos.email.id, campos.senha.name, campos.senha.id]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    ok(
      neutros.length > 0 && !/mail|user|usuario|login|conta|senha|password/.test(neutros),
      navegador.nome + ": name/id neutros, sem entregar o campo ao gerenciador de senhas",
    );
    ok(
      campos.email.rotulo.includes("E-mail") && campos.senha.rotulo.includes("Senha"),
      navegador.nome + ": os dois campos tem rotulo associado (leitor de tela acha pelo texto)",
    );

    // 4a. A senha zero depois do envio, no unico caso em que a tela continua
    // aberta: a credencial recusada.
    await page.type('input[type="email"]', ENDERECO_INEXISTENTE, { delay: 3 });
    await page.type('input[type="password"]', SENHA_FALSA_DE_PROVA, { delay: 3 });
    await page.click(".neu-btn");
    await page.waitForSelector(".form-error", { timeout: 20000 });
    campos = await page.evaluate(lerCampos);
    ok(campos.senha.value === "", navegador.nome + ": a senha digita e zerada depois que o envio falha");

    // 5 e 6. Login verdadeiro com "lembrar de mim": o que fica no navegador.
    await page.evaluate((chave) => localStorage.removeItem(chave), CHAVE_LEMBRADO);
    await page.reload({ waitUntil: "networkidle0" });
    await page.waitForSelector('input[type="email"]');
    await page.type('input[type="email"]', EMAIL_ADMIN, { delay: 3 });
    await page.type('input[type="password"]', SENHA_ADMIN, { delay: 3 });
    await page.click(".neu-check");
    await page.click(".neu-btn");
    await page.waitForFunction(() => location.pathname.startsWith("/app"), { timeout: 30000 });
    await espera(600);
    const guardado = await page.evaluate((chave) => localStorage.getItem(chave), CHAVE_LEMBRADO);
    ok(guardado === EMAIL_ADMIN, navegador.nome + ": o e-mail lembrado ficou no navegador");
    const items = await page.evaluate(armazenamentoDaAba);
    const chavesComSenha = items.filter((entrada) => String(entrada.valor).includes(SENHA_FALSA_DE_PROVA) || String(entrada.valor).includes(SENHA_ADMIN));
    ok(chavesComSenha.length === 0, navegador.nome + ": nenhuma chave de armazenamento carrega a senha (" + items.length + " chaves lidas)");
    const urlComSenha = await page.evaluate((senha) => location.href.includes(senha), SENHA_ADMIN);
    ok(!urlComSenha, navegador.nome + ": a URL nao carrega a senha");

    // 4b. Desmontar a tela: o painel toma o lugar do formulario.
    const sobrouFormulario = await page.evaluate(() => Boolean(document.querySelector('input[type="password"]')));
    ok(!sobrouFormulario, navegador.nome + ": ao entrar, o formulario de entrada sai de tela");

    // 1 (de novo) e 7. Reabrir o login: campo vazio, sem preenchimento do navegador.
    await vaParaLogin(page);
    await espera(1200);
    campos = await page.evaluate(lerCampos);
    ok(campos.senha.value === "", navegador.nome + ": reabrir o login nao devolve senha escrita");
    ok(
      campos.email.value === "",
      navegador.nome + ": reabrir o login nao pre-preenche o e-mail (valor: '" + campos.email.value + "')",
    );
    const dica = await page.evaluate(() => {
      const el = document.querySelector(".auth-hint");
      return el ? (el.textContent || "").trim() : null;
    });
    ok(Boolean(dica), navegador.nome + ": a dica do e-mail lembrado aparece no lugar do campo preenchido");

    // 6. S6: entrar so com a senha, usando o lembrado em silencio, e depois sair.
    await page.type('input[type="password"]', SENHA_ADMIN, { delay: 3 });
    await page.click(".neu-btn");
    await page.waitForFunction(() => location.pathname.startsWith("/app"), { timeout: 30000 });
    ok(true, navegador.nome + ": a senha so abriu a sessao com o e-mail lembrado");

    await page.evaluate(() => localStorage.setItem("nexus.theme", "light"));
    await page.reload({ waitUntil: "networkidle0" });
    await espera(700);
    await page.evaluate(() => {
      const el = [...document.querySelectorAll("button,a")].find((b) => (b.textContent || "").trim().endsWith("Sair"));
      if (el) el.click();
    });
    await page.waitForFunction(() => location.pathname === "/", { timeout: 20000 }).catch(() => undefined);
    await espera(400);
    const depoisDoSair = await page.evaluate((chaves) => ({
      lembrado: localStorage.getItem(chaves[0]),
      tema: localStorage.getItem(chaves[1]),
      refresh: localStorage.getItem("nexus.refresh"),
    }), [CHAVE_LEMBRADO, CHAVE_TEMA]);
    ok(depoisDoSair.lembrado === null, navegador.nome + ": todo logout apaga o e-mail lembrado");
    ok(depoisDoSair.refresh === null, navegador.nome + ": o refresh token saiu junto");
    ok(depoisDoSair.tema === "light", navegador.nome + ": a preferencia de tema do navegador continua");

    // 4c. Paginas devolvidas do historico: o bfcache reusa o mesmo documento.
    const abaHistorico = await novaAba(browser);
    await vaParaLogin(abaHistorico);
    await abaHistorico.type('input[type="email"]', ENDERECO_INEXISTENTE, { delay: 3 });
    await abaHistorico.type('input[type="password"]', SENHA_FALSA_DE_PROVA, { delay: 3 });
    const senhaAntes = await abaHistorico.evaluate(() => document.querySelector('input[type="password"]').value);
    await abaHistorico.goto(BASE + "/", { waitUntil: "networkidle0" });
    await espera(300);
    await abaHistorico.goBack({ waitUntil: "networkidle0" });
    await espera(900);
    const volta = await abaHistorico.evaluate(() => {
      const campo = document.querySelector('input[type="password"]');
      return {
        pagineshow: window.__pageshow || null,
        valor: campo ? campo.value : "(campo novo, vazio por construcao)",
      };
    });
    ok(senhaAntes === SENHA_FALSA_DE_PROVA, navegador.nome + ": a senha estava escrita antes de sair da tela");
    ok(
      volta.valor === "" || volta.valor === "(campo novo, vazio por construcao)",
      navegador.nome + ": o voltar do navegador nao devolve a senha escrita (pageshow " + JSON.stringify(volta.pagineshow) + ")",
    );

    // 7. Autofill de formulario com historico: mesma pagina, novo contexto de
    // aba, depois de a tela ter visto um endereco digitado.
    const abaHistoricoForm = await novaAba(browser);
    await vaParaLogin(abaHistoricoForm);
    await espera(1500);
    const preenchimento = await abaHistoricoForm.evaluate(lerCampos);
    console.log(
      "INFO  " +
        navegador.nome +
        ": preenchimento automatico observado na reabertura — e-mail '" +
        preenchimento.email.value +
        "', senha " +
        (preenchimento.senha.value.length === 0 ? "vazia" : "preenchida (" + preenchimento.senha.value.length + " chars)") +
        ".",
    );
    ok(
      preenchimento.senha.value === "",
      navegador.nome + ": o navegador nao recheia o campo de senha na reabertura",
    );

    await page.close();
    await abaHistorico.close();
    await abaHistoricoForm.close();
  } finally {
    await browser.close();
    try {
      fs.rmSync(userDataDir, { recursive: true, force: true });
    } catch {
      /* o temp do navegador sai com o resto da maquina */
    }
  }
}

(async () => {
  // D6: so escreve no banco de prova; a conferencia para a prova se o servidor
  // que atende a tela responde por outro banco.
  await conferirServidorDeProva();

  for (const navegador of NAVEGADORES) {
    await provaNavegador(navegador);
  }

  console.log("");
  console.log(total + " verificacoes nos dois navegadores, " + falhas + " falhas");
  console.log(falhas === 0 ? "ok: privacidade do login verificada em Chrome e Edge" : "FALHOU");
  if (falhas > 0) process.exitCode = 1;
})().catch((e) => {
  console.error("falha:", e.message);
  process.exit(1);
});
