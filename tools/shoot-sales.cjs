// Prova de uso real do modulo Vendas:
// registra um pedido com dois itens, confirma com baixa de estoque e captura a tela.
const puppeteer = require("puppeteer-core");
const { EMAIL_ADMIN, SENHA_ADMIN } = require("./senha-admin.cjs");
const path = require("path");
const { conferirServidorDeProva } = require("./banco-de-prova.cjs");
const BASE = "http://localhost:5173";
const OUT = path.join(__dirname, "..", "docs", "screenshots");
const sufixo = Date.now().toString().slice(-6);
const DLG = '[aria-label="Novo pedido de venda"]';

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
  const erros = [];
  page.on("pageerror", (e) => erros.push(String(e.message)));
  page.on("console", (m) => { if (m.type() === "error") erros.push(m.text()); });
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  await page.goto(BASE + "/login", { waitUntil: "networkidle0" });
  await page.evaluate(() => localStorage.removeItem("nexus.remember.email"));
  await page.reload({ waitUntil: "networkidle0" });
  await page.waitForSelector("input[type=email]");
  await page.type("input[type=email]", EMAIL_ADMIN, { delay: 3 });
  await page.type("input[type=password]", SENHA_ADMIN, { delay: 3 });
  await page.click(".neu-btn");
  await page.waitForFunction(() => location.pathname.startsWith("/app"), { timeout: 15000 });

  // 1) Cliente da venda
  await page.goto(BASE + "/app/clientes", { waitUntil: "networkidle0" });
  await page.evaluate(() => [...document.querySelectorAll(".page-head .btn-brand")][0].click());
  await page.waitForSelector(".nx-dialog .input");
  await page.type(".nx-dialog .input", "Cafe Colonial " + sufixo, { delay: 4 });
  await page.evaluate(() => [...document.querySelectorAll(".nx-dialog .btn-brand")].pop().click());
  await sleep(900);

  // 2) Produto novo com estoque alto
  await page.goto(BASE + "/app/produtos", { waitUntil: "networkidle0" });
  await page.waitForSelector(".kpi-grid");
  await page.evaluate(() => [...document.querySelectorAll(".page-head .btn-brand")][0].click());
  await page.waitForSelector(".nx-dialog .select");
  const pInputs = await page.$$(".nx-dialog .input");
  await pInputs[0].type("Pao de Queijo Congelado " + sufixo, { delay: 3 });
  await pInputs[1].type("SKU-V" + sufixo, { delay: 3 });
  await pInputs[3].type("35.00", { delay: 3 });   // preco de venda
  await pInputs[4].type("14.00", { delay: 3 });   // custo
  await pInputs[5].type("50", { delay: 3 });      // estoque inicial
  await pInputs[6].type("10", { delay: 3 });      // minimo
  await page.evaluate(() => [...document.querySelectorAll(".nx-dialog .btn-brand")].pop().click());
  await sleep(1000);

  // 3) Nova venda: cliente + dois itens + confirmar agora
  await page.goto(BASE + "/app/vendas", { waitUntil: "networkidle0" });
  await page.waitForSelector(".page-head .btn-brand");
  await page.evaluate(() => [...document.querySelectorAll(".page-head .btn-brand")][0].click());
  await page.waitForSelector(DLG);
  await page.waitForFunction(() => {
    const sels = document.querySelectorAll('[aria-label="Novo pedido de venda"] .select');
    return sels.length >= 2 && sels[0].options.length > 1 && sels[1].options.length > 1;
  }, { timeout: 10000 });

  const optionValue = (selIdx, prefix) => page.$$eval(DLG + " .select", (sels, i) => {
    const o = [...sels[i].options].find((x) => x.label.startsWith("ok") || x.textContent.startsWith(window.__prefix));
    return o ? o.value : "";
  }, selIdx).catch(() => "");

  // cliente (select 0)
  await page.evaluate(() => {
    const sel = document.querySelector('[aria-label="Novo pedido de venda"] .select');
    const opt = [...sel.options].find((o) => o.textContent.startsWith("Cafe Colonial"));
    if (opt) { sel.value = opt.value; sel.dispatchEvent(new Event("change", { bubbles: true })); }
  });

  const pickByPrefix = (selIdx, prefix) => page.evaluate((i, pre) => {
    const sels = document.querySelectorAll('[aria-label="Novo pedido de venda"] .select');
    const opt = [...sels[i].options].find((o) => o.textContent.startsWith(pre));
    if (opt) { sels[i].value = opt.value; sels[i].dispatchEvent(new Event("change", { bubbles: true })); return opt.textContent; }
    return null;
  }, selIdx, prefix);

  const paO = await pickByPrefix(1, "Pao de Queijo");
  await sleep(150);
  let inps = await page.$$(DLG + " .input");
  await inps[0].click(); await page.keyboard.down("Control"); await page.keyboard.press("KeyA"); await page.keyboard.up("Control"); await inps[0].type("10", { delay: 4 }); // qtd item 1

  await page.evaluate(() => {
    const b = [...document.querySelectorAll('[aria-label="Novo pedido de venda"] .btn-ghost')].find((x) => x.textContent.includes("Adicionar item"));
    b.click();
  });
  await sleep(200);
  const chO = await pickByPrefix(2, "Churros");
  await sleep(150);
  inps = await page.$$(DLG + " .input");
  await inps[2].click(); await page.keyboard.down("Control"); await page.keyboard.press("KeyA"); await page.keyboard.up("Control"); await inps[2].type("5", { delay: 4 }); // qtd item 2

  const ta = await page.$(DLG + " textarea");
  if (ta) await ta.type("Pedido de demonstracao " + sufixo, { delay: 3 });

  await page.evaluate(() => document.querySelector('[aria-label="Novo pedido de venda"] input[type=checkbox]').click());
  await sleep(250);
  await page.screenshot({ path: path.join(OUT, "11-vendas-modal.png") });

  await page.evaluate(() => [...document.querySelectorAll('[aria-label="Novo pedido de venda"] .btn-brand')].pop().click());
  await sleep(1300);
  await page.screenshot({ path: path.join(OUT, "11-vendas.png") });

  // 4) Detalhe da venda confirmada
  await page.evaluate(() => {
    const b = [...document.querySelectorAll(".table tbody .btn-ghost")].find((x) => x.textContent.includes("Cafe Colonial"));
    if (b) b.click();
  });
  await sleep(450);
  await page.screenshot({ path: path.join(OUT, "11-vendas-detalhe.png") });
  await page.evaluate(() => {
    const b = [...document.querySelectorAll(".nx-dialog .btn-ghost")].find((x) => x.textContent === "Fechar");
    if (b) b.click();
  });

  // 5) Estoque baixado? (50 - 10 = 40)
  await sleep(400);
  await page.goto(BASE + "/app/produtos", { waitUntil: "networkidle0" });
  await sleep(600);
  const linhaProduto = await page.evaluate((nome) => {
    const row = [...document.querySelectorAll(".table tbody tr")].find((r) => r.textContent.includes(nome));
    return row ? row.textContent.replace(/\s+/g, " ").trim().slice(0, 180) : null;
  }, "Pao de Queijo Congelado " + sufixo);

  const totalVenda = await (async () => {
    await page.goto(BASE + "/app/vendas", { waitUntil: "networkidle0" });
    await sleep(500);
    return page.evaluate((nome) => {
      const row = [...document.querySelectorAll(".table tbody tr")].find((r) => r.textContent.includes(nome));
      return row ? row.textContent.replace(/\s+/g, " ").trim().slice(0, 180) : null;
    }, "Cafe Colonial " + sufixo);
  })();

  console.log("produtos  :", linhaProduto);
  console.log("vendas    :", totalVenda);
  console.log("itens     :", paO, "|", chO);
  if (erros.length) { console.error("ERROS DE PAGINA:", erros.slice(0, 5)); process.exitCode = 1; }
  await browser.close();
  console.log("ok: prova do modulo vendas capturada");
})().catch((e) => { console.error("falha:", e.message); process.exit(1); });
