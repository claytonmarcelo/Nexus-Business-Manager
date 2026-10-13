// Prova do navegador para a F3.2 Parte 1: a casa das Ordens de Serviço.
//
// Quem entra é a conta fictícia de captura (tools/conta-de-captura.cjs), na
// empresa que ela mesma criou. A prova escreve no banco de propósito: cuida dos
// clientes e das peças que o fluxo consome, abre ordens pela API e pela tela, e
// percorre os movimentos reais do módulo. Por isso as capturas podem ficar no
// repositório — não há dado real nelas.
//
// O que se prova aqui, e que o jsdom não pode provar:
//  1. a tela existe no menu de uma sessão de verdade e os oito indicadores são os
//     números do GET /service-orders/summary, conferidos lado a lado com a API;
//  2. concluir baixa o estoque e cancelar uma concluída devolve — medidos no
//     cadastro da peça antes e depois, não no que a interface anuncia;
//  3. nenhum código interno (IN_PROGRESS, URGENT), nenhum identificador de
//     empresa e nenhuma caixa nativa de confirmação aparecem no navegador;
//  4. o total que a tabela mostra é o centavo calculado pelo servidor;
//  5. abrir ordem pela tela manda as duas linhas e volta com o número da fila;
//  6. o atendente sem service_order:write não vê aba de criação nem botão de
//     cancelar, e a API recusa a escrita dele com o mesmo 403 que a tela esconde;
//  7. o documento da ordem sai em papel (window.print) com as linhas na ordem
//     digitada e a linha do tempo de quem mexeu.
//
// Reexecução não acumula: as ordens desta prova são identificadas pelo título e
// removidas no começo de cada corrida. O atendente de prova é apagado no fim.
const puppeteer = require("puppeteer-core");
const path = require("path");
const { sessaoDaCaptura } = require("./conta-de-captura.cjs");
const { conferirServidorDeProva, clienteDoBancoDeProva } = require("./banco-de-prova.cjs");

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const BASE = process.env.NEXUS_WEB || "http://localhost:5173";
const API = (process.env.NEXUS_API || "http://localhost:3001") + "/api";
const SHOTS = path.join(__dirname, "..", "docs", "screenshots");

// Cadastro de apoio da casa de demonstracao. Nomes de dominio .test, telefone de
// exemplo: nada aqui e dado de cliente real.
const CLIENTES = [
  { name: "Padaria Aurora", phone: "(11) 4002-8922", email: "contato@aurora.test" },
  { name: "Condominio Alvorada", phone: "(11) 3555-1200", email: "admin@alvorada.test" },
  { name: "Oficina Serra Verde", phone: "(11) 2777-4500", email: "recepcao@serraverde.test" },
];
const PECAS = [
  { name: "Correia dentada HTD 8M", salePrice: "89.90", unit: "un", saldo: 12 },
  { name: "Filtro de ar purificado", salePrice: "45.00", unit: "un", saldo: 9 },
  { name: "Kit polia tensora", salePrice: "210.00", unit: "jg", saldo: 6 },
];
// Os cinco titulos fixos sao a assinatura da prova: e por eles que a corrida
// anterior e apagada antes de comecar.
const T = {
  noForno: "Troca da correia do forno",
  arHall: "Higienizacao dos ar-condicionados",
  filtroAr: "Troca do filtro de ar",
  ruido: "Diagnostico de ruido no balcao",
  kit: "Troca do kit de tensao",
};
const TITULOS = Object.values(T);

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

let token = "";
async function chame(metodo, caminho, corpo, comToken) {
  const res = await fetch(API + caminho, {
    method: metodo,
    headers: {
      "Content-Type": "application/json",
      ...(comToken === false || !token ? {} : { Authorization: "Bearer " + token }),
    },
    body: corpo === undefined ? undefined : JSON.stringify(corpo),
  });
  const texto = await res.text();
  let dados;
  try {
    dados = JSON.parse(texto);
  } catch {
    dados = { texto };
  }
  return { status: res.status, dados, texto };
}

// Uma chamada com um token emprestado (o do atendente), sem mexer no da casa.
async function comoToken(t, metodo, caminho, corpo) {
  const res = await fetch(API + caminho, {
    method: metodo,
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + t },
    body: corpo === undefined ? undefined : JSON.stringify(corpo),
  });
  return { status: res.status, texto: await res.text() };
}

const ruidoDeRede = (t) =>
  /Failed to load resource: the server responded with a status of 4\d\d/.test(t);

async function semToast(page) {
  await page
    .waitForFunction(() => !document.querySelector(".toast-message, .toast"), { timeout: 12000 })
    .catch(() => {});
  await espera(250);
}

// As caixas nativas sao proibidas (secao 29): substitui-las por um contador e a
// unica forma de provar que nenhuma pagina do fluxo chamou alert/confirm. O print
// tambem e stubado antes do primeiro load — em headless ele travaria a prova.
function prepareJanela(page) {
  return page.evaluateOnNewDocument(() => {
    window.__nativas = [];
    window.__impressoes = 0;
    window.alert = function (m) { window.__nativas.push("alert: " + m); };
    window.confirm = function (m) { window.__nativas.push("confirm: " + m); return false; };
    window.prompt = function (m) { window.__nativas.push("prompt: " + m); return null; };
    window.print = function () { window.__impressoes += 1; };
  });
}

async function entrarNoPainel(page, email, senha) {
  await page.goto(BASE + "/login", { waitUntil: "networkidle0" });
  await page.evaluate(() => localStorage.removeItem("nexus.remember.email"));
  await page.reload({ waitUntil: "networkidle0" });
  await page.waitForSelector("input[type=email]");
  await page.type("input[type=email]", email, { delay: 2 });
  await page.type("input[type=password]", senha, { delay: 2 });
  await Promise.all([
    page.waitForFunction(() => window.location.pathname.startsWith("/app"), { timeout: 15000 }),
    page.click("button[type=submit]"),
  ]);
  await semToast(page);
}

// O caminho é percorrido pelo link do menu, com o mesmo href que a pessoa vê.
async function vaPara(page, caminho) {
  await Promise.all([
    page.waitForFunction((c) => window.location.pathname === c, { timeout: 15000 }, caminho),
    page.evaluate((c) => {
      const link = [...document.querySelectorAll(".admin-nav-item")]
        .find((a) => a.getAttribute("href") === c);
      if (link) link.click();
      else window.location.assign(c);
    }, caminho),
  ]);
  await semToast(page);
}

async function espereTexto(page, trecho, timeout = 12000) {
  const viu = await page
    .waitForFunction((t) => document.body.innerText.includes(t), { timeout }, trecho)
    .then(() => true)
    .catch(() => false);
  ok("a tela mostra \"" + trecho + "\"", viu);
  return viu;
}

async function cliqueEm(page, seletor, nome) {
  const resultado = await page.evaluate((s) => {
    const alvo = document.querySelector(s);
    if (!alvo) return "ausente";
    alvo.click();
    return "clicado";
  }, seletor);
  if (nome) ok("\"" + nome + "\" clicado", resultado === "clicado", resultado);
  await espera(350);
  return resultado;
}

// Um botao pelo texto exato, dentro de um recorte do documento.
async function cliqueEmBotao(page, rotulo, escopo, nome) {
  const resultado = await page.evaluate((r, esc) => {
    const base = esc ? document.querySelector(esc) : document;
    if (!base) return "escopo ausente";
    const b = [...base.querySelectorAll("button")].find((x) => x.textContent.trim() === r);
    if (!b) return "ausente";
    b.click();
    return "clicado";
  }, rotulo, escopo || null);
  if (nome) ok("\"" + nome + "\" clicado", resultado === "clicado", resultado);
  await espera(350);
  return resultado;
}

// ---- a tabela como o balcao le ----

async function linhaDaOrdem(page, numero) {
  return page.evaluate((n) => {
    const tr = [...document.querySelectorAll(".nx-os-tabela tbody tr")]
      .find((t) => (t.querySelector("td")?.textContent || "").trim() === n);
    if (!tr) return null;
    const cel = [...tr.querySelectorAll("td")].map((t) => t.innerText.replace(/\u00a0/g, " ").trim());
    return {
      numero: cel[0], cliente: cel[1], ordem: cel[2], situacao: cel[3],
      prioridade: cel[4], responsavel: cel[5], total: cel[6],
      acoes: [...tr.querySelectorAll(".row-actions button")].map((b) => b.textContent.trim()),
    };
  }, "#" + numero);
}

async function cliqueEmAcaoDaLinha(page, numero, rotulo) {
  const resultado = await page.evaluate((n, r) => {
    const tr = [...document.querySelectorAll(".nx-os-tabela tbody tr")]
      .find((t) => (t.querySelector("td")?.textContent || "").trim() === n);
    if (!tr) return "linha ausente";
    const b = [...tr.querySelectorAll(".row-actions button")].find((x) => x.textContent.trim() === r);
    if (!b) return "botao ausente";
    b.click();
    return "clicado";
  }, "#" + numero, rotulo);
  await espera(400);
  return resultado;
}

async function situacaoNaTela(page, numero, esperado) {
  const virou = await page
    .waitForFunction((n, rotulo) => {
      const tr = [...document.querySelectorAll(".nx-os-tabela tbody tr")]
        .find((t) => (t.querySelector("td")?.textContent || "").trim() === n);
      const pill = tr && tr.querySelector(".status-pill");
      return !!pill && pill.textContent.trim() === rotulo;
    }, { timeout: 10000, polling: 150 }, "#" + numero, esperado)
    .then(() => true)
    .catch(() => false);
  ok("a linha #" + numero + " virou \"" + esperado + "\"", virou);
  return virou;
}

// ---- o dialogo de confirmacao ----
//
// Ele mora numa raiz React propria, com portal no fim do body: o commit chega um
// macrotask depois do clique, entao a espera e por texto, nao por expect sincronicos.

async function aguardeDialogo(page, titulo) {
  const abriu = await page
    .waitForFunction((t) => {
      const h = document.querySelector('[role="dialog"] .nx-modal-title');
      return !!h && h.textContent.trim() === t;
    }, { timeout: 8000, polling: 100 }, titulo)
    .then(() => true)
    .catch(() => false);
  ok("o dialogo \"" + titulo + "\" abriu", abriu);
  return abriu;
}

function textoDoDialogo(page) {
  return page.evaluate(() => {
    const d = document.querySelector('[role="dialog"]');
    return d ? d.innerText.replace(/\u00a0/g, " ") : "";
  });
}

// ---- capturas ----

async function captura(page, nome) {
  await page.screenshot({ path: path.join(SHOTS, nome + ".png") });
  console.log("  [print] docs/screenshots/" + nome + ".png");
}

// ------------------------------------------------------------------------ banco
let prisma = null;
async function abrirBanco() {
  // D6 (tarefa T1): o .env de desenvolvimento fica fora desta prova. O cliente vem de
  // banco-de-prova.cjs, que so aceita DATABASE_URL_TESTE apontando para o banco de prova.
  prisma = clienteDoBancoDeProva();
}

async function criarAtendente(companyId) {
  const bcrypt = require("bcryptjs");
  const email = "prova-ordens-" + Date.now() + "@nexus.prova";
  const senha = "ProvaOrdens2026#";
  const user = await prisma.user.create({
    data: { email, name: "Tecnico de Prova", passwordHash: await bcrypt.hash(senha, 12) },
  });
  await prisma.companyUser.create({ data: { userId: user.id, companyId, role: "STAFF" } });
  console.log("  [banco] atendente de prova criado na empresa ativa");
  return { id: user.id, email, senha };
}

async function estoqueDe(productId) {
  const r = await chame("GET", "/products/" + productId);
  return Number(r.dados.stockQuantity);
}

// -------------------------------------------------------------- cadastro de apoio
async function garantaCliente(c) {
  const lista = await chame("GET", "/clients?pageSize=100");
  const achado = (lista.dados.data || []).find((x) => x.name === c.name);
  if (achado) return achado;
  const criado = await chame("POST", "/clients", c);
  if (criado.status >= 300) {
    throw new Error("cliente de apoio nao nasceu: " + criado.status + " " + criado.texto.slice(0, 120));
  }
  return criado.dados;
}

async function garantaPeca(p) {
  const lista = await chame("GET", "/products?pageSize=100");
  let achado = (lista.dados.data || []).find((x) => x.name === p.name);
  if (!achado) {
    const criado = await chame("POST", "/products", {
      name: p.name, unit: p.unit, salePrice: p.salePrice, stockQuantity: p.saldo, trackStock: true,
    });
    if (criado.status >= 300) {
      throw new Error("peca de apoio nao nasceu: " + criado.status + " " + criado.texto.slice(0, 120));
    }
    achado = criado.dados;
  }
  // Cada corrida baixa duas correias e nao devolve: o saldo e reabastecido ate a
  // linha de partida, para a prova comecar sempre com o mesmo estoque.
  const saldo = Number(achado.stockQuantity);
  if (saldo < p.saldo) {
    await chame("POST", "/products/" + achado.id + "/movements", {
      kind: "IN", quantity: p.saldo - saldo, note: "Ajuste de inventario",
    });
    achado.stockQuantity = p.saldo;
  }
  return achado;
}

(async () => {
  // ---------- 0. sessao da conta ficticia ----------
  const cap = await sessaoDaCaptura();
  token = cap.tokens && cap.tokens.accessToken;
  if (!token) {
    console.error("nao deu para abrir a sessao ficticia");
    process.exit(1);
  }
  const eu = (await chame("GET", "/auth/me")).dados;
  const empresa = (await chame("GET", "/companies/current")).dados;
  ok("a prova roda na casa da conta de captura",
    eu && eu.email === cap.email, eu && eu.email);
  console.log("API: sessao ficticia · empresa \"" + empresa.name + "\"");

  await abrirBanco();
  const varredura = await prisma.serviceOrder.deleteMany({
    where: { companyId: empresa.id, title: { in: TITULOS } },
  });
  if (varredura.count) {
    console.log("  [banco] " + varredura.count + " ordem(oes) da corrida anterior removida(s)");
  }

  const clientes = {};
  for (const c of CLIENTES) clientes[c.name] = await garantaCliente(c);
  const pecas = {};
  for (const p of PECAS) pecas[p.name] = await garantaPeca(p);
  ok("clientes e pecas de apoio prontos",
    Object.keys(clientes).length === 3 && Object.keys(pecas).length === 3);

  // ---------- 1. o que so a porta pode barrar ----------
  console.log("\n-- guardas da porta --");
  const semItens = await chame("POST", "/service-orders", {
    clientId: clientes["Padaria Aurora"].id, title: "Ordem sem item", items: [],
  });
  ok("ordem sem item e recusada (400)", semItens.status === 400, String(semItens.status));

  const pecaSemProduto = await chame("POST", "/service-orders", {
    clientId: clientes["Padaria Aurora"].id, title: "Peca sem produto",
    items: [{ kind: "PART", quantity: 1 }],
  });
  ok("linha de peca sem produto do cadastro e recusada (400)",
    pecaSemProduto.status === 400, String(pecaSemProduto.status));

  const quantidadeZero = await chame("POST", "/service-orders", {
    clientId: clientes["Padaria Aurora"].id, title: "Quantidade zero",
    items: [{ kind: "PART", productId: pecas["Correia dentada HTD 8M"].id, quantity: 0 }],
  });
  ok("quantidade zero e recusada (400)", quantidadeZero.status === 400, String(quantidadeZero.status));

  const fantasma = await chame("GET", "/service-orders/00000000-0000-4000-8000-0000000000ff");
  ok("id de outra origem devolve 404", fantasma.status === 404, String(fantasma.status));

  // ---------- 2. ordens abertas pela API ----------
  console.log("\n-- escrita da API --");
  const correiaAntes = await estoqueDe(pecas["Correia dentada HTD 8M"].id);
  const filtroAntes = await estoqueDe(pecas["Filtro de ar purificado"].id);

  const criada = await chame("POST", "/service-orders", {
    clientId: clientes["Padaria Aurora"].id,
    title: T.noForno,
    priority: "URGENT",
    description: "O forno parou de girar no meio do expediente da manha.",
    diagnosis: "Correia com dente gasto e tensionamento frouxo.",
    items: [
      { kind: "PART", productId: pecas["Correia dentada HTD 8M"].id, quantity: 2 },
      { kind: "SERVICE", description: "Mao de obra da troca e teste", quantity: 1, unitPrice: "150.00" },
    ],
  });
  const os1 = criada.dados;
  ok("a API cria a ordem com 201 e numero da fila da empresa",
    criada.status === 201 && Number.isInteger(os1.number) && os1.number > 0,
    criada.status + " · #" + os1.number);
  ok("o total e o centavo calculado no servidor (2 x 89,90 + 150,00 = 329,80)",
    Math.round(Number(os1.total) * 100) === 32980, String(os1.total));
  ok("as linhas chegam na ordem digitada",
    os1.items[0].kind === "PART" && os1.items[1].kind === "SERVICE");
  ok("a peca entra com o preco de venda do cadastro",
    Math.round(Number(os1.items[0].unitPrice) * 100) === 8990, String(os1.items[0].unitPrice));
  const correiaAberta = await estoqueDe(pecas["Correia dentada HTD 8M"].id);
  ok("ordem aberta nao baixa estoque; a saida e na conclusao",
    correiaAberta === correiaAntes, correiaAntes + " -> " + correiaAberta);

  const os3 = (await chame("POST", "/service-orders", {
    clientId: clientes["Condominio Alvorada"].id,
    title: T.filtroAr,
    description: "O filtro do hall de entrada esta saturado.",
    items: [{ kind: "PART", productId: pecas["Filtro de ar purificado"].id, quantity: 1 }],
  })).dados;
  const inicioApi = await chame("POST", "/service-orders/" + os3.id + "/status", { status: "IN_PROGRESS" });
  ok("aberta nao conclui de uma vez: a porta pede o andamento antes",
    inicioApi.status === 200, String(inicioApi.status));
  const concluiApi = await chame("POST", "/service-orders/" + os3.id + "/status", {
    status: "COMPLETED", note: "Peca aplicada na manutencao do hall",
  });
  ok("a API conclui uma ordem", concluiApi.status === 200, String(concluiApi.status));
  const filtroConcluida = await estoqueDe(pecas["Filtro de ar purificado"].id);
  ok("concluir baixou a peca no cadastro", filtroConcluida === filtroAntes - 1,
    filtroAntes + " -> " + filtroConcluida);

  const os4 = (await chame("POST", "/service-orders", {
    clientId: clientes["Oficina Serra Verde"].id,
    title: T.ruido,
    priority: "LOW",
    items: [{ kind: "SERVICE", description: "Diagnostico com o equipamento em funcionamento", quantity: 1, unitPrice: "80.00" }],
  })).dados;
  const os5 = (await chame("POST", "/service-orders", {
    clientId: clientes["Padaria Aurora"].id,
    title: T.kit,
    priority: "HIGH",
    items: [{ kind: "PART", productId: pecas["Kit polia tensora"].id, quantity: 1 }],
  })).dados;
  const emEspera = await chame("POST", "/service-orders/" + os5.id + "/status", { status: "WAITING" });
  ok("a ordem pode ficar aguardando peca", emEspera.status === 200, String(emEspera.status));

  const resumo = (await chame("GET", "/service-orders/summary")).dados;
  const lista = await chame("GET", "/service-orders?page=1&pageSize=20");
  ok("resumo e lista concordam no total de ordens",
    resumo.total === lista.dados.meta.total, resumo.total + " x " + lista.dados.meta.total);
  ok("ha trabalho suficiente na tela para os indicadores fazerem sentido",
    resumo.total >= 4 && resumo.open >= 1 && resumo.completed >= 1,
    "total " + resumo.total + " · abertas " + resumo.open + " · concluidas " + resumo.completed);
  const numeros = [os1, os3, os4, os5].map((o) => o.number);
  ok("numeros sem repeticao", new Set(numeros).size === numeros.length, numeros.join(", "));

  // ---------- 3. a tela, com a sessao da dona ----------
  console.log("\n-- /app/ordens-de-servico --");
  // D6 (tarefa T1): a prova so escreve no banco de prova. A conferencia entra na API, pega o
  // id que ela devolve no login da conta de prova e exige que esse id exista em
  // nexusbusinessmanager_teste - se o servidor atende outro banco, a prova para aqui.
  await conferirServidorDeProva();

  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: "new",
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  const pagina = await browser.newPage();
  await pagina.setViewport({ width: 1440, height: 900 });
  await prepareJanela(pagina);
  const erros = [];
  pagina.on("pageerror", (e) => erros.push(String(e)));
  pagina.on("console", (m) => {
    if (m.type() === "error" && !ruidoDeRede(m.text())) erros.push("console: " + m.text());
  });

  let atendente = null;
  try {
    await entrarNoPainel(pagina, cap.email, cap.senha);
    const noMenu = await pagina.evaluate(() =>
      [...document.querySelectorAll(".admin-nav-item")]
        .some((a) => a.textContent.includes("Ordens de serviço")));
    ok("o menu lateral tem \"Ordens de serviço\"", noMenu);

    await vaPara(pagina, "/app/ordens-de-servico");
    await pagina.waitForSelector(".nx-os-tabela tbody tr", { timeout: 15000 });
    const titulo = await pagina.evaluate(() => document.querySelector(".page-title")?.textContent.trim());
    ok("a tela abre com o titulo do produto", titulo === "Ordens de Serviço", titulo);
    await espereTexto(pagina, "#" + os1.number);

    // 3.1 indicadores = resumo da API, lido agora. Os oito cartoes so existem quando o
    // resumo chega: a tela os monta atras do `sumario ? ... : null`, e a tabela nao
    // espera por eles. Medir sem esperar e a mesma armadilha da prova de cobrancas —
    // a pagina esta certa, e a medicao e que chega cedo demais.
    const cartoesProntos = await pagina
      .waitForFunction(() => document.querySelectorAll(".kpi").length === 8, { timeout: 15000 })
      .then(() => true)
      .catch(() => false);
    ok("os oito cartoes do resumo chegaram antes da leitura", cartoesProntos === true);
    const daApi = (await chame("GET", "/service-orders/summary")).dados;
    const kpiDaTela = await pagina.evaluate(() => {
      const mapa = {};
      document.querySelectorAll(".kpi").forEach((k) => {
        const r = (k.querySelector(".kpi-label")?.textContent || "").trim();
        mapa[r] = (k.querySelector(".kpi-value")?.textContent || "").replace(/\u00a0/g, " ").trim();
      });
      return mapa;
    });
    const esperados = [
      ["Abertas", String(daApi.open)],
      ["Em andamento", String(daApi.inProgress)],
      ["Aguardando peça", String(daApi.waiting)],
      ["Concluídas", String(daApi.completed)],
      ["Canceladas", String(daApi.cancelled)],
      ["Urgentes", String(daApi.urgent)],
      ["Concluídas no mês", String(daApi.completedThisMonth)],
    ];
    for (const [rotulo, valor] of esperados) {
      ok("o cartao \"" + rotulo + "\" mostra o numero da API (" + valor + ")",
        kpiDaTela[rotulo] === valor, String(kpiDaTela[rotulo]));
    }
    ok("o cartao de valor sai em real com duas casas, nao em numero cru",
      /^R\$\s?[\d.]+,\d{2}$/.test(kpiDaTela["Valor concluído no mês"] || ""),
      String(kpiDaTela["Valor concluído no mês"]));

    // 3.2 a linha como o balcao le
    const linha1 = await linhaDaOrdem(pagina, os1.number);
    ok("a ordem traz numero, cliente, situacao e prioridade em portugues",
      !!linha1 && linha1.cliente === "Padaria Aurora" && linha1.situacao === "Aberta" &&
      linha1.prioridade === "Urgente", JSON.stringify(linha1));
    ok("o total da tabela e o centavo do servidor",
      !!linha1 && linha1.total === "R$ 329,80", linha1 && linha1.total);
    const vaza = await pagina.evaluate(() => {
      const texto = document.body.textContent.replace(/\u00a0/g, " ");
      const achado = texto.match(/(IN_PROGRESS|COMPLETED|CANCELLED|WAITING|URGENT|NORMAL|OPEN)/);
      return {
        codigos: achado ? texto.slice(Math.max(0, achado.index - 60), achado.index + 60).replace(/\s+/g, " ") : null,
        uuid: /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i.test(texto),
        nativas: document.querySelectorAll("dialog").length,
      };
    });
    ok("nenhum codigo interno da API aparece para quem esta no balcao", vaza.codigos === null,
      String(vaza.codigos));
    ok("nenhum identificador de empresa ou registro aparece na tela", vaza.uuid === false);
    ok("nenhuma caixa nativa de dialogo no documento", vaza.nativas === 0, String(vaza.nativas));

    // 3.3 concluir pela tela: dialogo e baixa real de estoque
    console.log("\n-- concluir pela tela --");
    // Numa ordem aberta o balcao ve Iniciar, Aguardar peca e Cancelar. Concluir
    // so aparece na segunda porta, e a prova percorre o caminho real inteiro.
    ok("a ordem aberta oferece as portas que existem e nenhuma outra",
      (await linhaDaOrdem(pagina, os1.number)).acoes.join(", ") === "Iniciar, Aguardar peça, Cancelar",
      (await linhaDaOrdem(pagina, os1.number)).acoes.join(", "));
    const clicouIniciarOs1 = await cliqueEmAcaoDaLinha(pagina, os1.number, "Iniciar");
    ok("a linha da ordem aberta oferece \"Iniciar\"", clicouIniciarOs1 === "clicado", clicouIniciarOs1);
    await aguardeDialogo(pagina, "Iniciar ordem de serviço");
    await cliqueEmBotao(pagina, "Iniciar ordem", "[role=\"dialog\"]", "confirmar o inicio pela tela");
    await espereTexto(pagina, "Ordem em andamento.");
    await situacaoNaTela(pagina, os1.number, "Em andamento");
    const correiaAndamento = await estoqueDe(pecas["Correia dentada HTD 8M"].id);
    ok("iniciar nao tira nada do estoque", correiaAndamento === correiaAntes,
      correiaAntes + " -> " + correiaAndamento);

    const clicouConcluir = await cliqueEmAcaoDaLinha(pagina, os1.number, "Concluir");
    ok("em andamento a linha oferece \"Concluir\"", clicouConcluir === "clicado", clicouConcluir);
    await aguardeDialogo(pagina, "Concluir ordem de serviço");
    const corpoConcluir = await textoDoDialogo(pagina);
    ok("o dialogo cita a ordem pelo numero e pelo titulo",
      corpoConcluir.includes("#" + os1.number) && corpoConcluir.includes(T.noForno),
      corpoConcluir.replace(/\s+/g, " ").slice(0, 70));
    ok("o dialogo avisa que as pecas saem do estoque agora",
      corpoConcluir.includes("saem do estoque agora"));
    await semToast(pagina);
    await captura(pagina, "25-ordens-confirmacao");
    await cliqueEmBotao(pagina, "Concluir ordem", '[role="dialog"]', "confirmar no dialogo");
    await espereTexto(pagina, "Ordem concluída.");
    await situacaoNaTela(pagina, os1.number, "Concluída");
    const linhaConcluida = await linhaDaOrdem(pagina, os1.number);
    ok("na concluida sobra so o caminho de estorno",
      !!linhaConcluida && linhaConcluida.acoes.length === 1 && linhaConcluida.acoes[0] === "Cancelar",
      linhaConcluida && linhaConcluida.acoes.join(", "));
    const correiaDepois = await estoqueDe(pecas["Correia dentada HTD 8M"].id);
    ok("o estoque baixou exatamente as duas unidades aplicadas",
      correiaDepois === correiaAntes - 2, correiaAntes + " -> " + correiaDepois);
    const nativasUsadas = await pagina.evaluate(() => window.__nativas.length);
    ok("nenhuma caixa nativa foi usada no fluxo (alert/confirm/prompt)", nativasUsadas === 0);

    // 3.4 abrir ordem pela tela
    console.log("\n-- abrir uma ordem pela aba --");
    await pagina.evaluate(() => {
      const aba = [...document.querySelectorAll('[role="tab"]')]
        .find((b) => b.textContent.trim() === "Nova ordem");
      if (aba) aba.click();
    });
    await pagina.waitForSelector("#os-cliente", { timeout: 8000 });
    await pagina.waitForFunction(() => {
      const s = document.querySelector("#os-cliente");
      return !!s && s.options.length > 1;
    }, { timeout: 10000 });
    await pagina.select("#os-cliente", clientes["Condominio Alvorada"].id);
    await pagina.type("#os-titulo", T.arHall, { delay: 3 });
    await pagina.select("#os-prioridade", "HIGH");
    await pagina.type("#os-descricao", "O ar do hall parou de gelar no meio da tarde.", { delay: 2 });
    await pagina.type("#os-diagnostico", "Filtro saturado e serpentina suja.", { delay: 2 });
    await pagina.select('[aria-label="Tipo da linha 1"]', "PART");
    await pagina.waitForFunction(() => {
      const s = document.querySelector('[aria-label="Produto da linha 1"]');
      return !!s && s.options.length > 1;
    }, { timeout: 10000 });
    await pagina.select('[aria-label="Produto da linha 1"]', pecas["Filtro de ar purificado"].id);
    await cliqueEmBotao(pagina, "+ Adicionar linha", ".nx-tabpanel", "adicionar a segunda linha");
    await pagina.waitForFunction(() => !!document.querySelector('[aria-label="Descrição do serviço 2"]'), { timeout: 8000 });
    await pagina.type('[aria-label="Descrição do serviço 2"]', "Higienizacao com produto aprovado", { delay: 2 });
    await pagina.type('[aria-label="Preço unitário 2"]', "150,00", { delay: 3 });

    const previa = await pagina.evaluate(() => {
      const doc = document.querySelector(".nx-tabpanel");
      return doc ? doc.innerText.replace(/\u00a0/g, " ") : "";
    });
    ok("a previa do formulario mostra R$ 195,00 (45,00 + 150,00)",
      previa.includes("195,00"), previa.match(/R\$\s?[\d.,]+/g)?.slice(0, 3).join(" | "));
    await semToast(pagina);
    await captura(pagina, "25-ordens-formulario");

    await cliqueEmBotao(pagina, "Registrar ordem", ".nx-tabpanel", "registrar a ordem");
    await espereTexto(pagina, "Ordem cadastrada.");
    await pagina.waitForFunction((t) => [...document.querySelectorAll(".nx-os-tabela tbody tr")]
      .some((tr) => tr.innerText.includes(t)), { timeout: 10000 }, T.arHall).catch(() => {});
    const linha2 = await pagina.evaluate((t) => {
      const tr = [...document.querySelectorAll(".nx-os-tabela tbody tr")].find((x) => x.innerText.includes(t));
      if (!tr) return null;
      const cel = [...tr.querySelectorAll("td")].map((c) => c.innerText.replace(/\u00a0/g, " ").trim());
      return { numero: cel[0], cliente: cel[1], situacao: cel[3], prioridade: cel[4], total: cel[6] };
    }, T.arHall);
    ok("a ordem aberta pela tela entrou na lista", !!linha2, JSON.stringify(linha2));
    ok("ela voltou com o cliente e a prioridade escolhidos na tela",
      !!linha2 && linha2.cliente === "Condominio Alvorada" && linha2.prioridade === "Alta",
      linha2 && linha2.cliente + " / " + linha2.prioridade);
    ok("o total mostrado e o centavo que o servidor calculou (R$ 195,00)",
      !!linha2 && linha2.total === "R$ 195,00", linha2 && linha2.total);
    ok("ela comeca \"Aberta\", como define a porta", !!linha2 && linha2.situacao === "Aberta");
    const numero2 = linha2 ? Number(String(linha2.numero).replace("#", "")) : 0;

    // 3.5 iniciar — movimento vivo, sem estoque no caminho
    const filtroLogoAntes = await estoqueDe(pecas["Filtro de ar purificado"].id);
    const clicouIniciar = await cliqueEmAcaoDaLinha(pagina, numero2, "Iniciar");
    ok("a ordem recem-criada oferece \"Iniciar\"", clicouIniciar === "clicado", clicouIniciar);
    await aguardeDialogo(pagina, "Iniciar ordem de serviço");
    await cliqueEmBotao(pagina, "Iniciar ordem", '[role="dialog"]', "confirmar o inicio");
    await espereTexto(pagina, "Ordem em andamento.");
    await situacaoNaTela(pagina, numero2, "Em andamento");
    const linhaAndamento = await linhaDaOrdem(pagina, numero2);
    ok("em andamento ha caminho pra frente e pra tras",
      !!linhaAndamento && linhaAndamento.acoes.includes("Aguardar peça") &&
      linhaAndamento.acoes.includes("Cancelar"), (linhaAndamento || {}).acoes);
    const filtroNoAndamento = await estoqueDe(pecas["Filtro de ar purificado"].id);
    ok("iniciar a ordem nova nao mexe no estoque", filtroNoAndamento === filtroLogoAntes,
      filtroLogoAntes + " -> " + filtroNoAndamento);

    // 3.6 estorno no cancelar
    console.log("\n-- estorno no cancelar --");
    const clicouCancelar = await cliqueEmAcaoDaLinha(pagina, os3.number, "Cancelar");
    ok("a concluida oferece \"Cancelar\" para quem pode estornar",
      clicouCancelar === "clicado", clicouCancelar);
    await aguardeDialogo(pagina, "Cancelar ordem de serviço");
    const corpoCancelar = await textoDoDialogo(pagina);
    ok("o dialogo de estorno diz que as pecas voltam ao estoque",
      /voltam ao estoque/.test(corpoCancelar), corpoCancelar.replace(/\s+/g, " ").slice(0, 80));
    await cliqueEmBotao(pagina, "Cancelar ordem", '[role="dialog"]', "confirmar o estorno");
    await espereTexto(pagina, "Ordem cancelada.");
    await situacaoNaTela(pagina, os3.number, "Cancelada");
    const filtroDepois = await estoqueDe(pecas["Filtro de ar purificado"].id);
    ok("cancelar a concluida devolveu a unidade baixada", filtroDepois === filtroAntes,
      filtroConcluida + " -> " + filtroDepois);
    const linha3 = await linhaDaOrdem(pagina, os3.number);
    ok("a cancelada nao deixa caminho nenhum",
      !!linha3 && linha3.acoes.length === 0 && linha3.situacao === "Cancelada", JSON.stringify(linha3));

    // 3.7 o documento da ordem
    console.log("\n-- documento e linha do tempo --");
    await cliqueEm(pagina, '.nx-os-abrir[aria-label="Ver ordem ' + os1.number + '"]');
    await pagina.waitForSelector('[role="dialog"] .nx-os-doc', { timeout: 8000 });
    const documento = await pagina.evaluate(() => {
      const d = document.querySelector('[role="dialog"]');
      const doc = d.querySelector(".nx-os-doc");
      return {
        texto: d.innerText.replace(/\u00a0/g, " "),
        linhas: [...doc.querySelectorAll(".nx-os-itens tbody tr")].map((t) => t.innerText.replace(/\s+/g, " ")),
        quem: [...d.querySelectorAll(".nx-os-quem")].map((x) => x.textContent.trim()),
        motivos: [...d.querySelectorAll(".nx-os-motivo")].map((x) => x.textContent.trim()),
      };
    });
    ok("o documento traz numero, cliente, titulo e o que foi feito",
      documento.texto.includes("#" + os1.number) && documento.texto.includes("Padaria Aurora") &&
      documento.texto.includes(T.noForno));
    ok("as linhas saem na ordem digitada (peca antes do servico)",
      documento.linhas.length >= 2 && documento.linhas[0].includes("Correia dentada") &&
      documento.linhas[1].includes("Mao de obra"), documento.linhas.join(" | ").slice(0, 90));
    ok("a linha do tempo mostra quem moveu a ordem",
      documento.quem.length >= 2 && documento.quem.every((q) => q.length > 0), documento.quem.join(", "));
    ok("o documento traz o diagnostico do tecnico", documento.texto.includes("Correia com dente gasto"));
    await cliqueEmBotao(pagina, "Imprimir", '[role="dialog"]', "imprimir o documento");
    const impressoes = await pagina.evaluate(() => window.__impressoes);
    ok("a saida em papel chama window.print uma vez", impressoes === 1, String(impressoes));
    ok("a pagina continua viva depois de mandar para a impressora",
      await pagina.evaluate(() => !!document.querySelector('[role="dialog"] .nx-os-doc')));
    await semToast(pagina);
    await captura(pagina, "25-ordens-detalhe");
    await cliqueEmBotao(pagina, "Fechar", '[role="dialog"]', "fechar o documento");

    // O documento de uma ordem movida pela API com nota mostra o porque; o da
    // ordem movida pela tela mostra quem, na hora certa, sem nota inventada.
    await cliqueEm(pagina, '.nx-os-abrir[aria-label="Ver ordem ' + os3.number + '"]');
    await pagina.waitForSelector('[role="dialog"] .nx-os-doc', { timeout: 8000 });
    const motivoApi = await pagina.evaluate(() =>
      [...document.querySelectorAll('[role="dialog"] .nx-os-motivo')].map((x) => x.textContent.trim()));
    ok("a linha do tempo mostra o motivo registrado na mudanca",
      motivoApi.some((m) => m.includes("Peca aplicada na manutencao do hall")),
      motivoApi.join(" | ").slice(0, 80));
    await cliqueEmBotao(pagina, "Fechar", '[role="dialog"]', "fechar o documento da concluida");

    // 3.8 filtro, busca e ordenacao no servidor
    console.log("\n-- filtro, busca e ordenacao --");
    await pagina.evaluate(() => {
      const sel = document.querySelector('[aria-label="Filtrar por status"]');
      sel.value = "WAITING";
      sel.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await pagina.waitForFunction(() => {
      const linhas = [...document.querySelectorAll(".nx-os-tabela tbody tr")];
      return linhas.length > 0 && linhas.every((l) => l.innerText.includes("Aguardando peça"));
    }, { timeout: 8000 }).catch(() => {});
    const filtradas = await pagina.evaluate(() =>
      [...document.querySelectorAll(".nx-os-tabela tbody tr")].map((t) =>
        (t.querySelector(".status-pill")?.textContent || "").trim()));
    ok("o filtro de situacao deixa so quem aguarda peca",
      filtradas.length >= 1 && filtradas.every((t) => t === "Aguardando peça"),
      filtradas.join(" | ") || "nenhuma linha");

    await pagina.evaluate(() => {
      const sel = document.querySelector('[aria-label="Filtrar por status"]');
      sel.value = "";
      sel.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await espera(600);
    await pagina.type('[aria-label="Buscar ordens de serviço"]', "Serra Verde", { delay: 40 });
    await pagina.waitForFunction(() => {
      const linhas = [...document.querySelectorAll(".nx-os-tabela tbody tr")];
      return linhas.length === 1 && linhas[0].innerText.includes("Oficina Serra Verde");
    }, { timeout: 8000 }).catch(() => {});
    const buscadas = await pagina.evaluate(() =>
      [...document.querySelectorAll(".nx-os-tabela tbody tr")].map((t) => t.innerText.replace(/\s+/g, " ").slice(0, 60)));
    ok("a busca pelo nome do cliente acha a ordem dele",
      buscadas.length === 1 && buscadas[0].includes("Oficina Serra Verde"), buscadas.join(" | "));

    await pagina.evaluate((seletor) => {
      const campo = document.querySelector(seletor);
      campo.focus();
      campo.select();
    }, '[aria-label="Buscar ordens de serviço"]');
    await pagina.keyboard.press("Backspace");
    await pagina.waitForFunction(() => document.querySelectorAll(".nx-os-tabela tbody tr").length > 1,
      { timeout: 8000 }).catch(() => {});
    await pagina.evaluate(() => {
      const sel = document.querySelector('[aria-label="Ordenar por"]');
      sel.value = "total";
      sel.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await espera(900);
    const totais = await pagina.evaluate(() =>
      [...document.querySelectorAll(".nx-os-tabela tbody tr")].map((t) =>
        Number((t.querySelectorAll("td")[6]?.textContent || "").replace(/[^\d,]/g, "").replace(",", "."))));
    ok("ordenar pelo valor coloca a lista em ordem decrescente",
      totais.length > 1 && totais.every((v, i) => i === 0 || totais[i - 1] >= v), totais.join(" > "));

    await pagina.evaluate(() => {
      const sel = document.querySelector('[aria-label="Ordenar por"]');
      sel.value = "createdAt";
      sel.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await espera(900);
    const nota = await pagina.evaluate(() => document.querySelector(".toolbar-note")?.textContent.trim());
    ok("o rodape da barra conta as ordens do recorte", /\d+ (ordem|ordens)$/.test(String(nota)), nota);
    // A tabela de nove colunas e a mais larga do painel: o guarda-chuva
    // desta prova e o espaco que a janela de trabalho tem. Cortar a coluna de
    // acoes atras da borda e o defeito que esta linha vigia.
    const folga = await pagina.evaluate(() => {
      const role = document.querySelector(".nx-os-scroll");
      const tabela = document.querySelector(".nx-os-tabela");
      return { visivel: role.clientWidth, precisa: tabela.scrollWidth };
    });
    ok("a janela de 1440 mostra a tabela inteira, com a coluna de acoes",
      folga.precisa <= folga.visivel, folga.precisa + " x " + folga.visivel);

    await semToast(pagina);
    await captura(pagina, "25-ordens-lista");

    const claroAntes = await pagina.evaluate(() => document.documentElement.getAttribute("data-theme"));
    await pagina.click(".theme-switch");
    await espera(600);
    const claro = await pagina.evaluate(() => document.documentElement.getAttribute("data-theme"));
    ok("a tela obedece ao alternador de tema", claro !== claroAntes && claro === "light",
      claroAntes + " -> " + claro);
    await semToast(pagina);
    await captura(pagina, "25-ordens-claro");
    await pagina.click(".theme-switch");
    await espera(400);
    await pagina.setViewport({ width: 390, height: 844 });
    await espera(600);
    const virouCartao = await pagina.evaluate(() => {
      const td = document.querySelector(".nx-os-tabela tbody td");
      if (!td) return "sem linha";
      const rotulo = getComputedStyle(td, "::before").content;
      return rotulo && rotulo !== "none";
    });
    ok("no celular a tabela vira cartao com o rotulo em cada campo", virouCartao === true, String(virouCartao));
    // O indicador ocupa a primeira tela do celular; a captura sobe ate os
    // cartoes, que sao o assunto desta prova.
    await pagina.evaluate(() => document.querySelector(".nx-os-tabela tbody tr")
      ?.scrollIntoView({ block: "center" }));
    await espera(500);
    await semToast(pagina);
    await captura(pagina, "25-ordens-celular");
    await pagina.setViewport({ width: 1440, height: 900 });

    // ---------- 4. quem nao tem a escrita ----------
    console.log("\n-- sessao do atendente --");
    atendente = await criarAtendente(empresa.id);
    const loginStaff = await chame("POST", "/auth/login",
      { email: atendente.email, password: atendente.senha }, false);
    ok("o atendente de prova entrou na mesma empresa", loginStaff.status === 200, String(loginStaff.status));
    const tokenStaff = loginStaff.dados.accessToken;

    const criaStaff = await comoToken(tokenStaff, "POST", "/service-orders", {
      clientId: clientes["Padaria Aurora"].id, title: "Ordem do atendente",
      items: [{ kind: "SERVICE", description: "Qualquer servico", quantity: 1, unitPrice: "10.00" }],
    });
    ok("a API recusa a criacao pelo atendente (403)", criaStaff.status === 403, String(criaStaff.status));
    const estornaStaff = await comoToken(tokenStaff, "POST", "/service-orders/" + os1.id + "/status",
      { status: "CANCELLED" });
    ok("estornar uma concluida nao e do atendente (403)", estornaStaff.status === 403,
      String(estornaStaff.status));

    const atribui = await chame("PATCH", "/service-orders/" + os4.id, { assignedUserId: atendente.id });
    ok("a proprietaria atribui a ordem ao atendente", atribui.status === 200, String(atribui.status));

    const paginaStaff = await browser.newPage();
    await paginaStaff.setViewport({ width: 1440, height: 900 });
    await prepareJanela(paginaStaff);
    await entrarNoPainel(paginaStaff, atendente.email, atendente.senha);
    await vaPara(paginaStaff, "/app/ordens-de-servico");
    await paginaStaff.waitForSelector(".nx-os-tabela tbody tr", { timeout: 15000 });
    const abasStaff = await paginaStaff.evaluate(() =>
      [...document.querySelectorAll('[role="tab"]')].map((b) => b.textContent.trim()));
    ok("o atendente nao ve a aba de criacao", !abasStaff.includes("Nova ordem"), abasStaff.join(" | "));
    const minha = await linhaDaOrdem(paginaStaff, os4.number);
    ok("na ordem atribuida a ele ha caminho pra frente",
      !!minha && minha.acoes.includes("Iniciar"), minha && minha.acoes.join(", "));
    ok("e nunca o botao de cancelar", !!minha && !minha.acoes.includes("Cancelar"));
    const outras = await paginaStaff.evaluate((ids) =>
      [...document.querySelectorAll(".nx-os-tabela tbody tr")]
        .filter((t) => ids.some((n) => (t.querySelector("td")?.textContent || "").trim() === n))
        .map((t) => t.querySelectorAll(".row-actions button").length),
    [os1.number, os3.number, os5.number].map((n) => "#" + n));
    ok("nas ordens dos outros ele nao ve acao nenhuma",
      outras.length === 3 && outras.every((n) => n === 0), outras.join(", "));
    const chamouEquipe = await paginaStaff.evaluate(() =>
      performance.getEntriesByType("resource").some((r) => /\/users(\?|$)/.test(r.name)));
    ok("sem user:read a tela nao bate na porta da equipe", chamouEquipe === false);
    ok("nenhuma caixa nativa na sessao do atendente",
      (await paginaStaff.evaluate(() => window.__nativas.length)) === 0);
    await captura(paginaStaff, "25-ordens-atendente");

    ok("nenhum erro de console ou de pagina durante a prova",
      erros.length === 0, erros.slice(0, 2).join(" | "));
  } finally {
    await browser.close().catch(() => {});
    if (prisma && atendente) {
      await prisma.serviceOrder.updateMany({
        where: { companyId: empresa.id, assignedUserId: atendente.id },
        data: { assignedUserId: null },
      });
      await prisma.companyUser.deleteMany({ where: { userId: atendente.id } });
      await prisma.auditLog.deleteMany({ where: { userId: atendente.id } });
      await prisma.user.deleteMany({ where: { id: atendente.id } });
      console.log("\n  [banco] ordem devolvida ao dono e atendente de prova apagado");
    }
    if (prisma) await prisma.$disconnect();
  }

  console.log("\n" + checks + " verificacoes, " + falhas.length + " falha(s)");
  if (falhas.length) {
    falhas.forEach((f) => console.log(" - " + f));
    process.exit(1);
  }
  console.log("PROVA OK: Ordens de Servico funcionam no navegador, com estoque e permissao conferidos no banco");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
