// Prova de uso real do modulo CRM: cadastra lead pelo modal, filtra por estagio,
// move pelo funil, fecha negocio (virando cliente) e confere o celular.
const puppeteer = require("puppeteer-core");
const { SENHA_ADMIN } = require("./senha-admin.cjs");
const path = require("path");

const BASE = "http://localhost:5173";
const OUT = path.join(__dirname, "..", "docs", "screenshots");
const sufixo = Date.now().toString().slice(-6);
const NOME = "Buffet Aurora " + sufixo;

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
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// As notificacoes cobrem o cabecalho na foto: espera sumirem.
async function semToast(page) {
  await page.waitForFunction(() => !document.querySelector(".toast-message, .toast"), { timeout: 12000 }).catch(() => {});
  await sleep(250);
}

// React so percebe mudanca de value feita pelo setter nativo do campo.
async function setReactValue(page, seletor, valor) {
  await page.evaluate((sel, v) => {
    const el = document.querySelector(sel);
    const proto = el.tagName === "SELECT" ? window.HTMLSelectElement.prototype
      : el.tagName === "TEXTAREA" ? window.HTMLTextAreaElement.prototype
      : window.HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, "value").set.call(el, v);
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }, seletor, valor);
}

// "R$ 4.500,00" -> 4500: le o que esta na tela, nao o banco.
const parseBrl = (t) => Number(String(t).replace(/[^\d.,-]/g, "").replace(/\./g, "").replace(",", ".")) || 0;

const texto = (page, sel) => page.$eval(sel, (el) => el.textContent.replace(/\s+/g, " ").trim()).catch(() => null);

async function toast(page, esperado) {
  return page.waitForFunction((t) => {
    const n = document.querySelector(".toast-message");
    return Boolean(n) && n.textContent.includes(t);
  }, { timeout: 6000 }, esperado).then(() => true).catch(() => false);
}

// Estado do funil lido direto da tela: rotulo -> {count, valor}.
const funil = (page) => page.$$eval(".pipeline-card", (els) => els.map((el) => ({
  rotulo: el.querySelector(".pipeline-label").textContent.trim(),
  count: Number(el.querySelector(".pipeline-count").textContent.trim()),
  valor: el.querySelector(".pipeline-value").textContent.trim(),
  ativo: el.classList.contains("is-active"),
})));

const estagioDaLinha = (page, nome) => page.$$eval(".table tbody tr", (rows, n) => {
  const r = rows.find((x) => x.textContent.includes(n));
  if (!r) return null;
  const pill = r.querySelector(".status-pill");
  return { pill: pill ? pill.textContent.trim() : null, texto: r.textContent.replace(/\s+/g, " ").trim() };
}, nome);

(async () => {
  const browser = await puppeteer.launch({
    executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
    headless: "new",
    args: ["--no-sandbox", "--disable-gpu"],
    defaultViewport: { width: 1440, height: 900 },
  });
  const page = await browser.newPage();
  const erros = [];
  page.on("pageerror", (e) => erros.push(String(e.message)));
  page.on("console", (m) => { if (m.type() === "error") erros.push(m.text()); });

  console.log("== Entrada e estrutura ==");
  await page.goto(BASE + "/login", { waitUntil: "networkidle0" });
  await page.waitForSelector("input[type=email]");
  await page.type("input[type=email]", "nexusbussiness.admin@gmail.com", { delay: 3 });
  await page.type("input[type=password]", SENHA_ADMIN, { delay: 3 });
  await Promise.all([
    page.waitForFunction(() => location.pathname.startsWith("/app"), { timeout: 15000 }),
    page.click(".neu-btn"),
  ]);
  await sleep(600);

  const navCRM = await page.$('.admin-nav-item[aria-label="CRM"]');
  ok("menu lateral traz o item CRM", Boolean(navCRM));
  await page.click('.admin-nav-item[aria-label="CRM"]');
  await page.waitForFunction(() => location.pathname === "/app/crm", { timeout: 10000 });
  await page.waitForSelector(".pipeline-card", { timeout: 10000 });
  await sleep(700);
  ok("titulo da pagina", (await texto(page, ".page-title")) === "CRM", await texto(page, ".page-title"));

  const f0 = await funil(page);
  ok("funil com cinco estagios", f0.length === 5, f0.map((x) => x.rotulo).join(", "));
  ok("estagios na ordem do funil", f0.map((x) => x.rotulo).join("|") === "Novo|Contatado|Proposta|Ganho|Perdido");
  ok("cada estagio mostra contagem e valor", f0.every((x) => Number.isFinite(x.count) && /R\$\s[\d.]+,\d{2}/.test(x.valor)), f0[0].valor);
  const kpis = await page.$$eval(".kpi", (els) => els.map((el) => el.textContent.replace(/\s+/g, " ").trim()));
  ok("quatro KPIs do funil", kpis.length === 4, kpis.length + " cards");
  ok("KPI de valor em aberto formatado em real", /R\$\s[\d.]+,\d{2}/.test(kpis[0]), kpis[0]);
  ok("KPI de conversao em percentual", /\d+%/.test(kpis[3]), kpis[3]);

  console.log("== Cadastro de lead pelo modal ==");
  const antes = await funil(page);
  const novoAntes = antes.find((x) => x.rotulo === "Novo").count;
  await page.evaluate(() => document.querySelector(".page-head .btn-brand").click());
  await page.waitForSelector(".nx-modal", { timeout: 5000 });
  ok("modal de novo lead abre", (await texto(page, ".nx-modal-title")) === "Novo lead", await texto(page, ".nx-modal-title"));
  ok("dialogo acessivel", await page.$eval(".nx-modal", (el) => el.getAttribute("role") === "dialog" && el.getAttribute("aria-modal") === "true"));
  ok("dica de obrigatoriedade no rodape", (await texto(page, ".nx-modal-hint")) === "Os campos marcados com * são obrigatórios.", await texto(page, ".nx-modal-hint"));
  ok("botao cadastrar em vez de salvar generico", (await texto(page, ".nx-modal-foot .btn-brand")) === "Cadastrar", await texto(page, ".nx-modal-foot .btn-brand"));
  ok("foco cai no primeiro campo", await page.evaluate(() => document.activeElement && document.activeElement.id === "lead-name"));

  await page.type("#lead-name", NOME, { delay: 4 });
  await page.type("#lead-email", "contato" + sufixo + "@buffetaurora.com.br", { delay: 2 });
  await page.type("#lead-phone", "11 98888-7777", { delay: 2 });
  await setReactValue(page, "#lead-source", "Instagram");
  await page.type("#lead-value", "4500", { delay: 4 });
  await page.type("#lead-notes", "Pediu orcamento de festa de fim de ano.", { delay: 2 });
  await sleep(250);
  await page.screenshot({ path: path.join(OUT, "14-crm-novo-lead.png") });
  await page.evaluate(() => document.querySelector(".nx-modal-foot .btn-brand").click());
  ok("confirmacao de cadastro", await toast(page, "Lead cadastrado."));
  await sleep(900);

  const linha = await estagioDaLinha(page, NOME);
  ok("lead aparece na tabela", Boolean(linha), linha ? "ok" : "ausente");
  ok("estagio inicial e Novo", linha && linha.pill === "Novo", linha && linha.pill);
  const depois = await funil(page);
  const novoDepois = depois.find((x) => x.rotulo === "Novo").count;
  ok("funil atualiza a contagem", novoDepois === novoAntes + 1, novoAntes + " -> " + novoDepois);
  const somaAntes = parseBrl(antes.find((x) => x.rotulo === "Novo").valor);
  const somaDepois = parseBrl(depois.find((x) => x.rotulo === "Novo").valor);
  ok("funil soma o valor estimado", Math.abs(somaDepois - somaAntes - 4500) < 0.01, somaAntes + " -> " + somaDepois);
  ok("KPI de aberto acompanha o funil", /R\$\s/.test((await texto(page, ".kpi-value")) || ""), await texto(page, ".kpi-value"));
  const hintAberto = await texto(page, ".kpi-hint");
  ok("KPI concorda em numero no portugues", hintAberto.startsWith(novoDepois + " lead" + (novoDepois === 1 ? "" : "s") + " aguardando"), hintAberto);

  console.log("== Filtros do funil ==");
  await page.evaluate(() => {
    const card = [...document.querySelectorAll(".pipeline-card")].find((c) => c.textContent.includes("Novo"));
    card.click();
  });
  await sleep(900);
  const filtrado = await funil(page);
  ok("clique no estagio ativa o filtro", filtrado.find((x) => x.rotulo === "Novo").ativo && !filtrado.find((x) => x.rotulo === "Ganho").ativo);
  ok("select da barra reflete o filtro", (await page.$eval(".toolbar select", (el) => el.value)) === "NEW", await page.$eval(".toolbar select", (el) => el.value));
  const pilulas = await page.$$eval(".table tbody .status-pill", (els) => els.map((e) => e.textContent.trim()));
  ok("tabela mostra apenas o estagio filtrado", pilulas.length > 0 && pilulas.every((p) => p === "Novo"), pilulas.join(", "));
  ok("botao limpar filtro aparece", Boolean(await page.$(".toolbar .btn-ghost")));

  await page.evaluate(() => {
    const b = [...document.querySelectorAll(".toolbar .btn-ghost")].find((x) => x.textContent.trim() === "Limpar filtro");
    b.click();
  });
  await sleep(900);
  ok("limpar filtro volta a mostrar tudo", (await funil(page)).every((x) => !x.ativo));

  await setReactValue(page, '.toolbar input[type="search"]', NOME);
  await sleep(1100);
  const soUm = await page.$$eval(".table tbody tr", (els) => els.length);
  ok("busca por nome filtra o lead", soUm === 1, soUm + " linha(s)");
  await setReactValue(page, '.toolbar input[type="search"]', "");
  await sleep(1100);

  console.log("== Movimentacao do funil ==");
  async function mover(novo) {
    await page.evaluate((nome, val) => {
      const r = [...document.querySelectorAll(".table tbody tr")].find((x) => x.textContent.includes(nome));
      const sel = r.querySelector("select");
      Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, "value").set.call(sel, val);
      sel.dispatchEvent(new Event("change", { bubbles: true }));
    }, NOME, novo);
    await sleep(500);
    // O SweetAlert2 deixa o poio no DOM: so clica se o dialogo estiver visivel.
    const visivel = await page.evaluate(() => {
      const b = document.querySelector(".swal2-confirm");
      return Boolean(b) && b.offsetParent !== null;
    });
    if (visivel) await page.click(".swal2-confirm");
    await sleep(1200);
  }

  await setReactValue(page, '.toolbar input[type="search"]', NOME);
  await sleep(1100);
  await mover("CONTACTED");
  ok("mover pelo seletor da linha funciona", (await estagioDaLinha(page, NOME)).pill === "Contatado", (await estagioDaLinha(page, NOME)).pill);
  ok("aviso de estagio novo", await toast(page, "Lead movido para contatado."));

  await page.evaluate(() => {
    const r = [...document.querySelectorAll(".table tbody tr")].find((x) => x.textContent.includes("Buffet Aurora"));
    r.querySelector(".lead-link").click();
  });
  await page.waitForFunction(() => document.querySelector(".nx-modal .kv"), { timeout: 5000 });
  const detalhe = await texto(page, ".nx-modal .kv");
  ok("modal de detalhe mostra o contato", detalhe.includes("contato" + sufixo + "@buffetaurora.com.br"), detalhe.slice(0, 60) + "…");
  ok("detalhe mostra valor e responsavel", /4\.500,00/.test(detalhe) && /Administrador/.test(detalhe));
  ok("detalhe oferece os cinco estagios", (await page.$$eval(".pipeline-move .btn", (els) => els.length)) === 5);
  await page.screenshot({ path: path.join(OUT, "14-crm-detalhe.png") });

  await page.evaluate(() => {
    const b = [...document.querySelectorAll(".pipeline-move .btn")].find((x) => x.textContent.trim() === "Proposta");
    b.click();
  });
  await sleep(1300);
  ok("mover pelo detalhe atualiza o proprio modal", (await texto(page, ".nx-modal-sub")).includes("Proposta"), await texto(page, ".nx-modal-sub"));

  const ganhosAntes = await page.$$eval(".kpi-value", (els) => Number(els[1].textContent.trim()));
  await page.evaluate(() => {
    const b = [...document.querySelectorAll(".nx-modal-foot .btn")].find((x) => x.textContent.trim() === "Ganhou o negócio");
    b.click();
  });
  await page.waitForSelector(".swal2-confirm", { timeout: 5000 });
  const alerta = await texto(page, ".swal2-html-container");
  ok("fechamento pede confirmacao e avisa da conversao", alerta.includes("vira cliente"), alerta);
  await page.click(".swal2-confirm");
  ok("confirmacao de ganho", await toast(page, "Lead movido para ganho."));
  await sleep(1200);
  const ganhosDepois = await page.$$eval(".kpi-value", (els) => Number(els[1].textContent.trim()));
  ok("KPI de ganhos sobe com o negocio fechado", ganhosDepois === ganhosAntes + 1, ganhosAntes + " -> " + ganhosDepois);
  ok("conversao recalculada", /%/.test(await texto(page, ".kpi:nth-child(4) .kpi-value")), await texto(page, ".kpi:nth-child(4) .kpi-value"));

  console.log("== Conversao em cliente ==");
  await page.goto(BASE + "/app/clientes", { waitUntil: "networkidle0" });
  await page.waitForSelector(".page-head");
  await setReactValue(page, '.toolbar input[type="search"]', NOME);
  await sleep(1200);
  const clientes = await page.$$eval(".table tbody tr", (els) => els.map((e) => e.textContent.replace(/\s+/g, " ").trim()));
  ok("lead ganho virou cliente", clientes.length === 1 && clientes[0].includes(NOME), clientes.join(" | "));

  console.log("== Perda e reabertura ==");
  await page.goto(BASE + "/app/crm", { waitUntil: "networkidle0" });
  await page.waitForSelector(".pipeline-card");
  await setReactValue(page, '.toolbar input[type="search"]', NOME);
  await sleep(1200);
  await mover("LOST");
  ok("marcar como perdido pede confirmacao de risco", (await estagioDaLinha(page, NOME)).pill === "Perdido", (await estagioDaLinha(page, NOME)).pill);
  const funilFinal = await funil(page);
  ok("funil reflete a perda", funilFinal.find((x) => x.rotulo === "Perdido").count >= 1);
  await mover("NEW");
  ok("lead pode voltar ao topo do funil", (await estagioDaLinha(page, NOME)).pill === "Novo", (await estagioDaLinha(page, NOME)).pill);
  await setReactValue(page, '.toolbar input[type="search"]', "");
  await sleep(1200);
  await semToast(page);
  await page.screenshot({ path: path.join(OUT, "14-crm.png") });

  console.log("== Celular 390px ==");
  await page.setViewport({ width: 390, height: 844 });
  await page.reload({ waitUntil: "networkidle0" });
  await page.waitForSelector(".pipeline-card", { timeout: 10000 });
  await sleep(800);
  const mobile = await page.evaluate(() => {
    const cards = [...document.querySelectorAll(".pipeline-card")];
    return {
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      empilhados: new Set(cards.map((c) => Math.round(c.getBoundingClientRect().top))).size,
      tabelaComScroll: Boolean(document.querySelector(".table-wrap")),
    };
  });
  ok("sem overflow horizontal no celular", mobile.overflow <= 0, "overflow " + mobile.overflow);
  ok("funil empilha em uma coluna", mobile.empilhados === 5, mobile.empilhados + " posicoes");
  await page.screenshot({ path: path.join(OUT, "14-crm-celular.png") });

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
