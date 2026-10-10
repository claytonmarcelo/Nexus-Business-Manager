// Captura as telas reais do Nexus Business Manager (Chrome headless) para o README.
const puppeteer = require("puppeteer-core");
const fs = require("fs");
const path = require("path");

const OUT = path.join(__dirname, "..", "docs", "screenshots");
fs.mkdirSync(OUT, { recursive: true });

const BASE = "http://localhost:5173";
const EMAIL = "nexusbussiness.admin@gmail.com"; // administrador definitivo (CREDENCIAIS.md)
const SENHA = "senha-removida-do-git";

async function shot(page, nome) {
  await new Promise((r) => setTimeout(r, 600));
  const destino = path.join(OUT, nome + ".png");
  await page.screenshot({ path: destino });
  console.log("capturado", nome);
}

(async () => {
  const browser = await puppeteer.launch({
    executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
    headless: "new",
    args: ["--no-sandbox", "--disable-gpu", "--window-size=1440,900"],
    defaultViewport: { width: 1440, height: 900 },
  });
  const page = await browser.newPage();

  // 1. Landing
  await page.goto(BASE + "/", { waitUntil: "networkidle0" });
  await shot(page, "01-landing");

  // 2. Login (senha digitada e visivel pelo botao olho)
  await page.goto(BASE + "/login", { waitUntil: "networkidle0" });
  await page.waitForSelector("input[type=email]", { timeout: 15000 });
  await page.waitForSelector("input[type=password]", { timeout: 15000 });
  await page.type("input[type=email], input[name=email], input#email", EMAIL, { delay: 5 });
  await page.type("input[type=password]", SENHA, { delay: 5 });
  await page.waitForSelector(".eye-toggle", { timeout: 15000 });
  await page.click(".eye-toggle"); // mostra a senha digitada
  await shot(page, "02-login");

  // Login real
  await Promise.all([
    page.waitForFunction(() => window.location.pathname.startsWith("/app"), { timeout: 15000 }),
    page.click("button[type=submit]"),
  ]);
  await page.waitForSelector(".kpi-grid", { timeout: 15000 });

  // 3. Dashboard
  await new Promise((r) => setTimeout(r, 1200));
  await shot(page, "03-dashboard");

  // 4. Usuarios
  await page.goto(BASE + "/app/usuarios", { waitUntil: "networkidle0" });
  await page.waitForSelector(".table", { timeout: 15000 });
  await shot(page, "04-usuarios");

  // 5. Auditoria
  await page.goto(BASE + "/app/auditoria", { waitUntil: "networkidle0" });
  await page.waitForSelector(".table", { timeout: 15000 });
  await shot(page, "05-auditoria");

  // 6. Configuracoes (tema claro)
  await page.goto(BASE + "/app/configuracoes", { waitUntil: "networkidle0" });
  await page.evaluate(() => {
    const alvo = Array.from(document.querySelectorAll("label, button, span")).find((el) =>
      (el.textContent || "").trim().toLowerCase() === "claro"
    );
    if (alvo) alvo.click();
  });
  await new Promise((r) => setTimeout(r, 900));
  await shot(page, "06-configuracoes-claro");

  await browser.close();
  console.log("ok: 6 telas capturadas em", OUT);
})().catch((e) => {
  console.error("falha:", e.message);
  process.exit(1);
});
