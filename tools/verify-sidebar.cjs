// Prova automatizada do Sidebar Toggle: icone moderno no cabecalho, modo trilha
// no desktop (so icomes, com tooltip e persistencia) e gaveta off-canvas no
// tablet/celular (com scrim, Esc e sem overflow horizontal).
const puppeteer = require("puppeteer-core");

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const BASE = "http://localhost:5173";
const SHOTS = "docs/screenshots";

let checks = 0;
const falhas = [];
function ok(nome, cond, detalhe) {
  checks += 1;
  if (cond) console.log("  [ok] " + nome + (detalhe ? " (" + detalhe + ")" : ""));
  else {
    falhas.push(nome + (detalhe ? " -> " + detalhe : ""));
    console.log("  [FALHA] " + nome + (detalhe ? " (" + detalhe + ")" : ""));
  }
}
const espera = (ms) => new Promise((r) => setTimeout(r, ms));

// As notificacoes (Toastr) ficam sobre o cabecalho; espera sumirem para a foto sair limpa.
async function semToast(page) {
  await page.waitForFunction(() => !document.querySelector(".toast-message, .toast"), { timeout: 12000 }).catch(() => {});
  await espera(250);
}

async function entrada(page) {
  await page.goto(BASE + "/login", { waitUntil: "networkidle0" });
  await page.waitForSelector("input[type=email]");
  await page.type("input[type=email]", "nexusbussiness.admin@gmail.com");
  await page.type("input[type=password]", "senha-removida-do-git");
  await Promise.all([
    page.waitForFunction(() => window.location.pathname.startsWith("/app"), { timeout: 15000 }),
    page.click("button[type=submit]"),
  ]);
  await page.waitForSelector(".kpi-grid, .page", { timeout: 15000 });
  await page.evaluate(() => localStorage.removeItem("nexus.sidebar.collapsed"));
  await espera(500);
}

// Leitura do estado da UI em uma unica passada, para comparar antes/depois.
function estado() {
  const shell = document.querySelector(".admin-shell");
  const sidebar = document.querySelector(".admin-sidebar");
  const toggle = document.querySelector(".admin-toggle");
  const title = document.querySelector(".admin-header-title");
  const label = document.querySelector(".admin-nav-label");
  const brand = document.querySelector(".admin-brand-text");
  const svg = toggle ? toggle.querySelector("svg") : null;
  const first = document.querySelector(".admin-nav-item");
  return {
    classes: shell ? shell.className : "",
    larguraSidebar: sidebar ? Math.round(sidebar.getBoundingClientRect().width) : -1,
    visibilidadeSidebar: sidebar ? getComputedStyle(sidebar).visibility : "",
    transformSidebar: sidebar ? getComputedStyle(sidebar).transform : "",
    temToggle: Boolean(toggle),
    temSvg: Boolean(svg),
    temHamburguer: Boolean(document.querySelector(".admin-hamburger")),
    ariaLabel: toggle ? toggle.getAttribute("aria-label") : "",
    ariaExpanded: toggle ? toggle.getAttribute("aria-expanded") : "",
    ariaPressed: toggle ? toggle.getAttribute("aria-pressed") : "",
    ariaControls: toggle ? toggle.getAttribute("aria-controls") : "",
    toggleX: toggle ? Math.round(toggle.getBoundingClientRect().x) : -1,
    titleX: title ? Math.round(title.getBoundingClientRect().x) : -1,
    toggleRadius: toggle ? getComputedStyle(toggle).borderRadius : "",
    iconTransform: svg ? getComputedStyle(svg).transform : "",
    labelDisplay: label ? getComputedStyle(label).display : "",
    brandDisplay: brand ? getComputedStyle(brand).display : "",
    // A barra nao pode panar na horizontal: foi aqui que nasceu a barra de
    // rolagem no pe do menu (o tooltip media dentro do conteudo rolavel).
    sidebarOverflowX: sidebar ? sidebar.scrollWidth - sidebar.clientWidth : -1,
    scrimDisplay: (() => {
      const s = document.querySelector(".admin-scrim");
      return s ? getComputedStyle(s).display : "ausente";
    })(),
    overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  };
}

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: "new",
    args: ["--no-sandbox", "--disable-gpu"],
    defaultViewport: { width: 1440, height: 900 },
  });
  const page = await browser.newPage();
  const erros = [];
  page.on("pageerror", (e) => erros.push(String(e.message)));
  page.on("console", (m) => { if (m.type() === "error") erros.push(m.text()); });

  console.log("== Desktop 1440px ==");
  await entrada(page);
  await page.waitForSelector(".admin-toggle svg");
  let e = await page.evaluate(estado);
  ok("botao de alternancia presente no cabecalho", e.temToggle && e.temSvg);
  ok("hambúrguer de 3 linhas não existe mais", !e.temHamburguer);
  ok("botao fica a esquerda do titulo Business Manager", e.toggleX < e.titleX, e.toggleX + " < " + e.titleX);
  ok("bordas arredondadas no botao", parseInt(e.toggleRadius, 10) >= 8, e.toggleRadius);
  ok("sidebar expandida em desktop", e.larguraSidebar === 264, e.larguraSidebar + "px");
  ok("rotulos dos itens visiveis", e.labelDisplay === "block" || e.labelDisplay === "inline-block" || e.labelDisplay === "flex", e.labelDisplay);
  ok("aria-label de recolher", e.ariaLabel === "Recolher menu lateral", e.ariaLabel);
  ok("aria-expanded verdadeiro com a barra visivel", e.ariaExpanded === "true");
  ok("aria-controls aponta para a sidebar", e.ariaControls === "admin-sidebar" && Boolean(await page.$("#admin-sidebar")));
  await semToast(page);
  await page.screenshot({ path: SHOTS + "/16-sidebar-desktop.png" });

  // Modo trilha: um clique recolhe para so icones.
  await page.click(".admin-toggle");
  await espera(400);
  e = await page.evaluate(estado);
  ok("clique ativa o modo trilha", e.classes.includes("is-collapsed"));
  ok("sidebar estreita (so icones)", e.larguraSidebar >= 70 && e.larguraSidebar <= 82, e.larguraSidebar + "px");
  ok("rotulos ocultados", e.labelDisplay === "none", e.labelDisplay);
  ok("nome da marca ocultado", e.brandDisplay === "none", e.brandDisplay);
  ok("icone gira com feedback (scaleX invertido)", e.iconTransform.startsWith("matrix(-1"), e.iconTransform);
  ok("aria-label vira expandir", e.ariaLabel === "Expandir menu lateral", e.ariaLabel);
  ok("aria-expanded passa a falso", e.ariaExpanded === "false");
  ok("sem rolagem horizontal dentro da sidebar", e.sidebarOverflowX <= 0, "estouro " + e.sidebarOverflowX + "px");
  ok("conteudo nao estoura a largura da janela", e.overflowX <= 0, "overflow " + e.overflowX);

  await page.hover(".admin-nav-item");
  await espera(250);
  const dica = await page.evaluate(() => {
    const el = document.querySelector(".admin-rail-tip");
    const sb = document.querySelector(".admin-sidebar");
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { texto: el.textContent, foraDaBarra: r.left >= sb.getBoundingClientRect().right, visivel: r.width > 0, papel: el.getAttribute("role") };
  });
  ok("dica mostra o nome do item ao passar o mouse", Boolean(dica) && /Dashboard/.test(dica.texto), dica && dica.texto);
  ok("dica aparece do lado de fora da barra", Boolean(dica) && dica.foraDaBarra === true);
  ok("dica continua sem alargar a barra", (await page.evaluate(() => { const b = document.querySelector(".admin-sidebar"); return b.scrollWidth - b.clientWidth; })) <= 0);
  await semToast(page);
  await page.screenshot({ path: SHOTS + "/16-sidebar-colapsada.png" });

  // Navegacao continua funcionando so com icones.
  await page.click('.admin-nav-item[aria-label="Clientes"]');
  await page.waitForFunction(() => window.location.pathname === "/app/clientes", { timeout: 10000 });
  await page.waitForSelector(".page-head", { timeout: 10000 });
  ok("navegacao por icone funciona no modo trilha", true);

  // Persistencia entre visitas.
  await page.reload({ waitUntil: "networkidle0" });
  await page.waitForSelector(".admin-toggle", { timeout: 10000 });
  await espera(400);
  e = await page.evaluate(estado);
  ok("modo trilha persiste apos recarregar", e.classes.includes("is-collapsed") && e.larguraSidebar <= 82, e.larguraSidebar + "px");

  // Expandir de volta + foco por teclado no botao.
  await page.click(".admin-toggle");
  await espera(400);
  e = await page.evaluate(estado);
  ok("expandir restaura a barra larga", !e.classes.includes("is-collapsed") && e.larguraSidebar === 264, e.larguraSidebar + "px");
  const focoNoBotao = await page.evaluate(async () => {
    const b = document.querySelector(".admin-toggle");
    b.focus();
    await new Promise((r) => setTimeout(r, 60));
    const antes = Math.round(b.getBoundingClientRect().width);
    return document.activeElement === b && antes > 30;
  });
  ok("botao recebe foco pelo teclado", focoNoBotao);
  const larguraBotao = await page.evaluate(() => {
    const r = document.querySelector(".admin-toggle").getBoundingClientRect();
    return Math.round(r.width) + "x" + Math.round(r.height);
  });
  ok("area de toque adequada (>= 36px)", larguraBotao === "38x38", larguraBotao);

  console.log("== Tablet 820px ==");
  await page.setViewport({ width: 820, height: 1180 });
  await page.reload({ waitUntil: "networkidle0" });
  await page.waitForSelector(".admin-toggle", { timeout: 10000 });
  await espera(400);
  e = await page.evaluate(estado);
  const botaoVisivel = await page.evaluate(() => {
    const r = document.querySelector(".admin-toggle").getBoundingClientRect();
    return r.width > 20 && r.height > 20;
  });
  ok("botao continua visivel no tablet", botaoVisivel);
  ok("sidebar vira gaveta fechada", e.visibilidadeSidebar === "hidden" && e.transformSidebar.startsWith("matrix(1, 0, 0, 1, -"), e.visibilidadeSidebar + " " + e.transformSidebar);
  ok("aria-label de abrir menu", e.ariaLabel === "Abrir menu", e.ariaLabel);
  ok("modo trilha foi desligado no tablet", !e.classes.includes("is-collapsed"));

  await page.click(".admin-toggle");
  await espera(400);
  e = await page.evaluate(estado);
  const gavetaAberta = e.classes.includes("is-sidebar-open") && e.visibilidadeSidebar === "visible" && (e.transformSidebar === "none" || e.transformSidebar === "matrix(1, 0, 0, 1, 0, 0)");
  ok("clique abre a gaveta", gavetaAberta, e.visibilidadeSidebar + " " + e.transformSidebar);
  ok("véu escurecido aparece atrás da gaveta", e.scrimDisplay === "block", e.scrimDisplay);
  ok("aria-expanded verdadeiro com a gaveta aberta", e.ariaExpanded === "true");
  ok("icone inverte no estado aberto", e.iconTransform.startsWith("matrix(-1"), e.iconTransform);
  await semToast(page);
  await page.screenshot({ path: SHOTS + "/16-sidebar-tablet.png" });

  await page.keyboard.press("Escape");
  await espera(400);
  e = await page.evaluate(estado);
  ok("Esc fecha a gaveta", !e.classes.includes("is-sidebar-open") && e.visibilidadeSidebar === "hidden");
  ok("nenhum rotulo de trilha pendente", e.labelDisplay !== "none", e.labelDisplay);

  console.log("== Celular 390px ==");
  await page.setViewport({ width: 390, height: 844 });
  await page.reload({ waitUntil: "networkidle0" });
  await page.waitForSelector(".admin-toggle", { timeout: 10000 });
  await espera(400);
  e = await page.evaluate(estado);
  ok("gaveta fechada ao entrar no celular", e.visibilidadeSidebar === "hidden");
  ok("sem overflow horizontal com a gaveta fechada", e.overflowX <= 0, "overflow " + e.overflowX);

  await page.click(".admin-toggle");
  await espera(400);
  e = await page.evaluate(estado);
  ok("gaveta abre no celular", e.visibilidadeSidebar === "visible" && e.scrimDisplay === "block");
  ok("gaveta nao estoura a tela", e.larguraSidebar <= 390, e.larguraSidebar + "px");
  await semToast(page);
  await page.screenshot({ path: SHOTS + "/16-sidebar-celular.png" });

  // Clique fora (no veu) fecha a gaveta.
  await page.mouse.click(360, 600);
  await espera(400);
  e = await page.evaluate(estado);
  ok("clique fora fecha a gaveta", !e.classes.includes("is-sidebar-open") && e.visibilidadeSidebar === "hidden");

  // Botao fechar proprio da gaveta (o do cabecalho fica atras dela).
  await page.click(".admin-toggle");
  await espera(400);
  const fecharVisivel = await page.evaluate(() => {
    const b = document.querySelector(".admin-drawer-close");
    if (!b) return false;
    const r = b.getBoundingClientRect();
    return getComputedStyle(b).display !== "none" && r.width >= 28 && r.right <= 264;
  });
  ok("botao fechar aparece dentro da gaveta", fecharVisivel);
  await page.click(".admin-drawer-close");
  await espera(400);
  e = await page.evaluate(estado);
  ok("botao fechar fecha a gaveta", !e.classes.includes("is-sidebar-open") && e.visibilidadeSidebar === "hidden");

  // Navegar pela gaveta fecha e leva para a pagina certa.
  await page.click(".admin-toggle");
  await espera(400);
  await page.click('.admin-nav-item[aria-label="Produtos"]');
  await page.waitForFunction(() => window.location.pathname === "/app/produtos", { timeout: 10000 });
  await espera(400);
  e = await page.evaluate(estado);
  ok("navegar pela gaveta fecha a gaveta", !e.classes.includes("is-sidebar-open"));
  ok("pagina de Produtos carregou", (await page.url()).includes("/app/produtos"));

  console.log("== Tema claro (desktop) ==");
  await page.setViewport({ width: 1440, height: 900 });
  await page.reload({ waitUntil: "networkidle0" });
  await page.waitForSelector(".admin-toggle", { timeout: 10000 });
  await page.evaluate(() => document.querySelector(".theme-switch").click());
  await espera(500);
  const claro = await page.evaluate(() => {
    const b = document.querySelector(".admin-toggle");
    const cs = getComputedStyle(b);
    const lê = (v) => {
      const n = v.match(/[\d.]+/g) || [];
      const p = (k) => Number(n[k] || 0) * (v.indexOf("color(srgb") === 0 ? 255 : 1);
      return [p(0), p(1), p(2)];
    };
    const sb = getComputedStyle(document.querySelector(".admin-sidebar")).backgroundColor;
    const c = lê(sb);
    const luminancia = (c[0] + c[1] + c[2]) / 3;
    return { borda: cs.borderTopColor, cor: cs.color, luminancia };
  });
  ok("tema claro: superficie da barra clareou", claro.luminancia > 200, "luminancia " + Math.round(claro.luminancia));
  ok("tema claro: botao mantem contorno visivel", claro.borda !== "rgba(0, 0, 0, 0)" && claro.borda !== "transparent", claro.borda);
  await page.click(".admin-toggle");
  await espera(400);
  await semToast(page);
  await page.screenshot({ path: SHOTS + "/16-sidebar-tema-claro.png" });
  await page.click(".admin-toggle");
  await espera(400);
  await page.evaluate(() => document.querySelector(".theme-switch").click());
  await espera(300);

  console.log("");
  console.log("checagens: " + checks);
  console.log("erros de console: " + (erros.length === 0 ? "nenhum" : erros.join(" | ")));
  if (falhas.length === 0 && erros.length === 0) console.log("TODAS AS CHECAGENS PASSARAM");
  else {
    console.log("falhas:");
    for (const f of falhas) console.log(" - " + f);
  }
  await browser.close();
  process.exit(falhas.length === 0 && erros.length === 0 ? 0 : 1);
})().catch((err) => {
  console.error("falha no script:", err.message);
  process.exit(1);
});
