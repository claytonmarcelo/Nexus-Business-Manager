// Varredura de larguras: procura QUALQUER largura onde scrollWidth > clientWidth.
const puppeteer = require("puppeteer-core");
const { EMAIL_ADMIN, SENHA_ADMIN } = require("./senha-admin.cjs");
const { conferirServidorDeProva } = require("./banco-de-prova.cjs");
const BASE = "http://localhost:5173";
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
  await page.goto(BASE + "/login", { waitUntil: "networkidle0" });
  await page.type("input[type=email]", EMAIL_ADMIN, { delay: 2 });
  await page.type("input[type=password]", SENHA_ADMIN, { delay: 2 });
  await page.click(".neu-btn");
  await page.waitForFunction(() => location.pathname.startsWith("/app"), { timeout: 15000 });

  const rotauth = ["/", "/login", "/cadastro", "/app", "/app/clientes", "/app/configuracoes", "/app/usuarios", "/app/auditoria"];
  let found = 0;
  for (let w = 320; w <= 1400; w += 20) {
    await page.setViewport({ width: w, height: 800 });
    for (const p of rotauth) {
      await page.goto(BASE + p, { waitUntil: "domcontentloaded" });
      await new Promise((r) => setTimeout(r, 250));
      const res = await page.evaluate(() => ({ s: document.documentElement.scrollWidth, c: document.documentElement.clientWidth }));
      if (res.s > res.c + 1) {
        found++;
        console.log("OVERFLOW " + w + "px " + p + " scrollW=" + res.s + " clientW=" + res.c);
      }
    }
  }
  console.log(found ? "total de casos: " + found : "nenhum overflow de pagina em 320-1400px");
  await browser.close();
})().catch((e) => { console.error("falha:", e.message); process.exit(1); });
