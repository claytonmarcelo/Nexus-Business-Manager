// Prova de uso real da página de Clientes: cria um cliente pela UI e captura a tela.
//
// Quem entra é a conta fictícia de captura (tools/conta-de-captura.cjs): o cadastro que
// a prova faz é dela, na empresa vazia que ela mesma criou. Nenhuma credencial literal
// fica neste arquivo — nem a senha da conta de desenvolvimento do banco.
const puppeteer = require("puppeteer-core");
const path = require("path");
const { contaDeCaptura } = require("./conta-de-captura.cjs");
const { conferirServidorDeProva } = require("./banco-de-prova.cjs");
const BASE = "http://localhost:5173";

(async () => {
  // D6 (tarefa T1): a prova so escreve no banco de prova. A conferencia entra na API, pega o
  // id que ela devolve no login da conta de prova e exige que esse id exista em
  // nexusbusinessmanager_teste - se o servidor atende outro banco, a prova para aqui.
  await conferirServidorDeProva();

  const browser = await puppeteer.launch({
    executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
    headless: "new",
    args: ["--no-sandbox", "--disable-gpu"],
    defaultViewport: { width: 1440, height: 900 },
  });
  const page = await browser.newPage();
  page.on("pageerror", (e) => console.log("pageerror:", e.message));
  const CAPTA = contaDeCaptura();
  await page.goto(BASE + "/login", { waitUntil: "networkidle0" });
  await page.evaluate(() => localStorage.clear());
  await page.goto(BASE + "/login", { waitUntil: "networkidle0" });
  await page.type("input[type=email]", CAPTA.email);
  await page.type("input[type=password]", CAPTA.senha);
  await Promise.all([
    page.waitForFunction(() => window.location.pathname.startsWith("/app"), { timeout: 15000 }),
    page.click("button[type=submit]"),
  ]);

  await page.goto(BASE + "/app/clientes", { waitUntil: "networkidle0" });
  await page.waitForSelector(".page-title");
  await new Promise((r) => setTimeout(r, 400));

  // Abre o modal e cadastra um cliente real (idempotente: usa documento único por execução)
  const doc = "12.345.678/0001-9" + String(Date.now()).slice(-1);
  const nome = "Padaria Aurora " + doc.slice(-1);
  await page.click(".toolbar .btn-brand, .page-header .btn-brand, button.btn-brand");
  try {
    await page.waitForSelector(".nx-dialog-overlay", { visible: true, timeout: 8000 });
  } catch (e) {
    await page.screenshot({ path: path.join(__dirname, "fail-clients.png") });
    throw new Error("modal nao abriu; print em tools/fail-clients.png");
  }
  const inputs = await page.$$(".nx-dialog-overlay input, .nx-dialog-overlay textarea");
  console.log("inputs do modal:", inputs.length);
  await inputs[0].type(nome);
  await inputs[1].type("contato@aurora.test");
  await inputs[2].type("11 97777-0101");
  await inputs[3].type(doc);
  const salvar = await page.$$(".nx-dialog-overlay .btn-brand");
  await salvar[salvar.length - 1].click();
  await new Promise((r) => setTimeout(r, 1500));

  const linhas = await page.$$eval(".table tbody tr", (rows) => rows.length);
  console.log("linhas na tabela:", linhas);
  await page.screenshot({ path: path.join(__dirname, "..", "docs", "screenshots", "07-clientes.png") });
  await browser.close();
  console.log("ok: clientes capturado");
})().catch((e) => { console.error("falha:", e.message); process.exit(1); });
