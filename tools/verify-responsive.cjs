// Verifica as correcoes de responsividade:
// 1) nenhuma pagina arrasta na horizontal (320-1400px)
// 2) cabecalho admin continua sticky (overflow-x: clip nao quebra sticky)
// 3) sidebar fechada some da caixa (visibility) e abre normalmente
// 4) configuracoes: 1 coluna no celular, multiplas colunas no desktop
const puppeteer = require("puppeteer-core");
const { SENHA_ADMIN } = require("./senha-admin.cjs");
const BASE = "http://localhost:5173";
(async () => {
  const browser = await puppeteer.launch({
    executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
    headless: "new", args: ["--no-sandbox", "--disable-gpu"],
  });
  const page = await browser.newPage();
  const ok = (c, m) => { console.log((c ? "OK  " : "FAIL") + "  " + m); if (!c) process.exitCode = 1; };

  await page.setViewport({ width: 1280, height: 800 });
  await page.goto(BASE + "/login", { waitUntil: "networkidle0" });
  await page.type("input[type=email]", "nexusbussiness.admin@gmail.com", { delay: 2 });
  await page.type("input[type=password]", SENHA_ADMIN, { delay: 2 });
  await page.click(".neu-btn");
  await page.waitForFunction(() => location.pathname.startsWith("/app"), { timeout: 15000 });

  // 1) varredura rapida de larguras em todas as rotas
  const rotas = ["/", "/login", "/cadastro", "/app", "/app/clientes", "/app/configuracoes", "/app/usuarios", "/app/auditoria"];
  let overflow = 0;
  for (const w of [320, 360, 414, 560, 768, 820, 1024]) {
    await page.setViewport({ width: w, height: 800 });
    for (const p of rotas) {
      await page.goto(BASE + p, { waitUntil: "domcontentloaded" });
      await new Promise((r) => setTimeout(r, 200));
      const res = await page.evaluate(() => ({ s: document.documentElement.scrollWidth, c: document.documentElement.clientWidth }));
      if (res.s > res.c + 1) { overflow++; console.log("   overflow " + w + "px " + p); }
    }
  }
  ok(overflow === 0, "nenhum overflow horizontal em 7 larguras x 8 rotas");

  // 2) sticky do cabecalho com overflow-x: clip
  await page.setViewport({ width: 1280, height: 600 });
  await page.goto(BASE + "/app/clientes", { waitUntil: "networkidle0" });
  await page.evaluate(() => window.scrollTo(0, 400));
  await new Promise((r) => setTimeout(r, 300));
  const sticky = await page.evaluate(() => {
    const h = document.querySelector(".admin-header");
    return { pos: getComputedStyle(h).position, top: Math.round(h.getBoundingClientRect().top) };
  });
  ok(sticky.pos === "sticky" && sticky.top === 0, "cabecalho admin continua sticky ao rolar (pos=" + sticky.pos + " top=" + sticky.top + ")");

  // 3) sidebar fechada invisivel no mobile; abre com hamburger
  await page.setViewport({ width: 390, height: 800 });
  await page.goto(BASE + "/app", { waitUntil: "networkidle0" });
  const closed = await page.evaluate(() => getComputedStyle(document.querySelector(".admin-sidebar")).visibility);
  ok(closed === "hidden", "sidebar fechada com visibility hidden no mobile");
  await page.click(".admin-hamburger");
  await new Promise((r) => setTimeout(r, 350));
  const opened = await page.evaluate(() => {
    const sb = document.querySelector(".admin-sidebar");
    return { vis: getComputedStyle(sb).visibility, left: Math.round(sb.getBoundingClientRect().left) };
  });
  ok(opened.vis === "visible" && opened.left === 0, "sidebar abre visivel na tela (vis=" + opened.vis + " left=" + opened.left + ")");

  // 4) grade de configuracoes: colunas
  await page.goto(BASE + "/app/configuracoes", { waitUntil: "networkidle0" });
  const colsMobile = await page.evaluate(() => getComputedStyle(document.querySelector(".settings-grid")).gridTemplateColumns.split(" ").length);
  await page.setViewport({ width: 1280, height: 800 });
  await new Promise((r) => setTimeout(r, 300));
  const colsDesktop = await page.evaluate(() => getComputedStyle(document.querySelector(".settings-grid")).gridTemplateColumns.split(" ").length);
  ok(colsMobile === 1, "configuracoes em 1 coluna no celular");
  ok(colsDesktop >= 2, "configuracoes em " + colsDesktop + " colunas no desktop");

  await browser.close();
  console.log(process.exitCode ? "FALHOU" : "ok: responsividade verificada");
})().catch((e) => { console.error("falha:", e.message); process.exit(1); });
