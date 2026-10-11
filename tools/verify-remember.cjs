// Prova da regra: "Lembrar de mim" grava o e-mail no navegador, mas ele NUNCA
// aparece visível no campo; entrar só com a senha usa o e-mail lembrado em silêncio.
const puppeteer = require("puppeteer-core");
const { SENHA_ADMIN } = require("./senha-admin.cjs");
const BASE = "http://localhost:5173";

(async () => {
  const browser = await puppeteer.launch({
    executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
    headless: "new", args: ["--no-sandbox", "--disable-gpu"],
    defaultViewport: { width: 1440, height: 900 },
  });
  const page = await browser.newPage();
  const ok = (cond, msg) => { console.log((cond ? "OK  " : "FAIL") + "  " + msg); if (!cond) process.exitCode = 1; };

  // Passo 1: login normal com "Lembrar de mim" marcado.
  await page.goto(BASE + "/login", { waitUntil: "networkidle0" });
  await page.evaluate(() => localStorage.removeItem("nexus.remember.email"));
  await page.reload({ waitUntil: "networkidle0" });
  await page.waitForSelector("input[type=email]");
  await page.type("input[type=email]", "nexusbussiness.admin@gmail.com", { delay: 4 });
  await page.type("input[type=password]", SENHA_ADMIN, { delay: 4 });
  await page.click(".neu-check");
  await page.click(".neu-btn");
  await page.waitForFunction(() => location.pathname.startsWith("/app"), { timeout: 15000 });
  ok(true, "login com e-mail digitado + lembrar marcado");

  // Passo 2: voltar ao login — campo e-mail DEVE estar vazio, com dica discreta.
  await page.goto(BASE + "/login", { waitUntil: "networkidle0" });
  await page.waitForSelector("input[type=email]");
  const emailValue = await page.$eval("input[type=email]", (el) => el.value);
  const placeholder = await page.$eval("input[type=email]", (el) => el.placeholder);
  const hint = await page.$(".auth-hint");
  const stored = await page.evaluate(() => localStorage.getItem("nexus.remember.email"));
  ok(emailValue === "", "campo de e-mail vazio ao voltar (valor: '" + emailValue + "')");
  ok(placeholder === "seu@email.com", "placeholder generico, sem dados gravados");
  ok(!!hint, "dica discreta de e-mail lembrado presente");
  ok(stored === "nexusbussiness.admin@gmail.com", "e-mail gravado no navegador (invisivel)");

  // Passo 3: digitar SÓ a senha e entrar — usa o e-mail lembrado em silêncio.
  await page.type("input[type=password]", SENHA_ADMIN, { delay: 4 });
  await page.click(".neu-btn");
  await page.waitForFunction(() => location.pathname.startsWith("/app"), { timeout: 15000 });
  ok(true, "login apenas com senha usando o e-mail lembrado");

  await browser.close();
  console.log(process.exitCode ? "FALHOU" : "ok: regra do lembrar de mim verificada");
})().catch((e) => { console.error("falha:", e.message); process.exit(1); });
