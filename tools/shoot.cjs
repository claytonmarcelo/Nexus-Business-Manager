// Captura as telas reais do Nexus Business Manager (Chrome headless) para o README.
//
// Duas contas, cada uma no que lhe cabe:
//  - a conta ficticia de captura (tools/conta-de-captura.cjs) entra em toda tela
//    que mostra identidade: a listagem de Usuarios e as Configurações da conta;
//  - o administrador da plataforma so aparece nas telas de fluxo (Dashboard,
//    Auditoria), que precisam da empresa de demonstracao cheia e nao mostram
//    e-mail nem senha de ninguem.
// A senha nunca fica a vista: nenhum print clica no botao de revelar, e a tela de
// login e fotografada vazia, do jeito que quem chega encontra.
//
// NEXUS_PROVA_FOTOS=02-login,04-usuarios limita as capturas desta corrida: o que
// nao e pedido continua no repositorio exatamente como esta, sem ruido de diff.
const puppeteer = require("puppeteer-core");
const fs = require("fs");
const path = require("path");
const { EMAIL_ADMIN, SENHA_ADMIN } = require("./senha-admin.cjs");
const { contaDeCaptura } = require("./conta-de-captura.cjs");
const { conferirServidorDeProva } = require("./banco-de-prova.cjs");

const OUT = path.join(__dirname, "..", "docs", "screenshots");
fs.mkdirSync(OUT, { recursive: true });

const BASE = "http://localhost:5173";

const PEDIDO = (process.env.NEXUS_PROVA_FOTOS || "")
  .split(",")
  .map((nome) => nome.trim())
  .filter(Boolean);
const quer = (nome) => PEDIDO.length === 0 || PEDIDO.includes(nome);

// Cada tela declara de qual conta ela precisa (null = nao precisa de sessao).
const TELAS = [
  { foto: "01-landing", conta: null },
  { foto: "02-login", conta: null },
  { foto: "03-dashboard", conta: "administrador" },
  { foto: "05-auditoria", conta: "administrador" },
  { foto: "04-usuarios", conta: "captura" },
  { foto: "06-configuracoes-claro", conta: "captura" },
];

async function shot(page, nome) {
  await new Promise((r) => setTimeout(r, 600));
  await page.screenshot({ path: path.join(OUT, nome + ".png") });
  console.log("capturado", nome);
}

// Entrar de verdade pela tela, sem nunca mostrar o que foi digitado.
async function entrar(page, conta) {
  const { email, senha } =
    conta === "captura" ? contaDeCaptura() : { email: EMAIL_ADMIN, senha: SENHA_ADMIN };
  await page.goto(BASE + "/login", { waitUntil: "networkidle0" });
  await page.evaluate(() => localStorage.clear());
  await page.goto(BASE + "/login", { waitUntil: "networkidle0" });
  await page.waitForSelector("input[type=email]", { timeout: 15000 });
  await page.waitForSelector("input[type=password]", { timeout: 15000 });
  await page.type("input[type=email]", email, { delay: 5 });
  await page.type("input[type=password]", senha, { delay: 5 });
  await Promise.all([
    page.waitForFunction(() => window.location.pathname.startsWith("/app"), { timeout: 15000 }),
    page.click("button[type=submit]"),
  ]);
  await new Promise((r) => setTimeout(r, 1200));
  console.log("sessao aberta com a conta", conta);
}

// A regra de auto-OWNER da Fase 1b (auth.service.ts) poe o administrador da
// plataforma em toda empresa nova, entao a lista de usuarios da empresa de
// captura tem o endereco real dele junto. O print e feito com a busca da
// propria tela filtrando o e-mail ficticio: nenhuma identidade de pessoa sai
// do repositorio. A decisao de fundo sobre essa regra e o G8 (docs/decisoes/).
async function soDaCaptura(page) {
  const campo = 'input[aria-label="Buscar usuários"]';
  await page.waitForSelector(campo, { timeout: 15000 });
  await page.type(campo, "exemplo.test", { delay: 5 });
  await new Promise((r) => setTimeout(r, 900));
}

// O que cada tela faz para chegar no estado fotografado.
const ABERTURAS = {
  "01-landing": async (page) => {
    await page.goto(BASE + "/", { waitUntil: "networkidle0" });
  },
  "02-login": async (page) => {
    await page.goto(BASE + "/login", { waitUntil: "networkidle0" });
    await page.evaluate(() => localStorage.clear());
    await page.goto(BASE + "/login", { waitUntil: "networkidle0" });
    await page.waitForSelector("input[type=password]", { timeout: 15000 });
  },
  "03-dashboard": async (page) => {
    await page.waitForSelector(".kpi-grid", { timeout: 15000 });
  },
  "05-auditoria": async (page) => {
    await page.goto(BASE + "/app/auditoria", { waitUntil: "networkidle0" });
    await page.waitForSelector(".table", { timeout: 15000 });
  },
  "04-usuarios": async (page) => {
    await page.goto(BASE + "/app/usuarios", { waitUntil: "networkidle0" });
    await page.waitForSelector(".table", { timeout: 15000 });
    await soDaCaptura(page);
  },
  "06-configuracoes-claro": async (page) => {
    await page.goto(BASE + "/app/configuracoes?aba=aparencia", { waitUntil: "networkidle0" });
    await page.waitForSelector(".nx-bloco", { timeout: 15000 });
    await page.evaluate(() => {
      [...document.querySelectorAll(".theme-choice button")]
        .find((b) => b.textContent.trim() === "Claro")
        ?.click();
    });
    await new Promise((r) => setTimeout(r, 400));
    await page.goto(BASE + "/app/configuracoes", { waitUntil: "networkidle0" });
    await page.waitForSelector(".nx-painel", { timeout: 15000 });
  },
};

(async () => {
  const pedidas = TELAS.filter((t) => quer(t.foto));
  if (!pedidas.length) {
    console.error("nenhuma tela pedida em NEXUS_PROVA_FOTOS; nomes possiveis: " + TELAS.map((t) => t.foto).join(", "));
    process.exit(2);
  }

  // D6 (tarefa T1): a prova so escreve no banco de prova. A conferencia entra na API, pega o
  // id que ela devolve no login da conta de prova e exige que esse id exista em
  // nexusbusinessmanager_teste - se o servidor atende outro banco, a prova para aqui.
  await conferirServidorDeProva();

  const browser = await puppeteer.launch({
    executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
    headless: "new",
    args: ["--no-sandbox", "--disable-gpu", "--window-size=1440,900"],
    defaultViewport: { width: 1440, height: 900 },
  });
  const page = await browser.newPage();

  // 1) as telas que nao precisam de sessao
  for (const tela of pedidas.filter((t) => t.conta === null)) {
    await ABERTURAS[tela.foto](page);
    await shot(page, tela.foto);
  }

  // 2) uma entrada por conta, e as telas dela na sequencia
  const contas = [...new Set(pedidas.filter((t) => t.conta).map((t) => t.conta))];
  for (const conta of contas) {
    await entrar(page, conta);
    for (const tela of pedidas.filter((t) => t.conta === conta)) {
      await ABERTURAS[tela.foto](page);
      await shot(page, tela.foto);
    }
  }

  await browser.close();
  console.log("ok: " + pedidas.length + " tela(s) capturada(s) em", OUT);
})().catch((e) => {
  console.error("falha:", e.message);
  process.exit(1);
});
