const puppeteer = require("puppeteer-core");
const { EMAIL_ADMIN, SENHA_ADMIN } = require("./senha-admin.cjs");
const { conferirServidorDeProva } = require("./banco-de-prova.cjs");
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
  await page.goto(require("./pilha-de-prova.cjs").baseDoNavegador() + "/login", { waitUntil: "networkidle0" });
  await page.waitForSelector("input[type=email]");
  await page.type("input[type=email]", EMAIL_ADMIN);
  await page.type("input[type=password]", SENHA_ADMIN);
  await Promise.all([
    page.waitForFunction(() => window.location.pathname.startsWith("/app"), { timeout: 15000 }),
    page.click("button[type=submit]"),
  ]);
  await page.waitForSelector(".kpi-grid", { timeout: 15000 });
  await new Promise((r) => setTimeout(r, 800));
  await page.screenshot({ path: require("path").join(require("./pilha-de-prova.cjs").pastaDeCaptura("docs/screenshots"), "03-dashboard.png") });
  await browser.close();
  console.log("ok");
})().catch((e) => { console.error("falha:", e.message); process.exit(1); });
