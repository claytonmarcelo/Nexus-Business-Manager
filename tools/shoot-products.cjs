// Prova de uso real do modulo Produtos + Estoque:
// cria categoria, produto com estoque inicial, faz entrada e captura a tela.
const puppeteer = require("puppeteer-core");
const { EMAIL_ADMIN, SENHA_ADMIN } = require("./senha-admin.cjs");
const path = require("path");
const { conferirServidorDeProva } = require("./banco-de-prova.cjs");
const BASE = "http://localhost:5173";
const OUT = path.join(__dirname, "..", "docs", "screenshots");
const sufixo = Date.now().toString().slice(-6);

(async () => {
  // D6 (tarefa T1): a prova so escreve no banco de prova. A conferencia entra na API, pega o
  // id que ela devolve no login da conta de prova e exige que esse id exista em
  // nexusbusinessmanager_teste - se o servidor atende outro banco, a prova para aqui.
  await conferirServidorDeProva();

  const browser = await puppeteer.launch({
    executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
    headless: "new", args: ["--no-sandbox", "--disable-gpu"],
    defaultViewport: { width: 1440, height: 900 },
  });
  const page = await browser.newPage();
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  await page.goto(BASE + "/login", { waitUntil: "networkidle0" });
  await page.evaluate(() => localStorage.removeItem("nexus.remember.email"));
  await page.reload({ waitUntil: "networkidle0" });
  await page.waitForSelector("input[type=email]");
  await page.type("input[type=email]", EMAIL_ADMIN, { delay: 3 });
  await page.type("input[type=password]", SENHA_ADMIN, { delay: 3 });
  await page.click(".neu-btn");
  await page.waitForFunction(() => location.pathname.startsWith("/app"), { timeout: 15000 });

  await page.goto(BASE + "/app/produtos", { waitUntil: "networkidle0" });
  await page.waitForSelector(".kpi-grid");

  // 1) Categoria
  const [btnCat] = await page.$$(".page-head .btn");
  await btnCat.click();
  await page.waitForSelector(".nx-dialog input");
  await page.type(".nx-dialog input", "Moi " + sufixo, { delay: 5 });
  await page.evaluate(() => [...document.querySelectorAll(".nx-dialog .btn-brand")].pop().click());
  await sleep(800);

  // 2) Produto com estoque inicial baixo (para acender o badge)
  await page.evaluate(() => [...document.querySelectorAll(".page-head .btn-brand")][0].click());
  await page.waitForSelector(".nx-dialog .select");
  const inputs = await page.$$(".nx-dialog .input");
  await inputs[0].type("Churros Gourmet " + sufixo, { delay: 4 });
  await inputs[1].type("SKU-" + sufixo, { delay: 4 });
  await page.evaluate(() => {
    const sel = document.querySelector(".nx-dialog .select");
    sel.value = sel.options[1] ? sel.options[1].value : "";
    sel.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await inputs[3].type("12.90", { delay: 4 });   // preco venda
  await inputs[4].type("5.20", { delay: 4 });    // custo
  await inputs[5].type("4", { delay: 4 });       // estoque inicial
  await inputs[6].type("10", { delay: 4 });      // minimo
  await page.screenshot({ path: path.join(OUT, "10-produtos-modal.png") });
  await page.evaluate(() => [...document.querySelectorAll(".nx-dialog .btn-brand")].pop().click());
  await sleep(1000);

  // 3) Entrada de estoque via modal "Estoque"
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll(".table tbody .btn-ghost")].find((b) => b.textContent === "Estoque");
    btn.click();
  });
  await page.waitForSelector(".nx-dialog .select");
  const movInputs = await page.$$(".nx-dialog .input");
  await movInputs[0].type("20", { delay: 5 });
  await movInputs[1].type("Fornecimento semanal", { delay: 4 });
  await page.evaluate(() => [...document.querySelectorAll(".nx-dialog .btn-brand")].pop().click());
  await sleep(1000);

  // 4) Tela final
  await sleep(400);
  await page.screenshot({ path: path.join(OUT, "10-produtos.png") });
  const kpi = await page.$eval(".kpi-grid", (el) => el.textContent.replace(/\s+/g, " ").trim());
  console.log("KPIs:", kpi);
  await browser.close();
  console.log("ok: prova do modulo produtos capturada");
})().catch((e) => { console.error("falha:", e.message); process.exit(1); });
