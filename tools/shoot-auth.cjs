const puppeteer = require("puppeteer-core");
const { SENHA_ADMIN } = require("./senha-admin.cjs");
const path = require("path");
const BASE = "http://localhost:5173";
const OUT = path.join(__dirname, "..", "docs", "screenshots");

(async () => {
  const browser = await puppeteer.launch({
    executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
    headless: "new", args: ["--no-sandbox", "--disable-gpu"],
    defaultViewport: { width: 1440, height: 900 },
  });
  const page = await browser.newPage();
  const shot = async (nome) => { await new Promise((r) => setTimeout(r, 700)); await page.screenshot({ path: path.join(OUT, nome + ".png") }); console.log("capturado", nome); };

  // 02-login: e-mail lembrado permanece invisivel (regra), senha digitada + olho
  await page.goto(BASE + "/login", { waitUntil: "networkidle0" });
  await page.evaluate(() => localStorage.setItem("nexus.remember.email", "nexusbussiness.admin@gmail.com"));
  await page.goto(BASE + "/login", { waitUntil: "networkidle0" });
  await page.waitForSelector("input[type=password]");
  await page.type("input[type=password]", SENHA_ADMIN, { delay: 4 });
  await page.click(".eye-toggle");
  await shot("02-login");

  // 08-cadastro: com erros inline (e-mail invalido) para provar validacao
  await page.goto(BASE + "/cadastro", { waitUntil: "networkidle0" });
  await page.waitForSelector(".auth-card");
  const inputs = await page.$$(".auth-card input");
  await inputs[0].type("Novo Empresario", { delay: 3 });
  await inputs[1].type("email-invalido", { delay: 3 });
  await page.click(".auth-card .neu-btn");
  await shot("08-cadastro");

  // 09-recuperar-senha: passo 2 com codigo de desenvolvimento preenchido
  await page.goto(BASE + "/recuperar-senha", { waitUntil: "networkidle0" });
  await page.waitForSelector("input[type=email]");
  await page.type("input[type=email]", "nexusbussiness.admin@gmail.com", { delay: 3 });
  await page.click(".neu-btn");
  await new Promise((r) => setTimeout(r, 1200));
  await shot("09-recuperar-senha");

  await browser.close();
  console.log("ok: telas de autenticacao capturadas");
})().catch((e) => { console.error("falha:", e.message); process.exit(1); });
