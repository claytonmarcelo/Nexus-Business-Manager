// Prova de uso real do modulo Financeiro:
// cria categorias, receita recebida, despesa pendente vencida e paga a despesa.
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

  await page.goto(BASE + "/app/financeiro", { waitUntil: "networkidle0" });
  await page.waitForSelector(".page-head");

  // 1) Categorias
  await page.evaluate(() => {
    const b = [...document.querySelectorAll(".page-head .btn-ghost")].find((x) => x.textContent === "Categorias");
    b.click();
  });
  await page.waitForSelector('[aria-label="Categorias financeiras"]');
  const addCat = async (nome, tipo) => {
    await page.evaluate(() => {
      const inp = document.querySelector('[aria-label="Nome da categoria"]');
      inp.value = ""; inp.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await page.type('[aria-label="Nome da categoria"]', nome, { delay: 4 });
    if (tipo === "EXPENSE") {
      await page.evaluate(() => {
        const sel = document.querySelector('[aria-label="Tipo da categoria"]');
        sel.value = "EXPENSE"; sel.dispatchEvent(new Event("change", { bubbles: true }));
      });
    }
    await page.evaluate(() => {
      const b = [...document.querySelectorAll('[aria-label="Categorias financeiras"] .btn-brand')][0];
      b.click();
    });
    await sleep(600);
  };
  await addCat("Vendas " + sufixo, "INCOME");
  await addCat("Fornecedores " + sufixo, "EXPENSE");
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('[aria-label="Categorias financeiras"] .btn-ghost')].find((x) => x.textContent === "Fechar");
    b.click();
  });
  await sleep(500);

  const novoLancamento = async (descricao, valor, venc, tipo, pago) => {
    await page.evaluate(() => [...document.querySelectorAll(".page-head .btn-brand")][0].click());
    await page.waitForSelector('[aria-label="Novo lançamento"]');
    if (tipo === "EXPENSE") {
      await page.evaluate(() => {
        const b = [...document.querySelectorAll('[aria-label="Novo lançamento"] .btn-ghost')].find((x) => x.textContent === "Despesa");
        b.click();
      });
      await sleep(200);
    }
    const inps = await page.$$('[aria-label="Novo lançamento"] .input');
    await inps[0].type(descricao, { delay: 4 });          // descricao
    await inps[1].type(valor, { delay: 4 });              // valor
    // vencimento: campo date — define via evaluate para aceitar ISO
    await page.evaluate((v) => {
      const d = document.querySelector('[aria-label="Novo lançamento"] input[type=date]');
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
      setter.call(d, v);
      d.dispatchEvent(new Event("input", { bubbles: true }));
      d.dispatchEvent(new Event("change", { bubbles: true }));
    }, venc);
    await page.waitForFunction(() => {
      const sel = document.querySelector('[aria-label="Novo lançamento"] select');
      return sel && sel.options.length > 1;
    }, { timeout: 5000 }).catch(() => {});
    await page.evaluate(() => {
      const sel = document.querySelector('[aria-label="Novo lançamento"] select');
      if (sel && sel.options.length > 1) { sel.selectedIndex = 1; sel.dispatchEvent(new Event("change", { bubbles: true })); }
    });
    if (pago) {
      await page.evaluate(() => {
        const cb = document.querySelector('[aria-label="Novo lançamento"] input[type=checkbox]');
        cb.click();
      });
    }
    await sleep(200);
    await page.screenshot({ path: path.join(OUT, "13-financeiro-modal.png") });
    await page.evaluate(() => [...document.querySelectorAll('[aria-label="Novo lançamento"] .btn-brand')].pop().click());
    await sleep(1000);
  };

  const hoje = new Date();
  const iso = (d) => d.toISOString().slice(0, 10);
  const mesPassado = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth() - 1, 12));

  // 2) Receita recebida no mes + despesa vencida
  await novoLancamento("Pedido de buffet " + sufixo, "2400", iso(hoje), "INCOME", true);
  await novoLancamento("Aluguel do galpao " + sufixo, "1800", iso(mesPassado), "EXPENSE", false);

  // 3) Pagar a despesa (SweetAlert2) - navegando ao mes do vencimento
  const mesAluguel = iso(mesPassado).slice(0, 7);
  await page.evaluate((m) => {
    const inp = document.querySelector('input[type="month"]');
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
    setter.call(inp, m);
    inp.dispatchEvent(new Event("input", { bubbles: true }));
    inp.dispatchEvent(new Event("change", { bubbles: true }));
  }, mesAluguel);
  await sleep(1200);
  await page.evaluate(() => {
    const b = [...document.querySelectorAll(".table tbody .btn-ghost")].find((x) => x.textContent === "Pagar");
    b.click();
  });
  await page.waitForSelector(".swal2-confirm");
  await page.click(".swal2-confirm");
  await sleep(1100);
  await page.evaluate((m) => {
    const inp = document.querySelector('input[type="month"]');
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
    setter.call(inp, m);
    inp.dispatchEvent(new Event("input", { bubbles: true }));
    inp.dispatchEvent(new Event("change", { bubbles: true }));
  }, iso(hoje).slice(0, 7));
  await sleep(1200);

  await page.screenshot({ path: path.join(OUT, "13-financeiro.png") });
  const kpis = await page.$eval(".kpi-grid", (el) => el.textContent.replace(/\s+/g, " ").trim());
  console.log("KPIs:", kpis);
  if (erros.length) { console.error("ERROS:", erros.slice(0, 5)); process.exitCode = 1; }
  await browser.close();
  console.log("ok: prova do modulo financeiro capturada");
})().catch((e) => { console.error("falha:", e.message); process.exit(1); });
