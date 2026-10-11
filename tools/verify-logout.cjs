// Prova: ao deslogar, o usuario volta SEMPRE para a pagina de boas-vindas ("/").
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
  const ok = (c, m) => { console.log((c ? "OK  " : "FAIL") + "  " + m); if (!c) process.exitCode = 1; };

  await page.goto(BASE + "/login", { waitUntil: "networkidle0" });
  await page.evaluate(() => localStorage.removeItem("nexus.remember.email"));
  await page.reload({ waitUntil: "networkidle0" });
  await page.waitForSelector("input[type=email]");
  await page.type("input[type=email]", "nexusbussiness.admin@gmail.com", { delay: 3 });
  await page.type("input[type=password]", SENHA_ADMIN, { delay: 3 });
  await page.click(".neu-btn");
  await page.waitForFunction(() => location.pathname.startsWith("/app"), { timeout: 15000 });
  ok(true, "login levou ao painel /app");

  // Encontra o botao de sair (texto "Sair") no shell administrativo.
  const clicked = await page.evaluate(() => {
    const el = [...document.querySelectorAll("button,a")].find((b) => /sair|logout|encerrar/i.test(b.textContent || ""));
    if (el) { el.click(); return el.textContent.trim(); }
    return null;
  });
  ok(!!clicked, "botao de logout encontrado: " + clicked);
  await page.waitForFunction(() => location.pathname === "/", { timeout: 15000 });
  const atWelcome = await page.evaluate(() => location.pathname === "/");
  ok(atWelcome, "apos deslogar, URL e a pagina de boas-vindas (/)");

  // Sessao deve estar morta: voltar nao reabre o painel.
  await page.goBack({ waitUntil: "networkidle0" });
  await new Promise((r) => setTimeout(r, 800));
  const backPath = await page.evaluate(() => location.pathname);
  ok(backPath !== "/app" && !backPath.startsWith("/app"), "voltar do navegador nao reabre o painel (path=" + backPath + ")");

  await browser.close();
  console.log(process.exitCode ? "FALHOU" : "ok: logout volta para as boas-vindas");
})().catch((e) => { console.error("falha:", e.message); process.exit(1); });
