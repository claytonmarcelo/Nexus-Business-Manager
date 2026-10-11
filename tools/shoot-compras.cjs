// Prova de uso real do modulo Compras + Fornecedores:
// cadastra fornecedor, cria compra em rascunho, recebe com entrada de estoque e captura as telas.
const puppeteer = require("puppeteer-core");
const { SENHA_ADMIN } = require("./senha-admin.cjs");
const path = require("path");
const BASE = "http://localhost:5173";
const OUT = path.join(__dirname, "..", "docs", "screenshots");
const sufixo = Date.now().toString().slice(-6);

(async () => {
  const browser = await puppeteer.launch({
    executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
    headless: "new", args: ["--no-sandbox", "--disable-gpu"],
    defaultViewport: { width: 1440, height: 900 },
  });
  const page = await browser.newPage();
  const erros = [];
  page.on("pageerror", (e) => erros.push(String(e.message)));
  page.on("console", (m) => { if (m.type() === "error") erros.push(m.text()); });
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  await page.goto(BASE + "/login", { waitUntil: "networkidle0" });
  await page.evaluate(() => localStorage.removeItem("nexus.remember.email"));
  await page.reload({ waitUntil: "networkidle0" });
  await page.waitForSelector("input[type=email]");
  await page.type("input[type=email]", "nexusbussiness.admin@gmail.com", { delay: 3 });
  await page.type("input[type=password]", SENHA_ADMIN, { delay: 3 });
  await page.click(".neu-btn");
  await page.waitForFunction(() => location.pathname.startsWith("/app"), { timeout: 15000 });

  // 1) Produto alvo da compra (estoque conhecido: 10)
  await page.goto(BASE + "/app/produtos", { waitUntil: "networkidle0" });
  await page.waitForSelector(".kpi-grid");
  await page.evaluate(() => [...document.querySelectorAll(".page-head .btn-brand")][0].click());
  await page.waitForSelector(".nx-dialog .select");
  const pIn = await page.$$(".nx-dialog .input");
  await pIn[0].type("Cafe em Graos " + sufixo, { delay: 3 });
  await pIn[1].type("SKU-C" + sufixo, { delay: 3 });
  await pIn[3].type("48.00", { delay: 3 });   // venda
  await pIn[4].type("18.00", { delay: 3 });   // custo
  await pIn[5].type("10", { delay: 3 });      // estoque inicial
  await pIn[6].type("15", { delay: 3 });      // minimo
  await page.evaluate(() => [...document.querySelectorAll(".nx-dialog .btn-brand")].pop().click());
  await sleep(1000);

  // 2) Fornecedor
  await page.goto(BASE + "/app/compras", { waitUntil: "networkidle0" });
  await page.evaluate(() => {
    const b = [...document.querySelectorAll(".page-head .btn-ghost")].find((x) => x.textContent === "Fornecedores");
    b.click();
  });
  await page.waitForSelector('[aria-label="Fornecedores"]');
  await page.evaluate(() => [...document.querySelectorAll('[aria-label="Fornecedores"] .btn-brand')][0].click());
  await page.waitForSelector('[aria-label="Novo fornecedor"]');
  const sIn = await page.$$('[aria-label="Novo fornecedor"] .input');
  await sIn[0].type("Torrefacao Aroma Real " + sufixo, { delay: 4 });
  await sIn[1].type("compras@aromareal.test", { delay: 3 });
  await sIn[2].type("31 3000-1000", { delay: 3 });
  await page.evaluate(() => [...document.querySelectorAll('[aria-label="Novo fornecedor"] .btn-brand')].pop().click());
  await sleep(800);
  await page.screenshot({ path: path.join(OUT, "12-fornecedores.png") });
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('[aria-label="Fornecedores"] .btn-ghost')].find((x) => x.textContent === "Fechar");
    b.click();
  });
  await sleep(400);

  // 3) Compra em rascunho
  await page.evaluate(() => [...document.querySelectorAll(".page-head .btn-brand")][0].click());
  await page.waitForSelector('[aria-label="Nova compra"]');
  await page.waitForFunction(() => {
    const sels = document.querySelectorAll('[aria-label="Nova compra"] .select');
    return sels.length >= 2 && sels[0].options.length > 1 && sels[1].options.length > 1;
  }, { timeout: 10000 });
  await page.evaluate(() => {
    const sels = document.querySelectorAll('[aria-label="Nova compra"] .select');
    const sup = [...sels[0].options].find((o) => o.textContent.startsWith("Torrefacao Aroma Real"));
    sels[0].value = sup.value; sels[0].dispatchEvent(new Event("change", { bubbles: true }));
    const prd = [...sels[1].options].find((o) => o.textContent.startsWith("Cafe em Graos"));
    sels[1].value = prd.value; sels[1].dispatchEvent(new Event("change", { bubbles: true }));
  });
  await sleep(200);
  let inps = await page.$$('[aria-label="Nova compra"] .input');
  await inps[0].click(); await page.keyboard.down("Control"); await page.keyboard.press("KeyA"); await page.keyboard.up("Control");
  await inps[0].type("30", { delay: 4 });
  const ta = await page.$('[aria-label="Nova compra"] textarea');
  await ta.type("Reposicao mensal de graos", { delay: 3 });
  await page.screenshot({ path: path.join(OUT, "12-compras-modal.png") });
  await page.evaluate(() => [...document.querySelectorAll('[aria-label="Nova compra"] .btn-brand')].pop().click());
  await sleep(1100);

  // 4) Receber a compra (SweetAlert2 confirma)
  await page.evaluate(() => {
    const b = [...document.querySelectorAll(".table tbody .btn-ghost")].find((x) => x.textContent === "Receber");
    b.click();
  });
  await page.waitForSelector(".swal2-confirm");
  await page.click(".swal2-confirm");
  await sleep(1100);
  await page.screenshot({ path: path.join(OUT, "12-compras.png") });

  // 5) Estoque conferido? (10 + 30 = 40)
  await page.goto(BASE + "/app/produtos", { waitUntil: "networkidle0" });
  await sleep(600);
  const linha = await page.evaluate((nome) => {
    const row = [...document.querySelectorAll(".table tbody tr")].find((r) => r.textContent.includes(nome));
    return row ? row.textContent.replace(/\s+/g, " ").trim().slice(0, 180) : null;
  }, "Cafe em Graos " + sufixo);

  console.log("produto:", linha);
  if (erros.length) { console.error("ERROS:", erros.slice(0, 5)); process.exitCode = 1; }
  await browser.close();
  console.log("ok: prova do modulo compras capturada");
})().catch((e) => { console.error("falha:", e.message); process.exit(1); });
