// Prova da Fase 3e no navegador: o parcelamento que a API já faz e a tela que
// precisava dele. A venda é montada na aba "Nova Venda" com o preço digitado no
// formato brasileiro cheio ("1.290,50") — exatamente o texto que o parser antigo
// do painel cortava em R$ 1,29 —, sai da tela com três parcelas, é confirmada, e
// os três lançamentos aparecem no Financeiro fechando a conta em centavo. No fim
// a venda é cancelada: o que o sistema gerou e ninguém pagou some do financeiro e
// o estoque volta. A compra repete o ciclo com a segunda chave.
//
// Nada disso toca a empresa do administrador: a prova cria empresa e dono próprios
// no banco, faz o caminho inteiro por dentro da tela e apaga a empresa no fim, na
// ordem filho → pai, igual ao cleanup dos testes de API.
const puppeteer = require("puppeteer-core");
const path = require("path");

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const BASE = process.env.NEXUS_WEB || "http://localhost:5173";
const API = (process.env.NEXUS_API || "http://localhost:3001") + "/api";
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

let token = "";
async function chame(metodo, caminho, corpo) {
  const res = await fetch(API + caminho, {
    method: metodo,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: "Bearer " + token } : {}),
    },
    body: corpo === undefined ? undefined : JSON.stringify(corpo),
  });
  const texto = await res.text();
  let dados;
  try { dados = JSON.parse(texto); } catch { dados = { texto }; }
  return { status: res.status, dados };
}

// ------------------------------------------------------------------ peça de tela
/** Digita num campo controlado pelo React: o setter nativo + o evento input. */
async function digitar(pagina, seletor, texto) {
  const achado = await pagina.evaluate((s, valor) => {
    const el = document.querySelector(s);
    if (!el) return false;
    const proto = el instanceof HTMLTextAreaElement
      ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, "value").set.call(el, valor);
    el.dispatchEvent(new Event("input", { bubbles: true }));
    return true;
  }, seletor, texto);
  await espera(180);
  return achado;
}

/** Escolhe numa select pelo VALUE (o texto da opção é só o que a pessoa lê). */
async function escolher(pagina, seletor, valor) {
  const achado = await pagina.evaluate((s, v) => {
    const el = document.querySelector(s);
    if (!el) return false;
    Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, "value").set.call(el, v);
    el.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  }, seletor, valor);
  await espera(180);
  return achado;
}

/** A lista do select já chegou do servidor? Sem isso, escolher cai no vazio. */
async function esperarOpcao(pagina, seletor, valor) {
  return pagina
    .waitForFunction((s, v) => [...(document.querySelector(s)?.options || [])].some((o) => o.value === v),
      { timeout: 15000 }, seletor, valor)
    .then(() => true)
    .catch(() => false);
}

const textoDe = (pagina, seletor) =>
  pagina.evaluate((s) => document.querySelector(s)?.textContent.trim() ?? null, seletor);

/** O <span class="mono"> da linha de item: pai do campo de preço. */
const totalDaLinha = (pagina, seletorDoPreco) => pagina.evaluate((s) => {
  const el = document.querySelector(s);
  return el ? (el.parentElement.querySelector(".mono")?.textContent.trim() ?? null) : null;
}, seletorDoPreco);

const notaDoCampo = (pagina, seletor) => pagina.evaluate((s) =>
  document.querySelector(s)?.closest(".field")?.querySelector(".form-note")?.textContent.trim() ?? null, seletor);

async function avisoDe(pagina, trecho) {
  const visto = await pagina
    .waitForFunction((t) => [...document.querySelectorAll(".toast-message")]
      .some((m) => (m.textContent || "").includes(t)), { timeout: 15000 }, trecho)
    .then(() => true).catch(() => false);
  const vistos = visto ? [] : await pagina.evaluate(() =>
    [...document.querySelectorAll(".toast-message")].map((m) => (m.textContent || "").trim()));
  ok("a tela avisa: " + trecho, visto, visto ? undefined : "avisos na tela: " + JSON.stringify(vistos));
  await semToast(pagina);
}

async function semToast(pagina) {
  await pagina.waitForFunction(() => !document.querySelector(".toast-message, .toast"), { timeout: 15000 }).catch(() => {});
  await espera(250);
}

async function foto(pagina, nome) {
  await pagina.screenshot({ path: SHOTS + "/" + nome + ".png" });
  console.log("  [foto] " + nome + ".png");
}

/** Botão pelo começo do texto, dentro de um recorte (sem recorte, a página). */
async function clicarPorTexto(pagina, seletorPai, texto) {
  const clicado = await pagina.evaluate((pai, t) => {
    const raiz = pai ? document.querySelector(pai) : document;
    const b = [...(raiz?.querySelectorAll("button") || [])].find((x) => (x.textContent || "").trim().startsWith(t));
    if (!b) return false;
    b.click();
    return true;
  }, seletorPai, texto);
  await espera(320);
  return clicado;
}

/** O "sim" do modal de confirmar ação (confirmAction). */
async function confirmarAcao(pagina) {
  await pagina.waitForSelector(".nx-modal-overlay .nx-confirm-texto", { timeout: 8000 }).catch(() => {});
  const clicado = await pagina.evaluate(() => {
    const b = document.querySelector(".nx-modal-overlay .nx-modal-actions .btn:last-child");
    if (!b) return false;
    b.click();
    return true;
  });
  await pagina.waitForFunction(() => !document.querySelector(".nx-modal-overlay"), { timeout: 8000 }).catch(() => {});
  await espera(500);
  return clicado;
}

const linhasDaTabela = (pagina) => pagina.evaluate(() =>
  [...document.querySelectorAll(".card-surface.table-wrap .table tbody tr")].map((tr) =>
    [...tr.querySelectorAll("td")].map((td) => td.textContent.trim())));

async function entrarNoPainel(pagina, email, senha) {
  await pagina.goto(BASE + "/login", { waitUntil: "networkidle0" });
  await pagina.waitForSelector("input[type=email]");
  await pagina.type("input[type=email]", email);
  await pagina.type("input[type=password]", senha);
  await Promise.all([
    pagina.waitForFunction(() => window.location.pathname.startsWith("/app"), { timeout: 15000 }),
    pagina.click("button[type=submit]"),
  ]);
  await semToast(pagina);
}

// ------------------------------------------------------------------------ banco
let prisma = null;
async function abrirBanco() {
  require("dotenv").config({ path: path.join(__dirname, "..", "apps", "api", ".env") });
  const { PrismaClient } = require("@prisma/client");
  prisma = new PrismaClient();
}

let contador = 0;
const uid = (p) => p + "-" + Date.now() + "-" + (++contador) + "-" + Math.floor(Math.random() * 1e6);

/** Empresa + dono de prova, direto no banco (a mesma construção dos testes). */
async function criarContaProva() {
  const bcrypt = require("bcryptjs");
  const email = "prova-parc-" + uid("u") + "@nexus.prova";
  const senha = "ProvaParcela2026#";
  const user = await prisma.user.create({
    data: { email, name: "Prova Parcela", passwordHash: await bcrypt.hash(senha, 12) },
  });
  const company = await prisma.company.create({ data: { name: uid("Empresa Parcela"), slug: uid("slg") } });
  await prisma.companyUser.create({ data: { userId: user.id, companyId: company.id, role: "OWNER" } });
  console.log("  [banco] empresa de prova criada: " + email);
  return { userId: user.id, companyId: company.id, email, senha };
}

/** Apaga a empresa na ordem filho → pai; os RESTRICT de negócio não deixam ir só pela cascata. */
async function apagarContaProva(conta) {
  const empresa = conta.companyId.replace(/'/g, "");
  for (const [child, parent, coluna] of [["sale_items", "sales", "sale_id"], ["purchase_items", "purchases", "purchase_id"]]) {
    await prisma.$executeRawUnsafe(
      "DELETE c FROM `" + child + "` c JOIN `" + parent + "` p ON p.id = c." + coluna + " WHERE p.company_id = '" + empresa + "'",
    );
  }
  const proprias = [
    "stock_movements", "finance_entries", "agenda_events", "leads", "sales", "purchases",
    "clients", "products", "product_categories", "suppliers", "finance_categories",
    "notifications", "notification_preferences", "payment_gateways", "company_users",
  ];
  for (const tabela of proprias) {
    await prisma.$executeRawUnsafe("DELETE FROM `" + tabela + "` WHERE company_id = '" + empresa + "'");
  }
  await prisma.company.deleteMany({ where: { id: conta.companyId } });
  await prisma.user.deleteMany({ where: { id: conta.userId } });
  const sobraram = await prisma.company.count({ where: { id: conta.companyId } })
    + await prisma.user.count({ where: { id: conta.userId } });
  return sobraram === 0;
}

const centavos = (v) => Math.round(Number(v) * 100);
/** Mês-seguido no calendário: ano × 12 + mês, para a diferença sair um número. */
const indiceDoMes = (iso) => Number(iso.slice(0, 4)) * 12 + Number(iso.slice(5, 7));
const ultimoDiaDoMes = (iso) => new Date(Date.UTC(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)), 0)).getUTCDate();

// ----------------------------------------------------------------------- roteiro
(async () => {
  await abrirBanco();
  const conta = await criarContaProva();

  const errosDeConsole = [];
  let browser = null;
  let apagado = false;

  try {
    const login = await chame("POST", "/auth/login", { email: conta.email, password: conta.senha });
    if (login.status !== 200) throw new Error("login de prova falhou: " + login.status + " " + JSON.stringify(login.dados));
    token = login.dados.accessToken;

    // == 1) As duas chaves nascem desligadas e uma liga sem mexer na outra ==
    console.log("== 1) A empresa de prova e as duas chaves de lançamento ==");
    const empresa = (await chame("GET", "/companies/current")).dados;
    ok("as duas chaves nascem desligadas",
      empresa.autoFinanceSales === false && empresa.autoFinancePurchases === false,
      String(empresa.autoFinanceSales) + " / " + String(empresa.autoFinancePurchases));
    ok("a casa fala BRL (a prova confere texto formatado)", empresa.currency === "BRL", empresa.currency);

    const ligaVendas = await chame("PATCH", "/companies/current", { autoFinanceSales: true });
    ok("ligar a venda grava só a venda", ligaVendas.status === 200
      && ligaVendas.dados.alterados.join(",") === "autoFinanceSales"
      && ligaVendas.dados.empresa.autoFinanceSales === true
      && ligaVendas.dados.empresa.autoFinancePurchases === false,
      JSON.stringify(ligaVendas.dados.alterados));

    // Fixtures pela API: o que a prova precisa existir não depende de tela.
    const produto = await chame("POST", "/products", {
      name: "Produto Parcela", salePrice: 100, costPrice: 100, stockQuantity: 10, minStock: 2,
    });
    const fornecedor = await chame("POST", "/suppliers", { name: "Fornecedor Parcela" });
    ok("produto e fornecedor de prova criados", produto.status === 201 && fornecedor.status === 201,
      produto.status + " / " + fornecedor.status);
    const produtoId = produto.dados.id;

    browser = await puppeteer.launch({
      executablePath: CHROME, headless: "new", args: ["--no-sandbox", "--disable-dev-shm-usage"],
    });
    const pagina = await browser.newPage();
    await pagina.setViewport({ width: 1440, height: 900 });
    pagina.on("console", (m) => { if (m.type() === "error") errosDeConsole.push(m.text()); });
    pagina.on("pageerror", (e) => errosDeConsole.push(String(e)));

    // == 2) A nova venda com preço em "1.290,50" e três parcelas ==
    console.log("== 2) Aba Nova Venda: o parser de dinheiro e o seletor de parcelas ==");
    await entrarNoPainel(pagina, conta.email, conta.senha);
    await pagina.goto(BASE + "/app/vendas?aba=nova", { waitUntil: "networkidle0" });
    await pagina.waitForSelector("#sale-parcelas", { timeout: 15000 });

    const seletorDeParcelas = await pagina.evaluate(() => {
      const el = document.querySelector("#sale-parcelas");
      return { opcoes: [...el.options].map((o) => o.textContent.trim()), valor: el.value };
    });
    ok("o seletor abre em À vista", seletorDeParcelas.valor === "1" && seletorDeParcelas.opcoes[0] === "À vista",
      seletorDeParcelas.valor + " · " + seletorDeParcelas.opcoes[0]);
    ok("a lista vai de 2× a 12×", seletorDeParcelas.opcoes.length === 12
      && seletorDeParcelas.opcoes[1] === "2×" && seletorDeParcelas.opcoes[11] === "12×",
      seletorDeParcelas.opcoes.join(","));
    ok("a nota de À vista já diz onde o dinheiro cai",
      /financeiro/.test((await notaDoCampo(pagina, "#sale-parcelas")) || ""));

    ok("o produto chegou na linha", await esperarOpcao(pagina, '[aria-label="Produto 1"]', produtoId));
    await escolher(pagina, '[aria-label="Produto 1"]', produtoId);
    await digitar(pagina, '[aria-label="Quantidade"]', "2");
    ok("digitar o preço em 1.290,50", await digitar(pagina, '[aria-label="Preço unitário"]', "1.290,50"));
    await espera(250);

    const daLinha = await totalDaLinha(pagina, '[aria-label="Preço unitário"]');
    ok("2 × R$ 1.290,50 é R$ 2.581,00 na linha", (daLinha || "").includes("2.581,00"), String(daLinha));
    const doRodape = await textoDe(pagina, ".toolbar-note strong.mono");
    ok("o rodapé do formulário soma o mesmo", (doRodape || "").includes("2.581,00"), String(doRodape));

    await escolher(pagina, "#sale-parcelas", "3");
    const notaTres = await notaDoCampo(pagina, "#sale-parcelas");
    ok("escolher 3 parcelas muda a nota",
      /3 parcelas mensais/.test(notaTres || "") && /última fechando a conta/.test(notaTres || ""), String(notaTres));
    await foto(pagina, "24-parcelamento-formulario");

    ok("registrar a venda", await clicarPorTexto(pagina, null, "Registrar venda"));
    await avisoDe(pagina, "Venda registrada como pendente.");

    // == 3) Pendente não escreve nada no financeiro ==
    console.log("== 3) Venda pendente: nada de lançamento e nada de estoque ==");
    let vendas = (await chame("GET", "/sales?pageSize=50")).dados;
    ok("a venda existe com três parcelas", vendas.data.length === 1
      && vendas.data[0].status === "PENDING" && vendas.data[0].installments === 3,
      JSON.stringify(vendas.data.map((s) => [s.status, s.installments, s.total])));
    let lancamentos = (await chame("GET", "/finance/entries?pageSize=50")).dados;
    ok("confirmar é que gera: pendente escreve zero", lancamentos.data.length === 0, String(lancamentos.data.length));
    ok("e o estoque ainda não saiu",
      (await chame("GET", "/products/" + produtoId)).dados.stockQuantity === 10);

    // == 4) Confirmar na lista ==
    console.log("== 4) Confirmar a venda no navegador ==");
    await pagina.waitForSelector(".row-actions button", { timeout: 15000 });
    ok("clicar em Confirmar", await clicarPorTexto(pagina, ".row-actions", "Confirmar"));
    ok("o modal de confirmação fechou", await confirmarAcao(pagina));
    await avisoDe(pagina, "Venda confirmada.");

    // == 5) As três parcelas, exatas em centavo ==
    console.log("== 5) O que a confirmação escreveu ==");
    vendas = (await chame("GET", "/sales?pageSize=50")).dados;
    const vendaId = vendas.data[0].id;
    lancamentos = (await chame("GET", "/finance/entries?pageSize=50")).dados;
    // A lista do servidor vem com o vencimento mais novo primeiro. Para falar de
    // "última parcela" é preciso olhar a parcela que vence por último, e não a que
    // chegou por último na resposta.
    const ultima = lancamentos.data.find((e) => /parcela 3 de 3/.test(e.description));
    const demais = lancamentos.data.filter((e) => e !== ultima);
    const valores = [...demais, ultima].map((e) => e.amount.toFixed(2));
    ok("três lançamentos de receita pendentes", lancamentos.data.length === 3
      && lancamentos.data.every((e) => e.type === "INCOME" && e.status === "PENDING"), valores.join(" | "));
    ok("a soma fecha o total em centavo",
      lancamentos.data.reduce((s, e) => s + centavos(e.amount), 0) === centavos(vendas.data[0].total),
      valores.join(" + ") + " = " + vendas.data[0].total.toFixed(2));
    ok("a última parcela absorve o resto",
      valores.slice(0, 2).every((v) => v === "860.33") && valores[2] === "860.34", valores.join(" | "));
    ok("a categoria veio do sistema, não da pessoa",
      lancamentos.data.every((e) => e.categoryName === "Vendas"),
      lancamentos.data.map((e) => e.categoryName).join(","));
    ok("a descrição traz o código da venda e a parcela",
      lancamentos.data.every((e) => e.description.includes(vendaId.slice(0, 8).toUpperCase())
        && /parcela \d de 3/.test(e.description)), lancamentos.data[0].description);

    const dias = lancamentos.data.map((e) => String(e.dueDate).slice(0, 10)).sort();
    const meses = dias.map(indiceDoMes);
    ok("os vencimentos caem em três meses seguidos",
      dias.length === 3 && meses[1] - meses[0] === 1 && meses[2] - meses[1] === 1, dias.join(" · "));
    const diaOriginal = Number(dias[0].slice(8, 10));
    ok("cada parcela segura o mesmo dia, ou o último do mês",
      dias.every((d) => Number(d.slice(8, 10)) === Math.min(diaOriginal, ultimoDiaDoMes(d))), dias.join(" · "));

    const gravados = await prisma.financeEntry.findMany({
      where: { companyId: conta.companyId }, select: { saleId: true, purchaseId: true },
    });
    ok("o vínculo com a venda está gravado na linha",
      gravados.length === 3 && gravados.every((e) => e.saleId === vendaId && e.purchaseId === null),
      JSON.stringify(gravados[0] || null));
    ok("a confirmação baixou o estoque",
      (await chame("GET", "/products/" + produtoId)).dados.stockQuantity === 8);

    // == 6) O financeiro mostra o que a venda gerou ==
    console.log("== 6) Financeiro: as parcelas na tela ==");
    await pagina.goto(BASE + "/app/financeiro?aba=contas", { waitUntil: "networkidle0" });
    await pagina.waitForSelector('[aria-label="Filtrar por mês"]', { timeout: 15000 });
    // O filtro de mês vem no mês atual; sem limpar, a parcela do mês que vem não aparece.
    await digitar(pagina, '[aria-label="Filtrar por mês"]', "");
    await pagina.waitForFunction(() => document.body.innerText.includes("parcela"), { timeout: 15000 }).catch(() => {});
    await espera(600);
    const linhas = await linhasDaTabela(pagina);
    ok("três linhas em Contas a Pagar / Receber", linhas.length === 3, JSON.stringify(linhas.map((l) => l[0])));
    ok("a linha mostra descrição, tipo, categoria, valor e situação",
      linhas.every((l) => l[0].includes("parcela") && l[1] === "Receita" && l[2] === "Vendas" && l[5] === "Pendente"),
      JSON.stringify(linhas[0]));
    ok("os valores na tela são os mesmos do servidor",
      linhas.filter((l) => l[3].includes("860,33")).length === 2 && linhas.filter((l) => l[3].includes("860,34")).length === 1,
      linhas.map((l) => l[3]).join(" | "));
    const alertaReceber = await pagina.evaluate(() =>
      document.querySelector(".nx-alerta.is-aviso .nx-alerta-qty")?.textContent.trim() ?? null);
    ok("o alerta de A receber conta as três", alertaReceber === "3", String(alertaReceber));
    await foto(pagina, "24-parcelamento-financeiro");

    // == 7) Cancelar tira o que o sistema gerou ==
    console.log("== 7) Cancelar a venda ==");
    await pagina.goto(BASE + "/app/vendas", { waitUntil: "networkidle0" });
    await pagina.waitForSelector(".row-actions button", { timeout: 15000 });
    ok("clicar em Cancelar", await clicarPorTexto(pagina, ".row-actions", "Cancelar"));
    ok("o modal de confirmação fechou", await confirmarAcao(pagina));
    await avisoDe(pagina, "Venda cancelada.");
    lancamentos = (await chame("GET", "/finance/entries?pageSize=50")).dados;
    ok("o financeiro ficou limpo: nada pago, nada gerado", lancamentos.data.length === 0,
      JSON.stringify(lancamentos.data.map((e) => [e.status, e.amount])));
    ok("o estoque voltou", (await chame("GET", "/products/" + produtoId)).dados.stockQuantity === 10);

    // == 8) A compra, com a segunda chave ==
    console.log("== 8) Compra recebida em duas parcelas ==");
    const ligaCompras = await chame("PATCH", "/companies/current", { autoFinancePurchases: true });
    ok("a segunda chave liga sem desligar a primeira",
      ligaCompras.dados.empresa.autoFinancePurchases === true && ligaCompras.dados.empresa.autoFinanceSales === true);

    await pagina.goto(BASE + "/app/compras", { waitUntil: "networkidle0" });
    await pagina.waitForSelector(".page-head button", { timeout: 15000 });
    ok("abrir o modal de nova compra", await clicarPorTexto(pagina, ".page-head", "Nova compra"));
    await pagina.waitForSelector("#purchase-parcelas", { timeout: 15000 });
    await esperarOpcao(pagina, "#purchase-supplier", fornecedor.dados.id);
    await escolher(pagina, "#purchase-supplier", fornecedor.dados.id);
    await esperarOpcao(pagina, '[aria-label="Produto 1"]', produtoId);
    await escolher(pagina, '[aria-label="Produto 1"]', produtoId);
    await digitar(pagina, '[aria-label="Custo unitário"]', "1.290,50");
    await espera(250);
    const daCompra = await totalDaLinha(pagina, '[aria-label="Custo unitário"]');
    ok("1 × 1.290,50 na linha da compra", (daCompra || "").includes("1.290,50"), String(daCompra));
    await escolher(pagina, "#purchase-parcelas", "2");
    ok("a compra tem o mesmo seletor", (await notaDoCampo(pagina, "#purchase-parcelas") || "").includes("2 parcelas mensais"));
    await pagina.evaluate(() => {
      const cx = document.querySelector(".nx-modal .neu-check input[type=checkbox]");
      if (cx && !cx.checked) cx.click();
    });
    await espera(220);
    await foto(pagina, "24-parcelamento-compra");
    ok("registrar e receber a compra", await clicarPorTexto(pagina, ".nx-modal-actions", "Registrar compra"));
    await avisoDe(pagina, "Compra registrada e recebida.");

    lancamentos = (await chame("GET", "/finance/entries?pageSize=50")).dados;
    ok("duas despesas de R$ 645,25 na categoria Compras", lancamentos.data.length === 2
      && lancamentos.data.every((e) => e.type === "EXPENSE" && e.amount.toFixed(2) === "645.25"
        && e.categoryName === "Compras"),
      lancamentos.data.map((e) => e.amount.toFixed(2)).join(" | "));
    ok("as duas fecham o custo em centavo",
      lancamentos.data.reduce((s, e) => s + centavos(e.amount), 0) === 129050,
      String(lancamentos.data.reduce((s, e) => s + centavos(e.amount), 0)));
    const gravadosCompra = await prisma.financeEntry.findMany({
      where: { companyId: conta.companyId }, select: { saleId: true, purchaseId: true },
    });
    ok("o vínculo agora é com a compra",
      gravadosCompra.length === 2 && gravadosCompra.every((e) => e.purchaseId !== null && e.saleId === null),
      JSON.stringify(gravadosCompra[0] || null));
    ok("a entrada de estoque aconteceu",
      (await chame("GET", "/products/" + produtoId)).dados.stockQuantity === 11);

    // == 9) Cancelar a compra ==
    console.log("== 9) Cancelar a compra ==");
    await pagina.goto(BASE + "/app/compras", { waitUntil: "networkidle0" });
    await pagina.waitForSelector(".row-actions button", { timeout: 15000 });
    ok("clicar em Cancelar", await clicarPorTexto(pagina, ".row-actions", "Cancelar"));
    ok("o modal de confirmação fechou", await confirmarAcao(pagina));
    await avisoDe(pagina, "Compra cancelada.");
    lancamentos = (await chame("GET", "/finance/entries?pageSize=50")).dados;
    ok("as duas despesas saem com a compra", lancamentos.data.length === 0, String(lancamentos.data.length));
    ok("e o estoque estorna", (await chame("GET", "/products/" + produtoId)).dados.stockQuantity === 10);

    await pagina.close();
  } finally {
    if (browser) await browser.close().catch(() => {});
    try {
      apagado = await apagarContaProva(conta);
    } catch (e) {
      console.log("  [limpeza] falha ao apagar a empresa de prova: " + e.message);
    }
    await prisma.$disconnect().catch(() => {});
  }

  ok("a empresa de prova não deixou rastro no banco", apagado);
  ok("nenhum erro de JavaScript no caminho",
    errosDeConsole.filter((t) => !/Failed to load resource/.test(t)).length === 0,
    errosDeConsole.slice(0, 3).join(" | "));
  console.log("\n" + checks + " checagens · " + falhas.length + " falhas");
  if (falhas.length) {
    console.log(falhas.map((f) => "  - " + f).join("\n"));
    process.exit(1);
  }
  console.log("Parcelamento provado no navegador: preço brasileiro lido certo, parcelas exatas no financeiro e o cancelamento desfazendo o que o sistema gerou.");
})();
