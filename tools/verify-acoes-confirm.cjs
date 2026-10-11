// Prova automatizada de dois padroes visuais pedidos:
//  (1) coluna ACOES das tabelas com botoes sempre na mesma linha (.row-actions +
//      .col-acoes), sem estouro horizontal e sem cortar tabela;
//  (2) dialogo central de confirmacao: mesmo modal do sistema em Portal no body,
//      scrim com blur, nome do registro em destaque, botao vermelho para risco e
//      dourado para reativar, spinner + trava de duplo clique durante a API e
//      barra lateral congelada enquanto a pessoa confirma.
const puppeteer = require("puppeteer-core");

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const BASE = "http://localhost:5173";
const SHOTS = "docs/screenshots";

// A secao 5 desativa um cliente de verdade (e exatamente o ponto da prova). O
// restaurador fala com a API na porta 3001 para devolver o registro ao estado
// anterior, sem depender de um botao "Ativar" que a tela de Clientes nao tem.
const API = process.env.NEXUS_API || "http://localhost:3001";
const ADMIN_EMAIL = "nexusbussiness.admin@gmail.com";
const ADMIN_SENHA = "senha-removida-do-git";

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

async function semToast(page) {
  await page.waitForFunction(() => !document.querySelector(".toast-message, .toast"), { timeout: 12000 }).catch(() => {});
  await espera(200);
}

async function entrada(page) {
  await page.goto(BASE + "/login", { waitUntil: "networkidle0" });
  await page.waitForSelector("input[type=email]");
  await page.evaluate(() => {
    document.querySelector("input[type=email]").value = "";
    document.querySelector("input[type=password]").value = "";
  });
  await page.type("input[type=email]", ADMIN_EMAIL);
  await page.type("input[type=password]", ADMIN_SENHA);
  await Promise.all([
    page.waitForFunction(() => window.location.pathname.startsWith("/app"), { timeout: 15000 }),
    page.click("button[type=submit]"),
  ]);
  await page.waitForSelector(".admin-shell", { timeout: 15000 });
  await semToast(page);
}

async function irAte(page, rota, seletor) {
  await page.goto(BASE + rota, { waitUntil: "networkidle0" });
  await page.waitForSelector(seletor || ".admin-content", { timeout: 15000 });
  await page.waitForFunction(
    (s) => document.querySelector(s || ".row-actions") !== null,
    { timeout: 15000 },
    seletor,
  ).catch(() => {});
  await semToast(page);
}

// Le tudo da tabela de uma vez: geometria dos botoes + clipping + overflow.
function medirTabela() {
  const grupos = Array.from(document.querySelectorAll(".row-actions")).map((g) => {
    const cs = getComputedStyle(g);
    const filhos = Array.from(g.children).filter((el) => el.getBoundingClientRect().width > 0);
    const topos = filhos.map((el) => Math.round(el.getBoundingClientRect().top));
    const xs = filhos.map((el) => Math.round(el.getBoundingClientRect().x));
    const gap = cs.columnGap || cs.gap;
    const separados = xs.every((x, i) => i === 0 || x > xs[i - 1]);
    return {
      total: filhos.length,
      mesmaLinha: topos.length === 0 ? true : Math.max(...topos) - Math.min(...topos) <= 2,
      empilhados: topos.length - new Set(topos).size,
      direcao: cs.flexDirection,
      quebra: cs.flexWrap,
      gap,
      separados,
      larguraConteudo: Math.round(g.scrollWidth),
    };
  });
  const th = document.querySelector("th.col-acoes");
  const wraps = Array.from(document.querySelectorAll(".card-surface.table-wrap")).map((w) => {
    const cs = getComputedStyle(w);
    return {
      corte: w.scrollWidth - w.clientWidth,
      overflowX: cs.overflowX,
      visivel: cs.overflowX === "auto" || cs.overflowX === "scroll" || w.scrollWidth <= w.clientWidth + 1,
    };
  });
  return {
    grupos,
    temTh: Boolean(th),
    larguraTh: th ? Math.round(th.getBoundingClientRect().width) : -1,
    wraps,
    overflowJanela: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  };
}

// Abre o dialogo de confirmacao clicando no botao cujo rotulo bate com o regex.
async function abrirDialogo(page, regex) {
  const achado = await page.evaluate((src) => {
    const re = new RegExp(src);
    const bs = Array.from(document.querySelectorAll(".row-actions button"));
    const i = bs.findIndex((b) => re.test((b.textContent || "").trim()));
    if (i < 0) return -1;
    bs[i].click();
    return (bs[i].textContent || "").trim();
  }, regex.source);
  if (achado < 0) return null;
  await page.waitForSelector(".nx-modal-overlay .nx-confirm-texto", { timeout: 6000 }).catch(() => {});
  return achado;
}

function lerDialogo() {
  const overlay = document.querySelector(".nx-modal-overlay");
  if (!overlay) return null;
  const panel = overlay.querySelector(".nx-modal");
  const cs = getComputedStyle(overlay);
  const nome = panel.querySelector(".nx-confirm-nome");
  const detalhe = panel.querySelector(".nx-confirm-detalhe");
  const confirmar = panel.querySelector(".nx-modal-actions .btn:last-child");
  const voltar = panel.querySelector(".nx-modal-actions .btn:first-child");
  const sidebar = document.querySelector(".admin-sidebar");
  return {
    noBody: overlay.parentElement === document.body,
    zOverlay: Number(cs.zIndex),
    blur: cs.backdropFilter || cs.webkitBackdropFilter || "",
    fundo: cs.backgroundColor,
    classePanel: panel.className,
    ariaModal: panel.getAttribute("aria-modal"),
    titulo: (panel.querySelector(".nx-modal-title") || {}).textContent || "",
    texto: (nome ? nome.closest(".nx-confirm-texto").textContent : "") || "",
    nome: nome ? nome.textContent.trim() : "",
    pesoNome: nome ? getComputedStyle(nome).fontWeight : "",
    detalhe: detalhe ? detalhe.textContent.trim() : "",
    labelConfirmar: confirmar ? confirmar.textContent.trim() : "",
    classeConfirmar: confirmar ? confirmar.className : "",
    corConfirmar: confirmar ? getComputedStyle(confirmar).backgroundColor : "",
    corTextoConfirmar: confirmar ? getComputedStyle(confirmar).color : "",
    labelVoltar: voltar ? voltar.textContent.trim() : "",
    focado: (document.activeElement || {}).textContent || "",
    larguraSidebar: sidebar ? Math.round(sidebar.getBoundingClientRect().width) : -1,
    xConteudo: Math.round((document.querySelector(".admin-content") || { getBoundingClientRect: () => ({ x: -1 }) }).getBoundingClientRect().x),
  };
}

async function fecharDialogo(page) {
  await page.evaluate(() => {
    const b = document.querySelector(".nx-modal-actions .btn:first-child");
    if (b) b.click();
  });
  await page.waitForFunction(() => !document.querySelector(".nx-modal-overlay"), { timeout: 6000 }).catch(() => {});
  await semToast(page);
}

// Login normal de Node, fora do navegador: o token da pagina fica so na memoria
// do React e nao ha como reusa-lo aqui.
async function tokenAdministrador() {
  const r = await fetch(API + "/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_SENHA }),
  });
  if (!r.ok) throw new Error("login do administrador: HTTP " + r.status);
  return (await r.json()).accessToken;
}

async function reativarCliente(token, id) {
  const r = await fetch(API + "/api/clients/" + id, {
    method: "PATCH",
    headers: { authorization: "Bearer " + token, "content-type": "application/json" },
    body: JSON.stringify({ active: true }),
  });
  if (!r.ok) return { status: r.status, active: null };
  return { status: r.status, active: (await r.json()).active };
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

  const pedidos = [];
  page.on("request", (r) => {
    const m = r.method();
    if ((m === "DELETE" || m === "PATCH") && r.url().includes("/api/")) pedidos.push(m + " " + r.url());
  });

  console.log("== 1) Coluna de acoes na mesma linha (desktop 1440) ==");
  const tabelas = [
    ["/app/clientes?aba=todos", "clientes"],
    ["/app/produtos?aba=catalogo", "produtos"],
    ["/app/vendas?aba=pedidos", "vendas"],
    ["/app/compras?aba=pedidos", "compras"],
    ["/app/compras?aba=fornecedores", "fornecedores"],
    ["/app/financeiro?aba=contas", "financeiro"],
    ["/app/crm?aba=leads", "crm"],
    ["/app/usuarios?aba=sessoes", "usuarios/sessoes"],
  ];
  await entrada(page);
  for (const [rota, nome] of tabelas) {
    await irAte(page, rota);
    const t = await page.evaluate(medirTabela);
    ok(nome + ": existe coluna de acoes", t.grupos.length > 0, t.grupos.length + " celulas");
    const empilhados = t.grupos.filter((g) => !g.mesmaLinha);
    ok(nome + ": botoes lado a lado, sem empilhar", empilhados.length === 0, empilhados.length + " celulas quebradas");
    ok(
      nome + ": container em linha, sem quebra e com espaco entre botoes",
      t.grupos.every((g) => g.direcao === "row" && g.quebra === "nowrap" && parseFloat(g.gap) >= 0.4 * 16 - 0.6 && g.separados),
      t.grupos[0] && t.grupos[0].direcao + "/" + t.grupos[0].quebra + "/" + t.grupos[0].gap,
    );
    if (t.temTh) ok(nome + ": coluna Acoes com largura minima (>= 176px)", t.larguraTh >= 176, t.larguraTh + "px");
    else console.log("  [—] " + nome + ": sem <th class=col-acoes> (lista, nao tabela)");
    ok(nome + ": tabela nao cortada nem estourando a janela", t.wraps.every((w) => w.visivel) && t.overflowJanela <= 0,
      "overflow " + t.overflowJanela + " | cortes " + t.wraps.map((w) => w.corte + "/" + w.overflowX).join(","));
  }

  console.log("== 2) Mesma leitura em telas menores ==");
  for (const largura of [1100, 1024, 900, 820, 640, 390]) {
    await page.setViewport({ width: largura, height: 900 });
    await irAte(page, "/app/clientes?aba=todos");
    const t = await page.evaluate(medirTabela);
    const ruim = t.grupos.filter((g) => !g.mesmaLinha).length;
    ok(largura + "px: Clientes continua com botoes na mesma linha", ruim === 0, ruim + " quebradas");
    ok(largura + "px: sem overflow horizontal da pagina", t.overflowJanela <= 0, "overflow " + t.overflowJanela);
  }
  await page.setViewport({ width: 1440, height: 900 });

  console.log("== 3) Dialogo de risco (Clientes: Desativar) ==");
  await irAte(page, "/app/clientes?aba=todos");
  const nomeCliente = await page.evaluate(() => {
    const td = document.querySelector(".table tbody tr td");
    return td ? td.textContent.trim() : "";
  });
  const rotulo = await abrirDialogo(page, /^Desativar$/);
  ok("botao Desativar encontrado", rotulo === "Desativar", String(rotulo));
  let d = await page.evaluate(lerDialogo);
  ok("dialogo e o modal do sistema (.nx-modal)", Boolean(d) && /nx-modal/.test(d.classePanel), d && d.classePanel);
  ok("montado em Portal no fim do body", Boolean(d) && d.noBody === true, d && String(d.noBody));
  ok("scrim com blur padrao da casa", Boolean(d) && /blur\(/.test(d.blur), d && d.blur);
  ok("acima da barra lateral (z-index >= 80)", Boolean(d) && d.zOverlay >= 80, d && "z " + d.zOverlay);
  ok("titulo contextual: Desativar cliente", Boolean(d) && d.titulo === "Desativar cliente", d && d.titulo);
  ok("mensagem cita o cliente em destaque", Boolean(d) && d.nome.length > 0 && d.texto.includes(d.nome), d && d.nome);
  ok("nome sai em negrito", Boolean(d) && Number(d.pesoNome) >= 700, d && d.pesoNome);
  ok("tem o paragrafo de consequencia", Boolean(d) && d.detalhe.length > 25, d && d.detalhe.slice(0, 60));
  ok("botao de risco e vermelho com texto branco", Boolean(d) && /btn-risk/.test(d.classeConfirmar) && d.corTextoConfirmar === "rgb(255, 255, 255)", d && d.corConfirmar + " | " + d.corTextoConfirmar);
  ok("rotulo do botao de acao e Desativar", Boolean(d) && d.labelConfirmar === "Desativar", d && d.labelConfirmar);
  ok("botao secundario discreto se chama Voltar", Boolean(d) && d.labelVoltar === "Voltar", d && d.labelVoltar);
  ok("com risco, o foco inicial cai no Voltar (nunca na acao)", Boolean(d) && d.focado.trim() === "Voltar", d && d.focado.trim());
  await page.screenshot({ path: SHOTS + "/17-confirm-cliente-dark.png" });

  console.log("== 4) Sidebar congelada durante o dialogo ==");
  await fecharDialogo(page);
  await page.click(".admin-toggle");
  await espera(400);
  const rail = await page.evaluate(() => Math.round(document.querySelector(".admin-sidebar").getBoundingClientRect().width));
  ok("barra reduzida para a trilha antes do teste", rail >= 70 && rail <= 82, rail + "px");
  await page.hover(".admin-sidebar");
  await espera(350);
  const peekAberto = await page.evaluate(() => Math.round(document.querySelector(".admin-sidebar").getBoundingClientRect().width));
  ok("hover revela a barra (peek)", peekAberto > 200, peekAberto + "px");
  await abrirDialogo(page, /^Desativar$/);
  const xConteudoComDialogo = (await page.evaluate(lerDialogo)).xConteudo;
  await page.mouse.move(1100, 620);
  await espera(500);
  const larguraDurante = await page.evaluate(() => Math.round(document.querySelector(".admin-sidebar").getBoundingClientRect().width));
  ok("com o dialogo aberto a barra nao se recolhe", larguraDurante === peekAberto, larguraDurante + "px vs " + peekAberto + "px");
  const xConteudoAgora = await page.evaluate(() => Math.round(document.querySelector(".admin-content").getBoundingClientRect().x));
  ok("o conteudo nao se moveu (sem tremor de layout)", xConteudoAgora === xConteudoComDialogo, xConteudoAgora + " vs " + xConteudoComDialogo);
  await fecharDialogo(page);
  await espera(400);
  const larguraDepois = await page.evaluate(() => Math.round(document.querySelector(".admin-sidebar").getBoundingClientRect().width));
  ok("fechado o dialogo a barra volta sozinha para a trilha", larguraDepois === rail, larguraDepois + "px");

  console.log("== 5) Spinner e trava de duplo clique durante a API ==");
  const cliente = nomeCliente;
  await irAte(page, "/app/clientes?aba=todos");
  const cdp = await page.createCDPSession();
  await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 700, downloadThroughput: -1, uploadThroughput: -1 });
  const antes = pedidos.length;
  await abrirDialogo(page, /^Desativar$/);
  // O triplo clique e no botao de confirmar do PROPRIO dialogo: e ali que o
  // clique duplo acidental acontece na vida real, com a pessoa impaciente.
  const alvo = await page.evaluate(() => {
    const b = document.querySelector(".nx-modal-actions .btn:last-child");
    if (!b) return null;
    const rotulo = b.textContent.trim();
    b.click();
    b.click();
    b.click();
    return rotulo;
  });
  ok("dialogo de " + cliente + " aberto com botao Desativar", alvo === "Desativar", String(alvo));
  let travado = null;
  try {
    await page.waitForSelector(".nx-modal.is-confirming", { timeout: 4000 });
    travado = await page.evaluate(() => {
      const b = document.querySelector(".nx-modal-actions .btn:last-child");
      const acoes = document.querySelector(".nx-modal-actions");
      const panel = document.querySelector(".nx-modal");
      return {
        disabled: b.disabled,
        ariaBusy: b.getAttribute("aria-busy"),
        spinner: Boolean(b.querySelector(".nx-confirm-spin")),
        texto: b.textContent.trim(),
        pointer: getComputedStyle(acoes).pointerEvents,
        rotuloCarregando: /…$/.test(b.textContent.trim()),
        classePanel: panel.className,
      };
    });
  } catch {
    travado = null;
  }
  ok("enquanto a API dura o painel entra em is-confirming", Boolean(travado) && /is-confirming/.test(travado.classePanel), travado && travado.classePanel);
  ok("botao fica desabilitado com aria-busy", Boolean(travado) && travado.disabled === true && travado.ariaBusy === "true", travado && String(travado.disabled) + "/" + travado.ariaBusy);
  ok("spinner aparece dentro do botao", Boolean(travado) && travado.spinner === true, travado && String(travado.spinner));
  ok("rotulo vira Desativar… para nao parecer travado", Boolean(travado) && travado.rotuloCarregando === true, travado && travado.texto);
  ok("actions ficam com pointer-events: none", Boolean(travado) && travado.pointer === "none", travado && travado.pointer);
  const triplo = pedidos.slice(antes);
  ok("triplo clique resultou em uma unica requisicao", triplo.length === 1, triplo.length + " requisicoes: " + triplo.join(" | "));
  // O id sai da propria requisicao que a tela mandou: nada de id chumbado aqui.
  const desativados = triplo
    .map((p) => {
      const m = /\/api\/clients\/([0-9a-f-]{8,})/i.exec(p);
      return m ? m[1] : null;
    })
    .filter(Boolean);
  await page.waitForFunction(() => !document.querySelector(".nx-modal-overlay"), { timeout: 15000 }).catch(() => {});
  await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
  await semToast(page);

  console.log("== 6) Reativar / nao destrutivo usa o dourado da marca ==");
  await irAte(page, "/app/financeiro?aba=contas");
  const marca = await abrirDialogo(page, /^(Pagar|Reabrir)$/);
  d = await page.evaluate(lerDialogo);
  ok("dialogo do financeiro aberto", Boolean(d) && d.labelConfirmar === marca, d && d.labelConfirmar + " vs " + marca);
  ok("acao de baixa/reabertura usa btn-brand (dourado)", Boolean(d) && /btn-brand/.test(d.classeConfirmar), d && d.classeConfirmar);
  ok("sem risco, o foco inicial vai no botao de acao", Boolean(d) && d.focado.trim() === marca, d && d.focado.trim());
  await page.screenshot({ path: SHOTS + "/17-confirm-financeiro-dark.png" });
  await fecharDialogo(page);

  console.log("== 7) Esc nao fecha durante a acao e fecha sem ela ==");
  await irAte(page, "/app/produtos?aba=catalogo");
  await abrirDialogo(page, /^Inativar$/);
  d = await page.evaluate(lerDialogo);
  ok("Produtos: titulo Inativar produto", Boolean(d) && d.titulo === "Inativar produto", d && d.titulo);
  ok("Produtos: botao Inativar e de risco", Boolean(d) && /btn-risk/.test(d.classeConfirmar) && d.labelConfirmar === "Inativar", d && d.labelConfirmar);
  await page.keyboard.press("Escape");
  await espera(300);
  const sumiu = await page.evaluate(() => !document.querySelector(".nx-modal-overlay"));
  ok("Esc fecha o dialogo sem executar nada", sumiu === true, String(sumiu));
  const semReq = pedidos.length;
  await espera(400);
  ok("nenhuma requisicao de exclusao foi enviada", pedidos.length === semReq, pedidos.length + " total");

  console.log("== 8) Tema claro mantem a leitura ==");
  await irAte(page, "/app/clientes?aba=todos");
  await page.evaluate(() => document.querySelector(".theme-switch").click());
  await espera(400);
  await abrirDialogo(page, /^Desativar$/);
  d = await page.evaluate(lerDialogo);
  const lumin = await page.evaluate(() => {
    const p = document.querySelector(".nx-modal");
    const cor = getComputedStyle(p).backgroundColor;
    const n = cor.match(/[\d.]+/g).map(Number);
    return (n[0] + n[1] + n[2]) / 3;
  });
  ok("tema claro: card clareou junto do tema", lumin > 200, "luminancia " + Math.round(lumin));
  ok("tema claro: botao de risco continua vermelho", Boolean(d) && /btn-risk/.test(d.classeConfirmar), d && d.corConfirmar);
  await page.screenshot({ path: SHOTS + "/17-confirm-cliente-claro.png" });
  await fecharDialogo(page);
  await page.evaluate(() => document.querySelector(".theme-switch").click());
  await espera(300);

  console.log("== 9) Dialogo no celular (pila vertical, sem overflow) ==");
  await page.setViewport({ width: 390, height: 844 });
  await irAte(page, "/app/clientes?aba=todos");
  await page.evaluate(() => {
    const b = Array.from(document.querySelectorAll(".row-actions button")).find((x) => /Desativar/.test(x.textContent));
    if (b) b.click();
  });
  await page.waitForSelector(".nx-modal-overlay .nx-confirm-texto", { timeout: 6000 }).catch(() => {});
  const mobile = await page.evaluate(() => {
    const o = document.querySelector(".nx-modal-overlay");
    if (!o) return null;
    const p = o.querySelector(".nx-modal");
    const r = p.getBoundingClientRect();
    return {
      dentro: r.left >= -1 && r.right <= window.innerWidth + 1,
      altura: Math.round(r.height),
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      z: getComputedStyle(o).zIndex,
    };
  });
  ok("celular: dialogo cabe na tela", Boolean(mobile) && mobile.dentro === true, mobile && JSON.stringify(mobile));
  ok("celular: nenhum vazamento horizontal", Boolean(mobile) && mobile.overflow <= 0, mobile && "overflow " + mobile.overflow);
  if (mobile) await page.screenshot({ path: SHOTS + "/17-confirm-cliente-celular.png" });
  await fecharDialogo(page);
  await page.setViewport({ width: 1440, height: 900 });

  console.log("== 10) Devolver os dados de demonstracao ==");
  let tokenAdmin = "";
  if (desativados.length > 0) {
    try {
      tokenAdmin = await tokenAdministrador();
    } catch (err) {
      ok("login do administrador para restaurar", false, err.message);
    }
  }
  for (const id of desativados) {
    const r = tokenAdmin ? await reativarCliente(tokenAdmin, id) : { status: 0, active: null };
    ok("cliente " + id.slice(0, 8) + " volta a ativo depois da prova", r.active === true, "HTTP " + r.status);
  }
  if (desativados.length === 0) ok("nada a restaurar (a prova nao desativou cliente)", true, "0 ids");

  console.log("");
  console.log("checagens: " + checks);
  console.log("erros de console: " + (erros.length === 0 ? "nenhum" : erros.slice(0, 5).join(" | ")));
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
