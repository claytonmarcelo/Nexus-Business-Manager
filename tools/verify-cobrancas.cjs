// Prova do navegador para a F3.2 Parte 2: a casa das Cobranças.
//
// Quem entra é a conta fictícia de captura (tools/conta-de-captura.cjs), na
// empresa que ela mesma criou. A prova escreve no banco de propósito: cuida dos
// clientes, abre uma venda e uma ordem de serviço de apoio, cria cobranças pela
// API e pela tela, e percorre os movimentos reais do módulo. Por isso as capturas
// podem ficar no repositório — não há dado real nelas, e a chave PIX que aparece
// é o CNPJ de exemplo que o próprio campo do formulário ensina no placeholder.
//
// O que se prova aqui, e que o jsdom não pode provar:
//  1. a tela existe no menu de uma sessão de verdade e os oito indicadores são os
//     números do GET /charges/summary, conferidos lado a lado com a API;
//  2. "vencida" é o servidor quem decide: uma cobrança com vencimento ontem chega
//     com o selo, e a tela nunca compara data com a cabeça de quem olha;
//  3. registrar o recebimento pela tela cria EXATAMENTE um lançamento no caixa —
//     contado no banco, inclusive quando dois pagamentos chegam juntos — e o diálogo
//     pede a data em que o dinheiro entrou: o dia digitado é o dia que cai na
//     cobrança e no lançamento, enquanto o vencimento combinado fica onde está;
//  4. cancelar sem motivo não escreve nada, e pagar o que já está pago é recusado;
//  5. nenhum código interno (PENDING, PAID), nenhum identificador de registro e
//     nenhuma caixa nativa de confirmação aparecem no navegador;
//  6. a aba de gateways escreve só o que o MANUAL tem: o que cai no banco é a
//     chave PIX de exibição, e as três colunas de credencial permanecem nulas;
//  7. o atendente sem charge:write não vê aba de criação, não vê gateway e não vê
//     botão de mexer no dinheiro — e a API recusa a escrita dele com o mesmo 403;
//  8. o documento da cobrança e o recibo saem em papel pela mesma ponte da ordem
//     de serviço (window.print), e "Gerar cobrança" numa venda ou numa OS abre o
//     formulário com o documento e o valor lidos na fonte.
//
// Reexecução não acumula: as cobranças desta prova são identificadas pelo título,
// e o carnê, o lançamento, a venda, a ordem e o gateway da corrida anterior são
// desfeitos no começo de cada corrida. O atendente de prova é apagado no fim.
const puppeteer = require("puppeteer-core");
const path = require("path");
const { sessaoDaCaptura } = require("./conta-de-captura.cjs");
const { conferirServidorDeProva, clienteDoBancoDeProva } = require("./banco-de-prova.cjs");

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const BASE = process.env.NEXUS_WEB || "http://localhost:5173";
const API = (process.env.NEXUS_API || "http://localhost:3001") + "/api";
const SHOTS = path.join(__dirname, "..", "docs", "screenshots");

// O espaço que o Intl brasileiro põe entre "R$" e o número é indivisível. Na tela
// é o mesmo "R$ 700,00" que a pessoa lê; no texto cru do documento é outro
// caractere, e é ele que estes comparadores retiram antes de conferir o valor.
const NBSP = new RegExp("[\\u00a0\\u202f]", "g");
const legivel = (t) => String(t).replace(NBSP, " ");

// Cadastro de apoio da casa de demonstração. Domínios .test, chave PIX de exemplo:
// nada aqui é dado de cliente real.
const CLIENTES = [
  { name: "Padaria Aurora", phone: "(11) 4002-8922", email: "contato@aurora.test" },
  { name: "Condominio Alvorada", phone: "(11) 3555-1200", email: "admin@alvorada.test" },
  { name: "Oficina Serra Verde", phone: "(11) 2777-4500", email: "recepcao@serraverde.test" },
];
const PRODUTO_DE_APOIO = { name: "Polimento profissional", unit: "un", salePrice: "250.00" };
// O CNPJ de exemplo que o proprio campo do formulario ensina no placeholder.
const CHAVE_CNPJ = "11.222.333/0001-81";
const CHAVE_CNPJ_TROCADA = "11.222.333/0001-80";

// Os seis titulos fixos sao a assinatura da prova: e por eles que a corrida
// anterior e desfeita antes de comecar.
const T = {
  avulsa: "Consulta tecnica do notebook",
  daVenda: "Venda de balcao - polimento",
  daOrdem: "Conserto da furadeira",
  corrida: "Troca de tela adiada",
  pelaTela: "Orcamento 88 - instalacao",
  ordem: "Revisao do compressor",
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

// O dia do calendario da maquina, somado em dias. O que a porta julga e o fuso
// cadastrado da empresa; aqui so se escreve o campo de calendario AAAA-MM-DD.
function dia(offset) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return [
    String(d.getFullYear()),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
}

/** "2026-10-20" -> "20/10/2026": o mesmo dia que a tela le de `dueDateLabel`. */
function diaLegivel(iso) {
  const [a, m, d] = iso.split("-");
  return d + "/" + m + "/" + a;
}

/**
 * O dia do instante dado, no fuso da empresa — a régua com que a prova confere o
 * que a tela digitou e o que o banco guardou. O `dia(offset)` deste arquivo é o
 * dia da máquina: basta para escrever um vencimento, e não serve para medir o dia
 * de um recebimento, porque quem marca o recebimento numa janela em fuso adiantado
 * veria o dia de amanhã no campo.
 */
function diaNoFuso(timeZone, quando) {
  const partes = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(quando));
  const campo = (t) => (partes.find((p) => p.type === t) || {}).value || "01";
  return campo("year") + "-" + campo("month") + "-" + campo("day");
}

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

async function cliqueEmAba(page, rotulo, nome) {
  const resultado = await page.evaluate((r) => {
    const aba = [...document.querySelectorAll('[role="tab"]')].find((b) => b.textContent.trim() === r);
    if (!aba) return "ausente";
    aba.click();
    return "clicado";
  }, rotulo);
  if (nome) ok("\"" + nome + "\" clicado", resultado === "clicado", resultado);
  await espera(500);
  return resultado;
}

// Escreve num campo controlado pelo React sem depender do teclado: o valor passa
// pelo setter nativo (senao o rastreador do React acha que nada mudou) e o
// input/change avisam a pagina. E assim que um campo de data se preenche.
async function escrevaEm(page, seletor, valor) {
  const resultado = await page.evaluate((s, v) => {
    const campo = document.querySelector(s);
    if (!campo) return "ausente";
    const proto = campo.tagName === "TEXTAREA"
      ? window.HTMLTextAreaElement.prototype
      : campo.tagName === "SELECT"
        ? window.HTMLSelectElement.prototype
        : window.HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, "value").set;
    setter.call(campo, v);
    campo.dispatchEvent(new Event("input", { bubbles: true }));
    campo.dispatchEvent(new Event("change", { bubbles: true }));
    return "escrito";
  }, seletor, valor);
  await espera(150);
  return resultado;
}

// ---- a tabela como o balcao le ----

async function linhaDaCobranca(page, numero) {
  return page.evaluate((n, dentroEspaco) => {
    const limpar = (t) => t.replace(new RegExp(dentroEspaco, "g"), " ");
    const tr = [...document.querySelectorAll(".nx-cb-tabela tbody tr")]
      .find((t) => (t.querySelector("td")?.textContent || "").trim() === n);
    if (!tr) return null;
    const cel = [...tr.querySelectorAll("td")].map((t) => limpar(t.innerText).trim());
    return {
      numero: cel[0], cliente: cel[1], cobranca: cel[2], documento: cel[3],
      valor: cel[4], vencimento: cel[5], recebimento: cel[6], situacao: cel[7],
      selos: [...tr.querySelectorAll(".status-pill")].map((p) => p.textContent.trim()),
      acoes: [...tr.querySelectorAll(".row-actions button")].map((b) => b.textContent.trim()),
    };
  }, "#" + numero, NBSP.source);
}

async function cliqueEmAcaoDaLinha(page, numero, rotulo) {
  const resultado = await page.evaluate((n, r) => {
    const tr = [...document.querySelectorAll(".nx-cb-tabela tbody tr")]
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
      const tr = [...document.querySelectorAll(".nx-cb-tabela tbody tr")]
        .find((t) => (t.querySelector("td")?.textContent || "").trim() === n);
      const pill = tr && tr.querySelector(".status-pill");
      return !!pill && pill.textContent.trim() === rotulo;
    }, { timeout: 10000, polling: 150 }, "#" + numero, esperado)
    .then(() => true)
    .catch(() => false);
  ok("a linha #" + numero + " virou \"" + esperado + "\"", virou);
  return virou;
}

// ---- o dialogo ----

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

// O texto do dialogo e lido por textContent, e nao innerText: innerText depende do
// layout, e um modal pego no meio da animacao de abertura devolve cada palavra na
// sua propria linha — o comparador entao nao enxerga a frase que esta na tela.
// textContent e o texto do documento, com o layout ou sem ele.
function textoDoDialogo(page) {
  return page.evaluate((dentroEspaco) => {
    const d = document.querySelector('[role="dialog"]');
    return d ? d.textContent.replace(new RegExp(dentroEspaco, "g"), " ") : "";
  }, NBSP.source);
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
  const email = "prova-cobrancas-" + Date.now() + "@nexus.prova";
  const senha = "ProvaCobrancas2026#";
  const user = await prisma.user.create({
    data: { email, name: "Caixa de Prova", passwordHash: await bcrypt.hash(senha, 12) },
  });
  await prisma.companyUser.create({ data: { userId: user.id, companyId, role: "STAFF" } });
  console.log("  [banco] atendente de prova criado na empresa ativa");
  return { id: user.id, email, senha };
}

// A descricao que o servico da cobranca da ao lancamento, montada do mesmo jeito
// que ele monta (charges.service.ts): rotulo, numero, travessao, titulo.
const descricaoDoLancamento = (numero, titulo) => ("Cobrança " + numero + " — " + titulo).slice(0, 190);

// A limpeza da corrida anterior segue a ordem das chaves estrangeiras: a cobranca
// segura o lancamento, a venda e a ordem, entao ela sai primeiro. O lancamento que
// a venda gerou por politica sai junto com a venda, para o caixa nao ficar com
// receita de uma venda que nao existe mais. O gateway do MANUAL tambem e removido:
// a prova precisa ver a configuracao sendo escrita, nao ja escrita.
async function limparCorridaAnterior(companyId) {
  // Os titulos-assinatura desta prova e o que as sondas de diagnostico deixaram
  // para tras sao desfeitos na mesma passada: a corrida comeca sempre no mesmo
  // carne, nao no entulho da noite anterior.
  const cobrancas = await prisma.charge.findMany({
    where: { companyId, OR: [{ title: { in: TITULOS } }, { title: { startsWith: "Sonda " } }] },
    select: { id: true, financeEntryId: true, saleId: true, serviceOrderId: true },
  });
  const ids = cobrancas.map((c) => c.id);
  const lancamentos = cobrancas.map((c) => c.financeEntryId).filter(Boolean);
  const vendas = [...new Set(cobrancas.map((c) => c.saleId).filter(Boolean))];
  const ordens = [...new Set(cobrancas.map((c) => c.serviceOrderId).filter(Boolean))];

  if (ids.length) await prisma.charge.deleteMany({ where: { id: { in: ids } } });
  if (lancamentos.length) await prisma.financeEntry.deleteMany({ where: { id: { in: lancamentos } } });
  if (vendas.length) {
    await prisma.financeEntry.deleteMany({ where: { companyId, saleId: { in: vendas } } });
    await prisma.sale.deleteMany({ where: { companyId, id: { in: vendas } } });
  }
  if (ordens.length) await prisma.serviceOrder.deleteMany({ where: { companyId, id: { in: ordens } } });
  await prisma.serviceOrder.deleteMany({ where: { companyId, title: T.ordem } });
  await prisma.paymentGateway.deleteMany({ where: { companyId, provider: "MANUAL" } });
  if (ids.length) console.log("  [banco] " + ids.length + " cobranca(s) da corrida anterior desfeita(s)");
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

async function garantaProdutoDeApoio() {
  const lista = await chame("GET", "/products?pageSize=100");
  const achado = (lista.dados.data || []).find((x) => x.name === PRODUTO_DE_APOIO.name);
  if (achado) return achado;
  const criado = await chame("POST", "/products", {
    ...PRODUTO_DE_APOIO, stockQuantity: 0, trackStock: false,
  });
  if (criado.status >= 300) {
    throw new Error("produto de apoio nao nasceu: " + criado.status + " " + criado.texto.slice(0, 120));
  }
  return criado.dados;
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
  await limparCorridaAnterior(empresa.id);

  const clientes = {};
  for (const c of CLIENTES) clientes[c.name] = await garantaCliente(c);
  const produto = await garantaProdutoDeApoio();
  ok("clientes e produto de apoio prontos",
    Object.keys(clientes).length === 3 && !!produto.id);

  // ---------- 1. o que so a porta pode barrar ----------
  console.log("\n-- guardas da porta --");
  const semVinculo = await chame("POST", "/charges", {
    title: "Cobranca sem destinatario", amount: "50,00", dueDate: dia(3), method: "DINHEIRO",
  });
  ok("cobranca sem cliente, venda ou ordem e recusada (400)",
    semVinculo.status === 400, String(semVinculo.status));

  const pixSemChave = await chame("POST", "/charges", {
    clientId: clientes["Padaria Aurora"].id, title: "PIX sem chave",
    amount: "50,00", dueDate: dia(3), method: "PIX",
  });
  ok("cobranca pelo PIX sem chave e recusada (400)",
    pixSemChave.status === 400, String(pixSemChave.status));

  const cnpjTrocado = await chame("POST", "/charges", {
    clientId: clientes["Padaria Aurora"].id, title: "Chave com digito trocado",
    amount: "50,00", dueDate: dia(3), method: "PIX", pixKeyType: "CNPJ", pixKey: CHAVE_CNPJ_TROCADA,
  });
  ok("chave PIX com digito verificador trocado e recusada (400)",
    cnpjTrocado.status === 400, String(cnpjTrocado.status));

  const dinheiroComChave = await chame("POST", "/charges", {
    clientId: clientes["Padaria Aurora"].id, title: "Dinheiro com chave PIX",
    amount: "50,00", dueDate: dia(3), method: "DINHEIRO", pixKeyType: "CNPJ", pixKey: CHAVE_CNPJ,
  });
  ok("chave PIX numa cobranca em dinheiro e recusada, nao silenciada (400)",
    dinheiroComChave.status === 400, String(dinheiroComChave.status));

  const valorZero = await chame("POST", "/charges", {
    clientId: clientes["Padaria Aurora"].id, title: "Valor zero",
    amount: "0,00", dueDate: dia(3), method: "DINHEIRO",
  });
  ok("cobranca de valor zero e recusada (400)", valorZero.status === 400, String(valorZero.status));

  const fantasma = await chame("GET", "/charges/00000000-0000-4000-8000-0000000000ff");
  ok("id de outra origem devolve 404", fantasma.status === 404, String(fantasma.status));

  // ---------- 2. cobranças abertas pela API ----------
  console.log("\n-- escrita da API --");
  const ordemCriada = await chame("POST", "/service-orders", {
    clientId: clientes["Oficina Serra Verde"].id,
    title: T.ordem,
    description: "O compressor esquenta e desarma no meio do servico.",
    items: [{ kind: "SERVICE", description: "Revisao com teste de carga", quantity: 1, unitPrice: "180.00" }],
  });
  const ordem = ordemCriada.dados;
  ok("a ordem de servico de apoio nasceu", ordemCriada.status === 201 && !!ordem.id,
    String(ordemCriada.status));

  const vendaCriada = await chame("POST", "/sales", {
    clientId: clientes["Condominio Alvorada"].id,
    confirm: true,
    installments: 1,
    items: [{ productId: produto.id, quantity: 1, unitPrice: "250.00" }],
  });
  const venda = vendaCriada.dados;
  ok("a venda de apoio nasceu confirmada",
    vendaCriada.status === 201 && venda.status === "CONFIRMED",
    vendaCriada.status + " · " + venda.status);

  const avulsa = (await chame("POST", "/charges", {
    clientId: clientes["Padaria Aurora"].id,
    title: T.avulsa,
    amount: "350,00",
    dueDate: dia(7),
    method: "PIX",
    pixKeyType: "CNPJ",
    pixKey: CHAVE_CNPJ,
    notes: "Cobranca aberta pela API para a prova",
  })).dados;
  ok("a API cria a cobranca com 201 e numero da fila da empresa",
    Number.isInteger(avulsa.number) && avulsa.number > 0, "#" + avulsa.number);
  ok("o valor sai em centavo (350,00)", Math.round(avulsa.amount * 100) === 35000, String(avulsa.amount));
  ok("toda cobranca deste produto nasce do gateway MANUAL",
    avulsa.provider === "MANUAL", avulsa.provider);
  // A API devolve o dia nu, sem fuso ("2026-10-20"): e a tela que o escreve como
  // 20/10/2026. Se o servidor devolvesse a data ja formatada, teria escolhido um
  // fuso por conta propria na porta de saida.
  ok("o vencimento volta como dia de calendario (AAAA-MM-DD), nao como instante",
    avulsa.dueDateLabel === dia(7), avulsa.dueDateLabel);
  ok("cobranca nova nasce pendente e sem lancamento no caixa",
    avulsa.status === "PENDING" && avulsa.financeEntryId === null);

  const daVendaResposta = await chame("POST", "/charges", {
    saleId: venda.id,
    title: T.daVenda,
    amount: "250,00",
    dueDate: dia(-1),
    method: "BOLETO",
    instructions: "Deposito na conta da administracao ate o dia do vencimento",
  });
  const daVenda = daVendaResposta.dados;
  ok("a cobranca de uma venda herda o cliente dela",
    daVendaResposta.status === 201 && daVenda.clientName === "Condominio Alvorada",
    String(daVendaResposta.status) + " · " + daVenda.clientName);
  ok("o documento da venda e a mesma assinatura de oito caracteres do lancamento",
    daVenda.saleReference === venda.id.slice(0, 8).toUpperCase(), String(daVenda.saleReference));
  ok("o servidor marca como vencida a cobranca de ontem",
    daVenda.overdue === true, String(daVenda.overdue));
  ok("a cobranca de amanha nao esta vencida", avulsa.overdue === false);

  const duplicidade = await chame("POST", "/charges", {
    saleId: venda.id, title: "Segunda cobranca da mesma venda",
    amount: "10,00", dueDate: dia(4), method: "DINHEIRO",
  });
  ok("uma cobranca pendente por documento: a segunda e recusada (409)",
    duplicidade.status === 409, String(duplicidade.status));
  ok("a recusa diz o numero da cobranca que ja esta pendente",
    String(daVenda.message ?? duplicidade.dados.message ?? "").includes(String(daVenda.number)),
    String(duplicidade.dados.message ?? duplicidade.texto).slice(0, 90));

  const clienteErrado = await chame("POST", "/charges", {
    serviceOrderId: ordem.id, clientId: clientes["Padaria Aurora"].id,
    title: "Cliente trocado", amount: "10,00", dueDate: dia(4), method: "DINHEIRO",
  });
  ok("o cliente do documento manda: um cliente diferente e recusado (400)",
    clienteErrado.status === 400, String(clienteErrado.status));

  const daOrdem = (await chame("POST", "/charges", {
    serviceOrderId: ordem.id,
    title: T.daOrdem,
    amount: "180,00",
    dueDate: dia(3),
    method: "DINHEIRO",
  })).dados;
  ok("a cobranca de uma ordem de servico herda o cliente dela",
    daOrdem.clientName === "Oficina Serra Verde" && daOrdem.serviceOrderNumber === ordem.number,
    daOrdem.clientName + " · OS " + daOrdem.serviceOrderNumber);

  const daCorrida = (await chame("POST", "/charges", {
    clientId: clientes["Condominio Alvorada"].id,
    title: T.corrida,
    amount: "90,00",
    dueDate: dia(5),
    method: "PIX",
    pixKeyType: "EMAIL",
    pixKey: "financeiro@empresa.test",
  })).dados;

  // O "vencida" e filtro do servidor, nao da cabeca de quem olha a tela.
  const soVencidas = await chame("GET", "/charges?overdue=true&pageSize=50");
  ok("o filtro overdue=true devolve so vencidas pendentes",
    soVencidas.status === 200 && soVencidas.dados.data.length >= 1 &&
    soVencidas.dados.data.every((c) => c.overdue && c.status === "PENDING"),
    soVencidas.dados.data.map((c) => c.dueDateLabel).join(", "));

  // Pagar duas vezes, juntas: um dos dois perde, e o caixa fica com um lancamento.
  const corrida = await Promise.all([
    chame("POST", "/charges/" + daCorrida.id + "/pay", { paidMethod: "DINHEIRO" }),
    chame("POST", "/charges/" + daCorrida.id + "/pay", { paidMethod: "PIX" }),
  ]);
  const statusCorrida = corrida.map((r) => r.status).sort();
  ok("dois recebimentos simultaneios: um passa e o outro e recusado (200 + 409)",
    statusCorrida.join(",") === "200,409", statusCorrida.join(","));
  const depoisDaCorrida = (await chame("GET", "/charges/" + daCorrida.id)).dados;
  const lancamentosDaCorrida = await prisma.financeEntry.count({
    where: { companyId: empresa.id, description: descricaoDoLancamento(daCorrida.number, T.corrida) },
  });
  ok("a corrida gerou exatamente um lancamento de receita no caixa",
    depoisDaCorrida.status === "PAID" && !!depoisDaCorrida.financeEntryId &&
    lancamentosDaCorrida === 1, "lançamentos: " + String(lancamentosDaCorrida));

  const repagamento = await chame("POST", "/charges/" + daCorrida.id + "/pay", { paidMethod: "PIX" });
  ok("pagar de novo o que ja entrou e recusado (409)", repagamento.status === 409,
    String(repagamento.status));
  const cancelarPaga = await chame("POST", "/charges/" + daCorrida.id + "/cancel", { reason: "Teste" });
  ok("cancelar uma cobranca paga e recusado: o estorno nao existe aqui (409)",
    cancelarPaga.status === 409, String(cancelarPaga.status));
  const motivoVazio = await chame("POST", "/charges/" + daVenda.id + "/cancel", { reason: "   " });
  ok("cancelar sem motivo escrito e recusado (400)", motivoVazio.status === 400,
    String(motivoVazio.status));

  const resumo = (await chame("GET", "/charges/summary")).dados;
  const lista = await chame("GET", "/charges?page=1&pageSize=50");
  ok("resumo e lista concordam no total de cobranças",
    resumo.total === lista.dados.meta.total, resumo.total + " x " + lista.dados.meta.total);
  ok("ha trabalho suficiente na tela para os indicadores fazerem sentido",
    resumo.total >= 4 && resumo.pendingCount >= 2 && resumo.overdueCount >= 1 && resumo.paidCount >= 1,
    "total " + resumo.total + " · pendentes " + resumo.pendingCount +
    " · vencidas " + resumo.overdueCount + " · pagas " + resumo.paidCount);
  const numeros = [avulsa, daVenda, daOrdem, daCorrida].map((c) => c.number);
  ok("numeros sem repeticao", new Set(numeros).size === numeros.length, numeros.join(", "));

  // ---------- 3. a tela, com a sessao da dona ----------
  console.log("\n-- /app/cobrancas --");
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
        .some((a) => a.textContent.includes("Cobranças")));
    ok("o menu lateral tem \"Cobranças\"", noMenu);

    await vaPara(pagina, "/app/cobrancas");
    await pagina.waitForSelector(".nx-cb-tabela tbody tr", { timeout: 15000 });
    const titulo = await pagina.evaluate(() => document.querySelector(".page-title")?.textContent.trim());
    ok("a tela abre com o titulo do produto", titulo === "Cobranças", titulo);
    await espereTexto(pagina, "#" + avulsa.number);

    // 3.1 indicadores = resumo da API, lido agora
    const daApi = (await chame("GET", "/charges/summary")).dados;
    const kpiDaTela = await pagina.evaluate((dentroEspaco) => {
      const tira = (t) => t.replace(new RegExp(dentroEspaco, "g"), " ");
      const mapa = {};
      document.querySelectorAll(".kpi").forEach((k) => {
        const r = (k.querySelector(".kpi-label")?.textContent || "").trim();
        mapa[r] = tira(k.querySelector(".kpi-value")?.textContent || "").trim();
      });
      return mapa;
    }, NBSP.source);
    const esperados = [
      ["Pendentes", String(daApi.pendingCount)],
      ["Vencidas", String(daApi.overdueCount)],
      ["Pagas", String(daApi.paidCount)],
      ["Canceladas", String(daApi.cancelledCount)],
      ["Cobranças no total", String(daApi.total)],
    ];
    for (const [rotulo, valor] of esperados) {
      ok("o cartao \"" + rotulo + "\" mostra o numero da API (" + valor + ")",
        kpiDaTela[rotulo] === valor, String(kpiDaTela[rotulo]));
    }
    for (const rotulo of ["Em aberto", "Vencido em aberto", "Recebido no mês"]) {
      ok("o cartao \"" + rotulo + "\" sai em real com duas casas, nao em numero cru",
        /^R\$\s?[\d.]+,\d{2}$/.test(kpiDaTela[rotulo] || ""), String(kpiDaTela[rotulo]));
    }

    // 3.2 a linha como o balcao le
    const linhaAvulsa = await linhaDaCobranca(pagina, avulsa.number);
    ok("a cobranca traz numero, cliente, situacao e valor em portugues",
      !!linhaAvulsa && linhaAvulsa.cliente === "Padaria Aurora" &&
      linhaAvulsa.situacao === "Pendente" && linhaAvulsa.valor === "R$ 350,00",
      JSON.stringify(linhaAvulsa));
    ok("o vencimento na tabela e o dia da API escrito para o balcao ler",
      !!linhaAvulsa && linhaAvulsa.vencimento === diaLegivel(avulsa.dueDateLabel),
      linhaAvulsa && linhaAvulsa.vencimento);
    ok("cobranca avulsa se anuncia como avulsa, sem documento inventado",
      !!linhaAvulsa && linhaAvulsa.documento === "Avulsa", linhaAvulsa && linhaAvulsa.documento);
    const linhaVenda = await linhaDaCobranca(pagina, daVenda.number);
    ok("a cobranca da venda mostra a assinatura da venda e o selo de vencida",
      !!linhaVenda && linhaVenda.documento === "Venda " + daVenda.saleReference &&
      linhaVenda.selos.includes("Vencida"), JSON.stringify(linhaVenda && linhaVenda.selos));
    const linhaOrdem = await linhaDaCobranca(pagina, daOrdem.number);
    ok("a cobranca da ordem mostra o numero da OS, para conferir no balcao",
      !!linhaOrdem && linhaOrdem.documento === "OS " + ordem.number,
      linhaOrdem && linhaOrdem.documento);
    const vaza = await pagina.evaluate((dentroEspaco) => {
      const texto = document.body.textContent.replace(new RegExp(dentroEspaco, "g"), " ");
      const achado = texto.match(/(PENDING|PAID|CANCELLED|MANUAL|CARTAO|OUTRO)/);
      return {
        codigos: achado
          ? texto.slice(Math.max(0, achado.index - 60), achado.index + 60).replace(/\s+/g, " ")
          : null,
        uuid: /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i.test(texto),
        nativas: document.querySelectorAll("dialog").length,
      };
    }, NBSP.source);
    ok("nenhum codigo interno da API aparece para quem esta no balcao", vaza.codigos === null,
      String(vaza.codigos));
    ok("nenhum identificador de empresa ou registro aparece na tela", vaza.uuid === false);
    ok("nenhuma caixa nativa de dialogo no documento", vaza.nativas === 0, String(vaza.nativas));

    await semToast(pagina);
    await captura(pagina, "26-cobrancas-lista");

    // 3.3 registrar o recebimento pela tela — e o lancamento aparece no banco
    console.log("\n-- recebimento pela tela --");
    const lancamentosAntes = await prisma.financeEntry.count({ where: { companyId: empresa.id } });
    const linhaAntes = await linhaDaCobranca(pagina, daOrdem.number);
    ok("a linha pendente oferece pagar e cancelar",
      !!linhaAntes && linhaAntes.acoes.join(", ") === "Pagar, Cancelar",
      linhaAntes && linhaAntes.acoes.join(", "));
    await cliqueEmAcaoDaLinha(pagina, daOrdem.number, "Pagar");
    await aguardeDialogo(pagina, "Registrar pagamento");
    const corpoPagar = legivel(await textoDoDialogo(pagina));
    ok("o dialogo cita o valor a receber e o vencimento",
      corpoPagar.includes("R$ 180,00") && corpoPagar.includes(diaLegivel(daOrdem.dueDateLabel)),
      corpoPagar.replace(/\s+/g, " ").slice(0, 90));

    // O dia do recebimento e campo do dialogo, e o padrao dele e o dia da empresa
    // no fuso dela — nao o "hoje" do navegador, que em janela adiantada ja estaria
    // um dia a frente e seria recusado pela porta.
    const fusoEmpresa = empresa.timezone || "UTC";
    const hojeEmpresa = diaNoFuso(fusoEmpresa, new Date());
    const ontemEmpresa = diaNoFuso(fusoEmpresa, new Date(Date.now() - 86400000));
    const campoData = await pagina.evaluate(() => {
      const c = document.querySelector("#pg-data");
      return c ? { tipo: c.type, valor: c.value, teto: c.max } : null;
    });
    ok("o dialogo de recebimento pede a data, e nasce com o dia da empresa",
      !!campoData && campoData.tipo === "date" && campoData.valor === hojeEmpresa,
      JSON.stringify(campoData));
    ok("o teto do campo e o proprio dia: recebimento adiantado nao existe",
      !!campoData && campoData.teto === hojeEmpresa, campoData && campoData.teto);

    await semToast(pagina);
    await captura(pagina, "26-cobrancas-pagamento");

    // Balcao atende no dia e digita no seguinte: aqui a prova retroage um dia de
    // proposito, porque e assim que se separa o dia do dinheiro do dia da tela.
    await escrevaEm(pagina, "#pg-data", ontemEmpresa);
    await pagina.type("#pg-anotacao", "Retirada do caixa no dia seguinte", { delay: 2 });
    await cliqueEmBotao(pagina, "Confirmar recebimento", '[role="dialog"]', "confirmar o recebimento");
    await espereTexto(pagina, "Recebimento registrado.");
    await situacaoNaTela(pagina, daOrdem.number, "Paga");
    const linhaPagaTela = await linhaDaCobranca(pagina, daOrdem.number);
    ok("a linha paga mostra no recebimento a forma com que o dinheiro entrou",
      !!linhaPagaTela && linhaPagaTela.recebimento === "Dinheiro",
      linhaPagaTela && linhaPagaTela.recebimento);

    const paga = (await chame("GET", "/charges/" + daOrdem.id)).dados;
    const lancador = await prisma.financeEntry.findMany({ where: { companyId: empresa.id, id: paga.financeEntryId } });
    const contagem = await prisma.financeEntry.count({
      where: { companyId: empresa.id, description: descricaoDoLancamento(daOrdem.number, T.daOrdem) },
    });
    const depois = await prisma.financeEntry.count({ where: { companyId: empresa.id } });
    ok("o recebimento criou exatamente um lancamento de receita",
      contagem === 1 && depois === lancamentosAntes + 1, lancamentosAntes + " -> " + depois);
    ok("o lancamento e de entrada, paga, com o valor e o cliente da cobranca",
      lancador.length === 1 && lancador[0].type === "INCOME" && lancador[0].status === "PAID" &&
      Number(lancador[0].amount) === 180 && lancador[0].clientId === daOrdem.clientId,
      JSON.stringify(lancador[0] && {
        tipo: lancador[0].type, estado: lancador[0].status, valor: String(lancador[0].amount) }));
    ok("quem registrou o recebimento fica na cobranca",
      !!paga.paidByName && !!paga.paidAt, String(paga.paidByName));
    // O dia digitado na tela e o dia que o banco devolve, nas duas colunas. Se a
    // porta ignorasse `paidAt` e gravasse o relogio, esta linha acordaria vermelha.
    ok("o dia digitado na tela e o dia gravado na cobranca e no lancamento",
      !!paga.paidAt && diaNoFuso(fusoEmpresa, paga.paidAt) === ontemEmpresa &&
      !!lancador[0] && !!lancador[0].paidAt && diaNoFuso(fusoEmpresa, lancador[0].paidAt) === ontemEmpresa,
      "cobranca=" + (paga.paidAt || "-") + " lancamento=" + (lancador[0] && lancador[0].paidAt));
    ok("o retroagir o registro nao move o vencimento do lancamento",
      !!lancador[0] && lancador[0].dueDate.toISOString().slice(0, 10) === daOrdem.dueDateLabel,
      lancador[0] && lancador[0].dueDate.toISOString().slice(0, 10) + " vs " + daOrdem.dueDateLabel);
    const trilha = await prisma.auditLog.count({ where: { companyId: empresa.id, action: "charge.paid" } });
    ok("a trilha de auditoria registou o recebimento", trilha >= 1, String(trilha));

    // 3.4 o documento: chave PIX na pendente, recibo na paga, e saida em papel
    console.log("\n-- documento e recibo --");
    await cliqueEm(pagina, '.nx-cb-abrir[aria-label="Ver cobrança ' + avulsa.number + '"]');
    await pagina.waitForSelector('[role="dialog"] .nx-cb-doc', { timeout: 8000 });
    const documentoPendente = await pagina.evaluate((dentroEspaco) => {
      const d = document.querySelector('[role="dialog"]');
      return {
        texto: d.textContent.replace(new RegExp(dentroEspaco, "g"), " "),
        recibo: !!d.querySelector(".nx-cb-recibo"),
      };
    }, NBSP.source);
    ok("o documento da cobranca traz numero, cliente e a chave PIX para pagar",
      documentoPendente.texto.includes("Cobrança #" + avulsa.number) &&
      documentoPendente.texto.includes("Padaria Aurora") &&
      documentoPendente.texto.includes(CHAVE_CNPJ),
      documentoPendente.texto.replace(/\s+/g, " ").slice(0, 70));
    ok("cobranca pendente nao tem recibo: o papel de recebimento so existe quando entrou",
      documentoPendente.recibo === false);
    await cliqueEmBotao(pagina, "Fechar", '[role="dialog"]', "fechar o documento pendente");

    await cliqueEm(pagina, '.nx-cb-abrir[aria-label="Ver cobrança ' + daOrdem.number + '"]');
    await pagina.waitForSelector('[role="dialog"] .nx-cb-recibo', { timeout: 8000 });
    const recibo = await pagina.evaluate((dentroEspaco) => {
      const d = document.querySelector('[role="dialog"]');
      return {
        texto: d.textContent.replace(new RegExp(dentroEspaco, "g"), " "),
        situacao: (d.querySelector(".nx-cb-situacao")?.textContent || "").trim(),
      };
    }, NBSP.source);
    ok("o recibo diz quem recebeu, por qual forma e o valor recebido",
      recibo.texto.includes("Recibo de pagamento") && recibo.texto.includes("Dinheiro") &&
      recibo.texto.includes("R$ 180,00") && recibo.texto.includes("Retirada do caixa no dia seguinte"),
      recibo.texto.replace(/\s+/g, " ").slice(0, 70));
    ok("o recibo imprime o dia dito no recebimento, nao o dia em que a tela foi aberta",
      recibo.texto.includes(diaLegivel(ontemEmpresa)),
      "no papel le-se " + (recibo.texto.replace(/\s+/g, " ").match(/Recebido ems*\S+/) || ["SEM LINHA"])[0] + " | esperado " + diaLegivel(ontemEmpresa));
    ok("o documento da paga esta marcado como Paga em portugues",
      recibo.situacao.includes("Paga"), recibo.situacao);
    await cliqueEmBotao(pagina, "Imprimir", '[role="dialog"]', "mandar o recibo para a impressora");
    const impressoes = await pagina.evaluate(() => window.__impressoes);
    ok("a saida em papel chama window.print uma vez", impressoes === 1, String(impressoes));
    ok("a pagina continua viva depois de mandar para a impressora",
      await pagina.evaluate(() => !!document.querySelector('[role="dialog"] .nx-cb-doc')));
    await semToast(pagina);
    await captura(pagina, "26-cobrancas-documento");
    await cliqueEmBotao(pagina, "Fechar", '[role="dialog"]', "fechar o recibo");

    // 3.5 cancelar pela tela: sem motivo nada sai, com motivo a linha muda
    console.log("\n-- cancelamento com motivo --");
    await cliqueEmAcaoDaLinha(pagina, avulsa.number, "Cancelar");
    await aguardeDialogo(pagina, "Cancelar cobrança");
    await cliqueEmBotao(pagina, "Cancelar cobrança", '[role="dialog"]', "tentar cancelar sem motivo");
    await espereTexto(pagina, "Diga o motivo do cancelamento.");
    const aindaPendente = await linhaDaCobranca(pagina, avulsa.number);
    ok("sem motivo a cobranca continua pendente, e nada foi enviado",
      !!aindaPendente && aindaPendente.situacao === "Pendente", aindaPendente && aindaPendente.situacao);
    await pagina.type("#cx-motivo", "Cliente desistiu do orcamento", { delay: 2 });
    await cliqueEmBotao(pagina, "Cancelar cobrança", '[role="dialog"]', "confirmar o cancelamento");
    await espereTexto(pagina, "Cobrança cancelada.");
    await situacaoNaTela(pagina, avulsa.number, "Cancelada");
    const cancelada = (await chame("GET", "/charges/" + avulsa.id)).dados;
    ok("o cancelamento guarda motivo, data e quem cancelou",
      cancelada.cancelReason === "Cliente desistiu do orcamento" &&
      !!cancelada.cancelledAt && !!cancelada.cancelledByName, String(cancelada.cancelReason));
    ok("a cancelada nao deixa caminho nenhum na linha",
      (await linhaDaCobranca(pagina, avulsa.number)).acoes.length === 0);
    await cliqueEm(pagina, '.nx-cb-abrir[aria-label="Ver cobrança ' + avulsa.number + '"]');
    await pagina.waitForSelector('[role="dialog"] .nx-cb-doc', { timeout: 8000 });
    await pagina.waitForFunction(() => {
      const d = document.querySelector('[role="dialog"]');
      return !!d && /Cancelada/.test(d.textContent);
    }, { timeout: 8000, polling: 150 }).catch(() => {});
    const abertos = await pagina.evaluate(() => document.querySelectorAll('[role="dialog"]').length);
    // O motivo e lido no proprio paragrafo que a pagina escreve, e nao no texto
    // agregado do dialogo: o agregado junta cabecalho, tabela, rodape e botoes, e
    // ai uma palavra solta de outro bloco passa por motivo que nao e.
    const documentoCancelada = await pagina.evaluate((dentroEspaco) => {
      const d = document.querySelector('[role="dialog"]');
      if (!d) return { alvos: -1, motivo: "SEM DIALOGO", situacao: "", documento: "" };
      const limpar = (t) => String(t).replace(new RegExp(dentroEspaco, "g"), " ").trim();
      const motivos = [...d.querySelectorAll(".nx-cb-motivo")];
      return {
        alvos: motivos.length,
        motivo: motivos.map((p) => limpar(p.textContent)).join(" | "),
        situacao: limpar((d.querySelector(".nx-cb-situacao") || {}).textContent || ""),
        documento: limpar((d.querySelector(".nx-cb-doc-cabeca") || {}).textContent || ""),
      };
    }, NBSP.source);
    ok("um unico dialogo aberto sobre o documento da cancelada", abertos === 1, String(abertos));
    ok("o documento da cancelada diz por que ela saiu do carne",
      documentoCancelada.motivo.includes("Cliente desistiu do orcamento"),
      "alvos=" + documentoCancelada.alvos + " motivo=[" + documentoCancelada.motivo +
      "] situacao=[" + documentoCancelada.situacao + "] doc=[" + documentoCancelada.documento + "]");
    await cliqueEmBotao(pagina, "Fechar", '[role="dialog"]', "fechar o documento da cancelada");

    // 3.6 filtro, busca e ordenacao no servidor
    console.log("\n-- filtro, busca e ordenacao --");
    await pagina.evaluate(() => {
      const sel = document.querySelector('[aria-label="Filtrar por vencimento"]');
      sel.value = "true";
      sel.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await pagina.waitForFunction(() => {
      const linhas = [...document.querySelectorAll(".nx-cb-tabela tbody tr")];
      return linhas.length > 0 && linhas.every((l) => l.innerText.includes("Vencida"));
    }, { timeout: 8000 }).catch(() => {});
    const filtradas = await pagina.evaluate(() =>
      [...document.querySelectorAll(".nx-cb-tabela tbody tr")].map((t) =>
        [...t.querySelectorAll(".status-pill")].map((p) => p.textContent.trim()).join("/")));
    ok("o filtro de vencimento deixa so quem esta vencida",
      filtradas.length >= 1 && filtradas.every((t) => t.includes("Vencida")), filtradas.join(" | "));

    await pagina.evaluate(() => {
      const sel = document.querySelector('[aria-label="Filtrar por vencimento"]');
      sel.value = "";
      sel.dispatchEvent(new Event("change", { bubbles: true }));
      const sit = document.querySelector('[aria-label="Filtrar por situação"]');
      sit.value = "PAID";
      sit.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await pagina.waitForFunction(() => {
      const linhas = [...document.querySelectorAll(".nx-cb-tabela tbody tr")];
      return linhas.length > 0 && linhas.every((l) => l.innerText.includes("Paga"));
    }, { timeout: 8000 }).catch(() => {});
    const pagas = await pagina.evaluate(() =>
      [...document.querySelectorAll(".nx-cb-tabela tbody tr")].map((t) =>
        (t.querySelector(".status-pill")?.textContent || "").trim()));
    ok("o filtro de situacao deixa so pagas",
      pagas.length >= 1 && pagas.every((t) => t === "Paga"), pagas.join(" | "));

    await pagina.evaluate(() => {
      const sel = document.querySelector('[aria-label="Filtrar por situação"]');
      sel.value = "";
      sel.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await espera(800);
    await pagina.type('[aria-label="Buscar cobranças"]', "Serra Verde", { delay: 40 });
    await pagina.waitForFunction(() => {
      const linhas = [...document.querySelectorAll(".nx-cb-tabela tbody tr")];
      return linhas.length === 1 && linhas[0].innerText.includes("Oficina Serra Verde");
    }, { timeout: 8000 }).catch(() => {});
    const buscadas = await pagina.evaluate(() =>
      [...document.querySelectorAll(".nx-cb-tabela tbody tr")].map((t) =>
        t.innerText.replace(/\s+/g, " ").slice(0, 60)));
    ok("a busca pelo nome do cliente acha a cobranca dele",
      buscadas.length === 1 && buscadas[0].includes("Oficina Serra Verde"), buscadas.join(" | "));

    await escrevaEm(pagina, '[aria-label="Buscar cobranças"]', "");
    await pagina.waitForFunction(() => {
      const campo = document.querySelector('[aria-label="Buscar cobranças"]');
      const linhas = document.querySelectorAll(".nx-cb-tabela tbody tr");
      return !!campo && campo.value === "" && linhas.length > 1;
    }, { timeout: 10000 }).catch(() => {});
    await pagina.evaluate(() => {
      const sel = document.querySelector('[aria-label="Ordenar por"]');
      sel.value = "amount";
      sel.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await espera(900);
    const valores = await pagina.evaluate(() =>
      [...document.querySelectorAll(".nx-cb-tabela tbody tr")].map((t) =>
        Number((t.querySelectorAll("td")[4]?.textContent || "").replace(/[^\d,]/g, "").replace(",", "."))));
    ok("ordenar pelo valor coloca a lista em ordem decrescente",
      valores.length > 1 && valores.every((v, i) => i === 0 || valores[i - 1] >= v), valores.join(" > "));

    await pagina.evaluate(() => {
      const sel = document.querySelector('[aria-label="Ordenar por"]');
      sel.value = "createdAt";
      sel.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await espera(900);
    const nota = await pagina.evaluate((dentroEspaco) => {
      const el = document.querySelector(".toolbar-note");
      return el ? el.textContent.replace(new RegExp(dentroEspaco, "g"), " ").trim() : "";
    }, NBSP.source);
    ok("o rodape da barra conta as cobrancas do recorte",
      /\d+ (cobrança|cobranças)$/.test(String(nota)), nota);
    // Nove colunas e dois botoes por linha: a tabela do carne respira mais
    // apertada que as irmas para caber na janela de trabalho.
    const folga = await pagina.evaluate(() => {
      const role = document.querySelector(".nx-cb-scroll");
      const tabela = document.querySelector(".nx-cb-tabela");
      return { visivel: role.clientWidth, precisa: tabela.scrollWidth };
    });
    ok("a janela de 1440 mostra a tabela inteira, com a coluna de acoes",
      folga.precisa <= folga.visivel, folga.precisa + " x " + folga.visivel);

    // 3.7 gateways: o catalogo diz o que nao existe, e so o MANUAL tem formulario
    console.log("\n-- gateways --");
    await cliqueEmAba(pagina, "Gateways", "abrir a aba de gateways");
    await pagina.waitForSelector(".nx-gw-card", { timeout: 8000 });
    const cartoes = await pagina.evaluate(() => {
      const todos = [...document.querySelectorAll(".nx-gw-card")];
      return {
        total: todos.length,
        rotulos: todos.map((c) => (c.querySelector(".nx-gw-titulo")?.textContent || "").trim()),
        off: todos.filter((c) => c.classList.contains("nx-gw-card--off")).map((c) => ({
          rotulo: (c.querySelector(".nx-gw-titulo")?.textContent || "").trim(),
          motivo: (c.querySelector(".nx-gw-motivo")?.textContent || "").trim(),
          campos: c.querySelectorAll("input, textarea, select").length,
        })),
        onCampos: [...document.querySelectorAll(".nx-gw-card:not(.nx-gw-card--off)")]
          .flatMap((c) => [...c.querySelectorAll("input, textarea, select")]
            .map((i) => (i.closest(".field")?.querySelector(".field-label")?.textContent || "").trim())),
      };
    });
    ok("o catalogo mostra os quatro provedores, um por cartao", cartoes.total === 4,
      cartoes.rotulos.join(" | "));
    ok("os tres provedores sem integracao explicam o motivo em vez de abrir formulario",
      cartoes.off.length === 3 && cartoes.off.every((c) => c.campos === 0 && c.motivo.length > 10),
      cartoes.off.map((c) => c.rotulo).join(", "));
    ok("nenhum dos tres oferece um texto de espera no lugar do motivo",
      cartoes.off.every((c) => !/em breve/i.test(c.motivo)),
      cartoes.off[0] && cartoes.off[0].motivo.slice(0, 70));
    ok("o cartao do MANUAL tem os campos de exibicao e nenhum campo de credencial",
      cartoes.onCampos.length >= 6 &&
      !cartoes.onCampos.some((r) => /token|secret|chave p[uú]blica|webhook/i.test(r)),
      cartoes.onCampos.join(" | "));

    await escrevaEm(pagina, "#gw-apelido", "PIX da loja");
    await escrevaEm(pagina, "#gw-chave", CHAVE_CNPJ);
    await escrevaEm(pagina, "#gw-benef", "Demonstracao Ficticia");
    await escrevaEm(pagina, "#gw-dias", "7");
    await escrevaEm(pagina, "#gw-instrucoes", "Pagamento na hora, no caixa da loja");
    await semToast(pagina);
    await captura(pagina, "26-cobrancas-gateways");
    await cliqueEmBotao(pagina, "Salvar configuração", ".nx-gw-card:not(.nx-gw-card--off)",
      "salvar o recebimento");
    await espereTexto(pagina, "Configuração de recebimento salva.");
    const gatewayNoBanco = await prisma.paymentGateway.findFirst({
      where: { companyId: empresa.id, provider: "MANUAL", environment: "PRODUCTION" },
    });
    const ajustes = (gatewayNoBanco && gatewayNoBanco.chargeSettings) || {};
    ok("o MANUAL grava a chave PIX de exibicao e o vencimento padrao",
      !!gatewayNoBanco && ajustes.pixKey === CHAVE_CNPJ && ajustes.defaultDueDays === 7,
      JSON.stringify(ajustes).slice(0, 90));
    ok("nenhuma coluna de credencial deixou de ser nula",
      !!gatewayNoBanco && gatewayNoBanco.publicKey === null &&
      gatewayNoBanco.credentialCipher === null && gatewayNoBanco.webhookCipher === null);
    const linhaGateway = await pagina.evaluate(() => {
      const c = document.querySelector(".nx-gw-card:not(.nx-gw-card--off)");
      return {
        situacao: (c.querySelector(".nx-gw-situacao")?.textContent || "").trim(),
        chave: c.querySelector("#gw-chave")?.value || "",
      };
    });
    ok("depois de salvar, o cartao se anuncia como configurado com a chave que voltou do servidor",
      linhaGateway.situacao === "Configurado" && linhaGateway.chave === CHAVE_CNPJ,
      linhaGateway.situacao + " · " + linhaGateway.chave);

    // 3.8 abrir uma cobranca pela tela, com o recebimento ja cadastrado
    console.log("\n-- nova cobranca pela tela --");
    await cliqueEmAba(pagina, "Nova cobrança", "abrir a aba de nova cobranca");
    await pagina.waitForSelector("#cb-cliente", { timeout: 8000 });
    await pagina.waitForFunction(() => {
      const s = document.querySelector("#cb-cliente");
      return !!s && s.options.length > 1;
    }, { timeout: 10000 });
    const chaveSugerida = await pagina.evaluate(() => document.querySelector("#cb-chave")?.value || "");
    ok("a chave PIX cadastrada no recebimento entra no formulario sozinha",
      chaveSugerida === CHAVE_CNPJ, chaveSugerida);
    const vencimentoSugerido = await pagina.evaluate(() => document.querySelector("#cb-vencimento")?.value || "");
    ok("o vencimento padrao do recebimento sugere o dia sete dias a frente",
      vencimentoSugerido === dia(7), vencimentoSugerido);

    await pagina.select("#cb-cliente", clientes["Padaria Aurora"].id);
    await pagina.type("#cb-titulo", T.pelaTela, { delay: 3 });
    await pagina.type("#cb-valor", "1.290,50", { delay: 3 });
    await escrevaEm(pagina, "#cb-vencimento", dia(10));
    const previa = await pagina.evaluate((dentroEspaco) => {
      const nota = [...document.querySelectorAll(".nx-tabpanel .toolbar-note")][0];
      return nota ? nota.textContent.replace(new RegExp(dentroEspaco, "g"), " ") : "";
    }, NBSP.source);
    ok("o formulario le o valor brasileiro digitado como mil duzentos e noventa reais e cinquenta centavos",
      previa.includes("1.290,50"), previa);
    await semToast(pagina);
    await captura(pagina, "26-cobrancas-formulario");

    await cliqueEmBotao(pagina, "Registrar cobrança", ".nx-tabpanel", "registrar a cobranca");
    await espereTexto(pagina, "Cobrança registrada.");
    await pagina.waitForSelector(".nx-cb-tabela tbody tr", { timeout: 10000 });
    await espera(900);
    const linhaNova = await pagina.evaluate((t, dentroEspaco) => {
      const limpar = (x) => x.replace(new RegExp(dentroEspaco, "g"), " ");
      const tr = [...document.querySelectorAll(".nx-cb-tabela tbody tr")].find((x) => x.innerText.includes(t));
      if (!tr) return null;
      const cel = [...tr.querySelectorAll("td")].map((c) => limpar(c.innerText).trim());
      return { numero: cel[0], cliente: cel[1], valor: cel[4], vencimento: cel[5], situacao: cel[7] };
    }, T.pelaTela, NBSP.source);
    ok("a cobranca aberta pela tela entrou na lista", !!linhaNova, JSON.stringify(linhaNova));
    ok("ela voltou com o centavo que o servidor guardou (R$ 1.290,50)",
      !!linhaNova && linhaNova.valor === "R$ 1.290,50", linhaNova && linhaNova.valor);
    ok("o dia escolhido no campo de calendario e o mesmo que a tela mostra",
      !!linhaNova && linhaNova.vencimento === diaLegivel(dia(10)), linhaNova && linhaNova.vencimento);
    const novaNumero = linhaNova ? Number(String(linhaNova.numero).replace("#", "")) : 0;
    const novaNoBanco = await prisma.charge.findFirst({
      where: { companyId: empresa.id, number: novaNumero },
      select: { id: true, amount: true, financeEntryId: true, status: true, provider: true },
    });
    ok("abrir cobranca nao lanca nada no caixa: a receita so nasce no recebimento",
      !!novaNoBanco && novaNoBanco.financeEntryId === null && novaNoBanco.status === "PENDING" &&
      Math.round(Number(novaNoBanco.amount) * 100) === 129050,
      novaNoBanco && JSON.stringify({
        lancamento: novaNoBanco.financeEntryId,
        estado: novaNoBanco.status,
        centavos: Math.round(Number(novaNoBanco.amount) * 100),
      }));

    // 3.9 as duas pontas que trazem venda e ordem para dentro do carnê
    console.log("\n-- gerar cobranca a partir da venda e da ordem --");
    await vaPara(pagina, "/app/ordens-de-servico");
    await pagina.waitForSelector(".nx-os-tabela tbody tr", { timeout: 15000 });
    await cliqueEm(pagina, '.nx-os-abrir[aria-label="Ver ordem ' + ordem.number + '"]');
    await pagina.waitForSelector('[role="dialog"] .nx-os-doc', { timeout: 8000 });
    const botaoNaOrdem = await pagina.evaluate(() => {
      const b = [...document.querySelectorAll('[role="dialog"] button')]
        .find((x) => x.textContent.trim() === "Gerar cobrança");
      if (!b) return "ausente";
      b.click();
      return "clicado";
    });
    ok("o documento da ordem oferece \"Gerar cobrança\"", botaoNaOrdem === "clicado", botaoNaOrdem);
    // A lista de documentos e a leitura do valor chegam pela rede, depois do
    // clique: esperar o campo preencher e a unica forma de provar que a cobranca
    // nasceu do documento, e nao de um formulario em branco aberto na aba certa.
    const ordemPreenchida = await pagina
      .waitForFunction((idOrdem) => {
        const campo = document.querySelector("#cb-os");
        const nota = document.querySelector(".nx-cb-vinculo-nota");
        return !!campo && campo.value === idOrdem && !!nota && nota.innerText.trim() !== "";
      }, { timeout: 15000, polling: 150 }, ordem.id)
      .then(() => true)
      .catch(() => false);
    ok("o formulario espera a ordem chegar da rede antes de mostrar o total", ordemPreenchida);
    const vindaDaOrdem = await pagina.evaluate(() => ({
      caminho: window.location.pathname + window.location.search,
      vinculo: document.querySelector("#cb-vinculo")?.value || "",
      ordem: document.querySelector("#cb-os")?.value || "",
      valor: document.querySelector("#cb-valor")?.value || "",
      nota: (document.querySelector(".nx-cb-vinculo-nota")?.textContent || "").replace(/\s+/g, " ").trim(),
    }));
    ok("a tela do carne abre no formulario com a ordem ja escolhida",
      vindaDaOrdem.caminho.startsWith("/app/cobrancas?os=") &&
      vindaDaOrdem.vinculo === "OS" && vindaDaOrdem.ordem === ordem.id,
      vindaDaOrdem.caminho.slice(0, 44));
    ok("o valor da cobranca vem do documento, lido na fonte",
      vindaDaOrdem.valor === "180", vindaDaOrdem.valor);
    ok("a nota do documento diz a OS e o cliente dela",
      vindaDaOrdem.nota.includes("OS " + ordem.number) &&
      vindaDaOrdem.nota.includes("Oficina Serra Verde"), vindaDaOrdem.nota.slice(0, 80));

    await vaPara(pagina, "/app/vendas");
    await pagina.waitForSelector("table tbody tr", { timeout: 15000 });
    const abriuDetalheVenda = await pagina.evaluate((nomeCliente) => {
      const tr = [...document.querySelectorAll("table tbody tr")].find((t) => t.innerText.includes(nomeCliente));
      if (!tr) return "linha ausente";
      const b = tr.querySelector("button");
      if (!b) return "botao ausente";
      b.click();
      return "clicado";
    }, "Condominio Alvorada");
    ok("a venda de apoio abre o detalhe", abriuDetalheVenda === "clicado", abriuDetalheVenda);
    await pagina.waitForSelector('[role="dialog"]', { timeout: 8000 }).catch(() => {});
    const botaoNaVenda = await pagina.evaluate(() => {
      const b = [...document.querySelectorAll('[role="dialog"] button')]
        .find((x) => x.textContent.trim() === "Gerar cobrança");
      if (!b) return "ausente";
      b.click();
      return "clicado";
    });
    ok("o detalhe da venda oferece \"Gerar cobrança\"", botaoNaVenda === "clicado", botaoNaVenda);
    const vendaPreenchida = await pagina
      .waitForFunction((idVenda) => {
        const campo = document.querySelector("#cb-venda");
        const valor = document.querySelector("#cb-valor");
        return !!campo && campo.value === idVenda && !!valor && valor.value !== "";
      }, { timeout: 15000, polling: 150 }, venda.id)
      .then(() => true)
      .catch(() => false);
    ok("o formulario espera a venda chegar da rede antes de mostrar o total", vendaPreenchida);
    const vindaDaVenda = await pagina.evaluate(() => ({
      caminho: window.location.pathname,
      vinculo: document.querySelector("#cb-vinculo")?.value || "",
      venda: document.querySelector("#cb-venda")?.value || "",
      valor: document.querySelector("#cb-valor")?.value || "",
    }));
    ok("a cobranca nasce com a venda escolhida e o total dela",
      vindaDaVenda.caminho === "/app/cobrancas" && vindaDaVenda.vinculo === "VENDA" &&
      vindaDaVenda.venda === venda.id && vindaDaVenda.valor === "250",
      vindaDaVenda.vinculo + " · " + vindaDaVenda.valor);

    // 3.10 tema claro e a tabela virando cartao no celular
    console.log("\n-- tema e celular --");
    await vaPara(pagina, "/app/cobrancas");
    await pagina.waitForSelector(".nx-cb-tabela tbody tr", { timeout: 15000 });
    const claroAntes = await pagina.evaluate(() => document.documentElement.getAttribute("data-theme"));
    await pagina.click(".theme-switch");
    await espera(600);
    const claro = await pagina.evaluate(() => document.documentElement.getAttribute("data-theme"));
    ok("a tela obedece ao alternador de tema", claro !== claroAntes && claro === "light",
      claroAntes + " -> " + claro);
    await semToast(pagina);
    await captura(pagina, "26-cobrancas-claro");
    await pagina.click(".theme-switch");
    await espera(400);
    await pagina.setViewport({ width: 390, height: 844 });
    await espera(600);
    const virouCartao = await pagina.evaluate(() => {
      const td = document.querySelector(".nx-cb-tabela tbody td");
      if (!td) return "sem linha";
      const rotulo = getComputedStyle(td, "::before").content;
      return rotulo && rotulo !== "none";
    });
    ok("no celular a tabela vira cartao com o rotulo em cada campo", virouCartao === true,
      String(virouCartao));
    await pagina.evaluate(() => document.querySelector(".nx-cb-tabela tbody tr")
      ?.scrollIntoView({ block: "center" }));
    await espera(500);
    await semToast(pagina);
    await captura(pagina, "26-cobrancas-celular");
    await pagina.setViewport({ width: 1440, height: 900 });

    // ---------- 4. quem nao tem a escrita ----------
    console.log("\n-- sessao do atendente --");
    atendente = await criarAtendente(empresa.id);
    const loginStaff = await chame("POST", "/auth/login",
      { email: atendente.email, password: atendente.senha }, false);
    ok("o atendente de prova entrou na mesma empresa", loginStaff.status === 200,
      String(loginStaff.status));
    const tokenStaff = loginStaff.dados.accessToken;

    const criaStaff = await comoToken(tokenStaff, "POST", "/charges", {
      clientId: clientes["Padaria Aurora"].id, title: "Cobranca do atendente",
      amount: "10,00", dueDate: dia(2), method: "DINHEIRO",
    });
    ok("a API recusa a criacao pelo atendente (403)", criaStaff.status === 403, String(criaStaff.status));
    const pagaStaff = await comoToken(tokenStaff, "POST",
      "/charges/" + (novaNoBanco ? novaNoBanco.id : "x") + "/pay", {});
    ok("registrar recebimento nao e do atendente (403)", pagaStaff.status === 403,
      String(pagaStaff.status));
    const configStaff = await comoToken(tokenStaff, "PUT", "/gateways/manual", {
      environment: "PRODUCTION", pixKey: CHAVE_CNPJ,
    });
    ok("trocar a chave PIX da empresa nao e do atendente (403)", configStaff.status === 403,
      String(configStaff.status));
    const leStaff = await comoToken(tokenStaff, "GET", "/charges?pageSize=5", undefined);
    ok("e o atendente pode ler o carne, porque ninguem atende sem saber o que o cliente deve",
      leStaff.status === 200, String(leStaff.status));

    const paginaStaff = await browser.newPage();
    await paginaStaff.setViewport({ width: 1440, height: 900 });
    await prepareJanela(paginaStaff);
    await entrarNoPainel(paginaStaff, atendente.email, atendente.senha);
    await vaPara(paginaStaff, "/app/cobrancas");
    await paginaStaff.waitForSelector(".nx-cb-tabela tbody tr", { timeout: 15000 });
    const abasStaff = await paginaStaff.evaluate(() =>
      [...document.querySelectorAll('[role="tab"]')].map((b) => b.textContent.trim()));
    ok("o atendente ve as cobrancas mas nao a aba de criacao",
      abasStaff.includes("Cobranças") && !abasStaff.includes("Nova cobrança"), abasStaff.join(" | "));
    ok("ele tambem nao ve a aba de gateways", !abasStaff.includes("Gateways"), abasStaff.join(" | "));
    const acoesStaff = await paginaStaff.evaluate(() =>
      [...document.querySelectorAll(".nx-cb-tabela tbody .row-actions button")].map((b) => b.textContent.trim()));
    ok("na lista dele nao ha botao de mexer no dinheiro", acoesStaff.length === 0, acoesStaff.join(", "));
    const chamouFormulario = await paginaStaff.evaluate(() =>
      performance.getEntriesByType("resource").some((r) =>
        /\/(clients|sales|service-orders|gateways)(\?|$)/.test(r.name)));
    ok("sem escrita a tela nem bate nas portas do formulario ou do gateway",
      chamouFormulario === false);
    const viuCredencial = await paginaStaff.evaluate(() =>
      /token|secret|webhook/i.test(document.body.innerText));
    ok("a palavra credencial nao aparece para quem nao configura o recebimento",
      viuCredencial === false);
    ok("nenhuma caixa nativa na sessao do atendente",
      (await paginaStaff.evaluate(() => window.__nativas.length)) === 0);
    await captura(paginaStaff, "26-cobrancas-atendente");

    ok("nenhum erro de console ou de pagina durante a prova",
      erros.length === 0, erros.slice(0, 2).join(" | "));
  } finally {
    await browser.close().catch(() => {});
    // A corrida devolve o banco como o encontrou. Sem isto, a ordem de servico de
    // apoio fica na empresa e a prova vizinha — a das ordens de servico, que busca
    // um cliente pelo nome e espera uma linha so — acorda achando duas.
    if (prisma && empresa) {
      await limparCorridaAnterior(empresa.id);
      console.log("  [banco] corrida desfeita: cobrancas, lancamentos e documentos de apoio apagados");
    }
    if (prisma && atendente) {
      await prisma.companyUser.deleteMany({ where: { userId: atendente.id } });
      await prisma.auditLog.deleteMany({ where: { userId: atendente.id } });
      await prisma.user.deleteMany({ where: { id: atendente.id } });
      console.log("\n  [banco] atendente de prova apagado");
    }
    if (prisma) await prisma.$disconnect();
  }

  console.log("\n" + checks + " verificacoes, " + falhas.length + " falha(s)");
  if (falhas.length) {
    falhas.forEach((f) => console.log(" - " + f));
    process.exit(1);
  }
  console.log("PROVA OK: Cobrancas funcionam no navegador, com caixa, vencimento e permissao conferidos no banco");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
