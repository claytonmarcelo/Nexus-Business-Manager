// Prova automatizada do Sidebar Toggle: icone moderno no cabecalho, modo trilha
// no desktop (so icones) com HOVER PEEK (o ponteiro revela a barra larga por
// cima do conteudo, sem empurra-lo, e sair do mouse recolhe) e gaveta
// off-canvas no tablet/celular (com scrim, Esc e sem overflow horizontal).
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
    // O x do conteudo e a prova de que o peek nao empurra o layout: tem de
    // continuar exatamente no mesmo lugar com a barra larga por cima.
    conteudoX: (() => { const c = document.querySelector(".admin-content"); return c ? Math.round(c.getBoundingClientRect().x) : -1; })(),
    xSidebar: sidebar ? Math.round(sidebar.getBoundingClientRect().x) : -1,
    sombraSidebar: sidebar ? getComputedStyle(sidebar).boxShadow !== "none" : false,
    toggleRadius: toggle ? getComputedStyle(toggle).borderRadius : "",
    iconTransform: svg ? getComputedStyle(svg).transform : "",
    labelDisplay: label ? getComputedStyle(label).display : "",
    brandDisplay: brand ? getComputedStyle(brand).display : "",
    // A barra nao pode panar na horizontal: foi aqui que nasceu a barra de
    // rolagem no pe do menu (o tooltip media dentro do conteudo rolavel).
    sidebarOverflowX: sidebar ? sidebar.scrollWidth - sidebar.clientWidth : -1,
    // ===== Camadas do menu (group headers) =====
    // Titulos visiveis na ordem da barra. No modo trilha a lista tem de voltar
    // vazia: la so existe icone, e um titulo sobrando seria texto cortado em 78px.
    titulosVisiveis: Array.from(document.querySelectorAll(".admin-nav-group-title"))
      .filter((p) => p.getBoundingClientRect().height > 0)
      .map((p) => p.textContent),
    qtdTitulos: document.querySelectorAll(".admin-nav-group-title").length,
    // O filete entre camadas e o que sobra do titulo na trilha. ::before nao e
    // selecionavel por querySelectorAll, entao a unica saida e o estilo computado.
    temFilete: (() => {
      const g = document.querySelectorAll(".admin-nav-group");
      if (g.length < 2) return false;
      const cs = getComputedStyle(g[1], "::before");
      // height nao serve de prova: o estilo computado devolve 1px mesmo com o
      // pseudo-elemento desligado. O que conta e estar gerado E visivel.
      return cs.content !== "none" && cs.content !== "" && cs.display !== "none";
    })(),
    emBreve: Array.from(document.querySelectorAll(".admin-nav-item.is-soon")).map((s) => {
      const l = s.querySelector(".admin-nav-label");
      const ic = s.querySelector(".admin-nav-icon");
      const c = s.querySelector(".admin-nav-soon");
      const depois = ic ? getComputedStyle(ic, "::after") : null;
      return {
        nome: l ? l.textContent : "?",
        rotuloVisivel: l ? l.getBoundingClientRect().height > 0 : false,
        // O ponto no canto do icone e o aviso que sobra quando nao ha largura
        // para escrever "em breve" ao lado do nome.
        ponto: Boolean(depois) && depois.width === "5px" && parseFloat(depois.borderRadius) > 0,
        etiqueta: c ? c.textContent : "",
        altura: Math.round(s.getBoundingClientRect().height),
      };
    }),
    // A ordem dos rotulos dos itens e a ordem da barra larga.
    rotulosVisiveis: Array.from(document.querySelectorAll(".admin-nav-label"))
      .filter((s) => s.getBoundingClientRect().height > 0)
      .map((s) => s.textContent),
    // Camada vazia (titulo sem item visivel) e o defeito que o filtro de
    // permissao precisa evitar.
    grupoVazio: Array.from(document.querySelectorAll(".admin-nav-group")).some((g) => {
      const alvos = g.querySelectorAll(".admin-nav-item");
      return alvos.length === 0 || !Array.from(alvos).some((a) => a.getBoundingClientRect().height > 0);
    }),
    larguraItem: (() => { const i = document.querySelector(".admin-nav-item"); return i ? Math.round(i.getBoundingClientRect().width) : -1; })(),
    // Nome cortado em "Ordens de Serv..." e o defeito que a etiqueta "em breve"
    // pode causar: ela nao pode roubar a largura do rotulo.
    truncados: Array.from(document.querySelectorAll(".admin-nav-label"))
      .filter((s) => s.getBoundingClientRect().height > 0 && s.scrollWidth > s.clientWidth + 1)
      .map((s) => s.textContent),
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
  const CAMADAS = ["Visão Geral", "Comercial & CRM", "Estoque & Suprimentos", "Serviços & Atendimentos", "Financeiro", "Administração & Sistema"];
  const ITENS = ["Dashboard", "CRM", "Clientes", "Vendas", "Produtos", "Compras", "Ordens de Serviço", "Agenda", "Financeiro", "Gateways & Cobranças", "Usuários", "Auditoria", "CMS & Site Público", "Configurações"];
  ok("as 6 camadas aparecem na ordem pedida", e.titulosVisiveis.join(" | ") === CAMADAS.join(" | "), e.titulosVisiveis.join(" | "));
  ok("nenhuma camada ficou vazia", e.grupoVazio === false);
  ok("na barra larga quem separa a camada e o titulo, nao o filete", e.temFilete === false);
  ok("itens ocupam a largura da barra (camada nao encolhe o item)", e.larguraItem > 200, e.larguraItem + "px");
  ok("nenhum nome de modulo sai cortado na barra larga", e.truncados.length === 0, e.truncados.join(", "));
  {
    const estiloTitulo = await page.evaluate(() => {
      const p = document.querySelector(".admin-nav-group-title");
      const cs = getComputedStyle(p);
      return {
        texto: p.textContent,
        transform: cs.textTransform,
        peso: Number(cs.fontWeight),
        tamanho: parseFloat(cs.fontSize),
        espaco: cs.letterSpacing,
        cor: cs.color,
      };
    });
    ok("titulo de camada em caixa alta", estiloTitulo.transform === "uppercase" && estiloTitulo.texto === "Visão Geral", estiloTitulo.texto);
    ok("titulo de camada com fonte reduzida (< 12px)", estiloTitulo.tamanho > 0 && estiloTitulo.tamanho < 12, estiloTitulo.tamanho + "px");
    ok("titulo de camada em negrito discreto", estiloTitulo.peso >= 600, "peso " + estiloTitulo.peso);
    ok("titulo de camada com letter-spacing de tracking", parseFloat(estiloTitulo.espaco) > 0, estiloTitulo.espaco);
    ok("titulo de camada usa o cinz do sistema", estiloTitulo.cor === "rgb(107, 114, 128)", estiloTitulo.cor);
  }
  ok("modulos ainda sem obra aparecem na camada", e.emBreve.map((x) => x.nome).join(", ") === "Ordens de Serviço, Gateways & Cobranças, CMS & Site Público", e.emBreve.map((x) => x.nome).join(", "));
  ok("na barra larga o em breve tem ponto no icone e texto acessivel", e.emBreve.every((x) => x.rotuloVisivel && x.ponto && x.etiqueta === "em breve"), e.emBreve.map((x) => x.nome + ":" + (x.ponto ? "ponto" : "sem ponto")).join(", "));
  {
    const soon = await page.evaluate(() => {
      const s = document.querySelector(".admin-nav-item.is-soon");
      return { tag: s.tagName, aria: s.getAttribute("aria-disabled"), href: s.getAttribute("href"), etiqueta: s.querySelector(".admin-nav-soon").textContent, dica: s.getAttribute("title") };
    });
    ok("item em breve NAO e um link", soon.tag === "SPAN" && soon.href === null, soon.tag);
    ok("item em breve diz que esta em breve", soon.etiqueta === "em breve" && soon.aria === "true", soon.etiqueta);
    ok("item em breve explica na dica", /em construcao|construção/.test(soon.dica || ""), soon.dica);
  }
  ok("os itens ficaram dentro das suas camadas", e.rotulosVisiveis.join(", ") === ITENS.join(", "), e.rotulosVisiveis.slice(0, 4).join(", ") + "...");
  await semToast(page);
  await page.screenshot({ path: SHOTS + "/16-sidebar-desktop.png" });

  // O ponteiro fica estacionado sobre o conteudo: sem isso, a primeira foto do
  // modo trilha sairia com o peek aberto e a checagem de largura mentiria.
  await page.mouse.move(1100, 620);
  await espera(420);

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
  ok("na trilha os titulos de camada somem", e.titulosVisiveis.length === 0 && e.qtdTitulos === 6, "visiveis " + e.titulosVisiveis.length);
  ok("na trilha sobra um filete no lugar de cada titulo", e.temFilete === true);
  ok("na trilha o em breve continua marcado no icone", e.emBreve.every((x) => !x.rotuloVisivel && x.ponto && x.altura > 20));
  ok("na trilha so os icones ficam alinhados", e.larguraItem > 50 && e.larguraItem < 80, e.larguraItem + "px");
  ok("sem rolagem horizontal dentro da sidebar", e.sidebarOverflowX <= 0, "estouro " + e.sidebarOverflowX + "px");
  ok("conteudo nao estoura a largura da janela", e.overflowX <= 0, "overflow " + e.overflowX);

  // ===== HOVER PEEK: a trilha se revela com o ponteiro =====
  const larguraTrilha = e.larguraSidebar;
  const xConteudoTrilha = e.conteudoX;
  await page.mouse.move(1100, 620);
  await espera(420);
  e = await page.evaluate(estado);
  ok("fora da barra, a trilha permanece estreita", e.larguraSidebar === larguraTrilha && !e.classes.includes("is-peek"), e.larguraSidebar + "px");
  ok("nenhuma dica flutuante sobrou (o peek substituiu)", (await page.$(".admin-rail-tip")) === null);
  await semToast(page);
  await page.screenshot({ path: SHOTS + "/16-sidebar-colapsada.png" });

  await page.hover(".admin-sidebar");
  await espera(360);
  const peek = await page.evaluate(estado);
  ok("hover expande a barra ate a largura cheia", peek.larguraSidebar === 264, peek.larguraSidebar + "px");
  ok("classe is-peek marca a expansao temporaria", peek.classes.includes("is-peek"));
  ok("rotulos dos itens aparecem no peek", peek.labelDisplay !== "none", peek.labelDisplay);
  ok("nome da marca aparece no peek", peek.brandDisplay !== "none", peek.brandDisplay);
  ok("conteudo NAO e empurrado pelo peek", peek.conteudoX === xConteudoTrilha, "x " + xConteudoTrilha + " -> " + peek.conteudoX);
  ok("peek comeca na borda esquerda", peek.xSidebar === 0, String(peek.xSidebar));
  ok("peek flutua acima do conteudo (sombra aplicada)", peek.sombraSidebar === true);
  ok("sem rolagem horizontal dentro da barra no peek", peek.sidebarOverflowX <= 0, "estouro " + peek.sidebarOverflowX + "px");
  ok("o peek revela os titulos de camada de novo", peek.titulosVisiveis.length === 6, "visiveis " + peek.titulosVisiveis.length);
  ok("no peek o filete da trilha da lugar ao titulo", peek.temFilete === false);
  ok("no peek o em breve volta com nome e ponto", peek.emBreve.every((x) => x.rotuloVisivel && x.ponto));
  ok("nenhum nome de modulo sai cortado no peek", peek.truncados.length === 0, peek.truncados.join(", "));
  ok("no peek os rotulos voltam na ordem das camadas", peek.rotulosVisiveis.join(", ") === "Dashboard, CRM, Clientes, Vendas, Produtos, Compras, Ordens de Serviço, Agenda, Financeiro, Gateways & Cobranças, Usuários, Auditoria, CMS & Site Público, Configurações", peek.rotulosVisiveis.slice(0, 3).join(", "));
  ok("sem overflow horizontal na janela durante o peek", peek.overflowX <= 0, "overflow " + peek.overflowX);
  await semToast(page);
  await page.screenshot({ path: SHOTS + "/16-sidebar-peek.png" });

  // O ponteiro sai da area da barra: recolhe sozinho.
  await page.mouse.move(1100, 620);
  await espera(460);
  e = await page.evaluate(estado);
  ok("sair do mouse recolhe a trilha", e.larguraSidebar === larguraTrilha && !e.classes.includes("is-peek"), e.larguraSidebar + "px");
  ok("rotulos somem de novo com a trilha fechada", e.labelDisplay === "none", e.labelDisplay);

  // Pelo teclado vale o mesmo: foco dentro da barra revela os rotulos.
  await page.evaluate(() => document.querySelector('.admin-nav-item[aria-label="Vendas"]').focus());
  await espera(360);
  e = await page.evaluate(estado);
  ok("receber foco pelo teclado tambem revela a barra", e.larguraSidebar === 264 && e.classes.includes("is-peek"), e.larguraSidebar + "px");
  await page.evaluate(() => document.querySelector(".admin-toggle").focus());
  await espera(460);
  e = await page.evaluate(estado);
  ok("perder o foco recolhe a trilha", !e.classes.includes("is-peek") && e.larguraSidebar === larguraTrilha, e.larguraSidebar + "px");

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

  // Barra fixada por clique: o hover nao tem efeito nenhum, nem para abrir nem
  // para fechar. Somente um novo clique no botao muda o estado.
  await page.hover(".admin-nav-item");
  await espera(360);
  e = await page.evaluate(estado);
  ok("barra fixada permanece larga com o mouse por cima", e.larguraSidebar === 264 && !e.classes.includes("is-collapsed"), e.larguraSidebar + "px");
  ok("barra fixada nao ganha a classe de peek", !e.classes.includes("is-peek"));
  await page.mouse.move(1100, 620);
  await espera(460);
  e = await page.evaluate(estado);
  ok("sair do mouse NAO recolhe a barra fixada", e.larguraSidebar === 264, e.larguraSidebar + "px");
  await page.click(".admin-toggle");
  await espera(420);
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
