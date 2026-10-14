// Auditoria profunda: 320px, sidebar aberta, modal de cliente aberto.
const puppeteer = require("puppeteer-core");
const { EMAIL_ADMIN, SENHA_ADMIN } = require("./senha-admin.cjs");
const { conferirServidorDeProva } = require("./banco-de-prova.cjs");
const BASE = require("./pilha-de-prova.cjs").baseDoNavegador();
(async () => {
  // D6 (tarefa T1): a prova so escreve no banco de prova. A conferencia entra na API, pega o
  // id que ela devolve no login da conta de prova e exige que esse id exista em
  // nexusbusinessmanager_teste - se o servidor atende outro banco, a prova para aqui.
  await conferirServidorDeProva();

  const browser = await puppeteer.launch({
    executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
    headless: "new", args: ["--no-sandbox", "--disable-gpu"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 320, height: 700 });
  const probe = async (label) => {
    const res = await page.evaluate(() => {
      const vw = document.documentElement.clientWidth;
      const bad = [];
      document.querySelectorAll("body *").forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.width > 0 && r.right > vw + 1) {
          const cls = typeof el.className === "string" ? el.className.split(" ").slice(0, 3).join(".") : "";
          bad.push(el.tagName.toLowerCase() + (cls ? "." + cls : "") + " [right=" + Math.round(r.right) + "]");
        }
      });
      return { scrollW: document.documentElement.scrollWidth, clientW: vw, bad: bad.slice(0, 10) };
    });
    console.log(label + " -> " + (res.scrollW > res.clientW + 1 ? "OVERFLOW" : "ok") + " scrollW=" + res.scrollW + " clientW=" + res.clientW);
    if (res.bad.length) console.log("   ", res.bad.join(" | "));
  };

  await page.goto(BASE + "/", { waitUntil: "networkidle0" }); await probe("320 /");
  await page.goto(BASE + "/login", { waitUntil: "networkidle0" }); await probe("320 /login");
  await page.goto(BASE + "/cadastro", { waitUntil: "networkidle0" }); await probe("320 /cadastro");

  await page.goto(BASE + "/login", { waitUntil: "networkidle0" });
  await page.type("input[type=email]", EMAIL_ADMIN, { delay: 2 });
  await page.type("input[type=password]", SENHA_ADMIN, { delay: 2 });
  await page.click(".neu-btn");
  await page.waitForFunction(() => location.pathname.startsWith("/app"), { timeout: 15000 });
  await probe("320 /app");

  await page.click(".admin-hamburger");
  await new Promise((r) => setTimeout(r, 400));
  await probe("320 /app sidebar aberta");
  await page.click(".admin-scrim");
  await new Promise((r) => setTimeout(r, 400));

  await page.goto(BASE + "/app/clientes", { waitUntil: "networkidle0" });
  await new Promise((r) => setTimeout(r, 600));
  await probe("320 /app/clientes");
  await page.click(".btn-brand");
  await new Promise((r) => setTimeout(r, 400));
  await probe("320 /app/clientes modal aberto");

  await page.goto(BASE + "/app/configuracoes", { waitUntil: "networkidle0" });
  await new Promise((r) => setTimeout(r, 600));
  await probe("320 /app/configuracoes");
  await browser.close();
})().catch((e) => { console.error("falha:", e.message); process.exit(1); });
