// Prova do /app/configuracoes: as cinco abas gravam de verdade, cada bloco solta
// só o que mudou, o que a API reprova aparece embaixo do campo — não num aviso
// genérico que a pessoa lê e não sabe onde corrigir — e a aba "Seus dados" devolve
// a cópia que a LGPD promete, no browser e não só no teste de componente.
//
// A T6.4 acrescentou a esta aba a escrita mais cara do produto (anonimizar e
// excluir a própria conta). A prova dela é obrigatoriamente dividida, e a divisão
// mudou depois de medir a casa da captura: ela tem outros responsáveis ativos
// (os administradores da instalação), então o 409 de "último responsável" nunca
// chegaria a ela. Ficou assim:
//  - a recusa por SENHA (400, não destrutiva) corre na conta de captura, porque é
//    ela que aparece nas telas e o único estrago possível é uma linha de trilha;
//  - a recusa por EMPRESA (409) e o caminho de SUCESSO de anonimizar correm numa
//    casa vazia criada por esta prova, com uma única responsável descartável — e
//    o 409 desaparece quando a prova dá um sucessor a ela, que é a prova de que a
//    guarda fala por causa da casa, não por causa da conta;
//  - o caminho de SUCESSO de excluir corre pela API, numa conta STAFF apagada no fim.
// Nenhuma conta criada aqui é a que aparece nas outras fotos, e tudo que a prova
// cria — contas e a casa — sai do banco no finally.
//
// A prova escreve na empresa e na conta da captura fictícia (tools/conta-de-captura.cjs,
// papel de OWNER) e devolve tudo ao valor que encontrou no início: o administrador real
// da plataforma nunca entra nesta tela, então nenhum dado dele vai para o git.
// O papel que não pode gravar é conferido com um usuário de prova criado no banco
// e apagado no fim: sem rota de exclusão de usuário no produto, ele não pode
// deixar rastro nem aparecer numa listagem.
const puppeteer = require("puppeteer-core");
const path = require("path");
const { contaDeCaptura } = require("./conta-de-captura.cjs");
const { conferirServidorDeProva, clienteDoBancoDeProva } = require("./banco-de-prova.cjs");

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const BASE = require("./pilha-de-prova.cjs").baseDoNavegador();
const API = (require("./pilha-de-prova.cjs").raizDaApi()) + "/api";
const SHOTS = require("./pilha-de-prova.cjs").pastaDeCaptura("docs/screenshots");
// A conta desta corrida: fictícia, com empresa própria vazia.
const CAPTA = contaDeCaptura();
// NEXUS_PROVA_FOTOS=22-configuracoes-conta,... fotografa só o que foi pedido.
const FOTOS_PEDIDAS = (process.env.NEXUS_PROVA_FOTOS || "")
  .split(",")
  .map((nome) => nome.trim())
  .filter(Boolean);

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
  try {
    dados = JSON.parse(texto);
  } catch {
    dados = { texto };
  }
  return { status: res.status, dados };
}

// As contas de prova da T6.4 precisam de sessão própria sem mexer no `token`
// global (que é o da conta de captura, e a restauração do estado final depende
// dele). `chameCom` é a mesma chamada, com o endereço e os cabeçalhos à vista —
// o teto de três por minuto só se mede no cabeçalho que a resposta devolve.
async function chameCom(accessToken, metodo, caminho, corpo) {
  const res = await fetch(API + caminho, {
    method: metodo,
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: "Bearer " + accessToken } : {}),
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
  return { status: res.status, dados, headers: res.headers };
}

async function tokenDaConta(email, senha) {
  const resposta = await chameCom(null, "POST", "/auth/login", { email, password: senha });
  if (resposta.status !== 200) {
    throw new Error("login da conta de prova falhou (" + resposta.status + "): " + JSON.stringify(resposta.dados).slice(0, 160));
  }
  return resposta.dados.accessToken;
}

// ------------------------------------------------------------------ peça de tela
// Os campos não têm id fixo: a tela é montada por uma tabela de descritores, e o
// que a pessoa lê é o rótulo. Então a prova também procura pelo rótulo — se ele
// mudar de texto, a prova quebra junto, que é o aviso de que o print precisa ser
// refeito. O ajudante mora no navegador (injetado antes de qualquer navegação)
// porque é de lá que os campos são lidos.
async function injetarAjuda(page) {
  await page.evaluateOnNewDocument(() => {
    window.localDoCampo = function (tituloDoBloco, rotulo) {
      const bloco = [...document.querySelectorAll(".nx-bloco")].find(
        (b) => (b.querySelector(".panel-title")?.textContent || "").trim() === tituloDoBloco);
      if (!bloco) return null;
      return [...bloco.querySelectorAll(".field")].find(
        (f) => (f.querySelector(".field-label")?.textContent || "").trim() === rotulo) || null;
    };
    window.localDoBloco = function (titulo) {
      return [...document.querySelectorAll(".nx-bloco")].find(
        (b) => (b.querySelector(".panel-title")?.textContent || "").trim() === titulo) || null;
    };
    // A cópia em JSON desce por blob e link oculto. Para conferir o arquivo de
    // verdade — e não a prévia da tela — o blob é guardado aqui antes de virar URL.
    window.copias = [];
    const criarOriginal = URL.createObjectURL.bind(URL);
    URL.createObjectURL = function (blob) {
      window.copias.push(blob);
      return criarOriginal(blob);
    };
  });
}

async function escreverCampo(page, tituloDoBloco, rotulo, texto) {
  const achado = await page.evaluate((titulo, r, valor) => {
    const el = window.localDoCampo(titulo, r)?.querySelector("input, textarea");
    if (!el) return false;
    // Campo controlado pelo React: mexer em el.value por fora não dispara o
    // onChange. O setter nativo + o evento input é o jeito de digitar de verdade.
    const proto = el instanceof HTMLTextAreaElement
      ? window.HTMLTextAreaElement.prototype
      : window.HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, "value").set.call(el, valor);
    el.dispatchEvent(new Event("input", { bubbles: true }));
    return true;
  }, tituloDoBloco, rotulo, texto);
  ok("campo \"" + rotulo + "\" existe no bloco \"" + tituloDoBloco + "\"", achado);
  await espera(150);
  return achado;
}

async function selecionarCampo(page, tituloDoBloco, rotulo, valor) {
  const achado = await page.evaluate((titulo, r, v) => {
    const el = window.localDoCampo(titulo, r)?.querySelector("select");
    if (!el) return false;
    Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, "value").set.call(el, v);
    el.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  }, tituloDoBloco, rotulo, valor);
  ok("lista \"" + rotulo + "\" existe no bloco \"" + tituloDoBloco + "\"", achado);
  await espera(150);
  return achado;
}

const valorDoCampo = (page, titulo, rotulo) =>
  page.evaluate((t, r) => window.localDoCampo(t, r)?.querySelector("input, select, textarea")?.value ?? null, titulo, rotulo);

const erroDoCampo = (page, titulo, rotulo) =>
  page.evaluate((t, r) => window.localDoCampo(t, r)?.querySelector(".field-error")?.textContent.trim() ?? null, titulo, rotulo);

const campoDesabilitado = (page, titulo, rotulo) =>
  page.evaluate((t, r) => window.localDoCampo(t, r)?.querySelector("input, select, textarea")?.disabled ?? null, titulo, rotulo);

/** { nota, botao: { texto, desabilitado } | null } do bloco, ou null se o bloco não está na tela. */
const blocoDe = (page, titulo) =>
  page.evaluate((t) => {
    const bloco = window.localDoBloco(t);
    if (!bloco) return null;
    const botao = bloco.querySelector(".nx-bloco-acao button");
    return {
      nota: bloco.querySelector(".nx-bloco-nota")?.textContent.trim() ?? null,
      botao: botao ? { texto: botao.textContent.trim(), desabilitado: botao.disabled } : null,
    };
  }, titulo);

/** Clique no botão de gravar de um bloco, identificado pelo título. */
async function salvarBloco(page, tituloDoBloco) {
  const info = await blocoDe(page, tituloDoBloco);
  const clicado = await page.evaluate((titulo) => {
    const botao = window.localDoBloco(titulo)?.querySelector(".nx-bloco-acao button");
    if (!botao) return false;
    botao.click();
    return true;
  }, tituloDoBloco);
  ok("bloco \"" + tituloDoBloco + "\" tem botão de gravar (" + (info?.botao?.texto ?? "nenhum") + ")", clicado);
  await espera(300);
  return clicado;
}

/**
 * -------------------------------------------------- painel de eliminação (T6.4)
 * O título do bloco é o que a pessoa lê e o que a prova procura: se o texto mudar,
 * a prova quebra junto e avisa que a captura precisa ser refeita. Os dois botões
 * vivem no corpo do bloco (cada um na sua linha de ação), não no cabeçalho.
 */
const TITULO_ELIMINACAO = "Eliminar os seus dados";
const ANONIMIZAR = "/lgpd/minha-conta/anonimizar";
const EXCLUIR = "/lgpd/minha-conta/excluir";

const botoesDeEliminacao = (page) =>
  page.evaluate((titulo) => {
    const bloco = window.localDoBloco(titulo);
    return [...(bloco?.querySelectorAll(".nx-bloco-acao button") || [])].map((b) => ({
      texto: b.textContent.trim(),
      desabilitado: b.disabled,
      perigo: b.classList.contains("btn-danger"),
    }));
  }, TITULO_ELIMINACAO);

async function clicarEliminacao(page, texto) {
  const clicado = await page.evaluate((titulo, rotulo) => {
    const botao = [...(window.localDoBloco(titulo)?.querySelectorAll(".nx-bloco-acao button") || [])]
      .find((b) => b.textContent.trim() === rotulo);
    if (!botao) return false;
    botao.click();
    return true;
  }, TITULO_ELIMINACAO, texto);
  await espera(250);
  return clicado;
}

/** O que o diálogo de perigo do sistema mostra, lido do próprio DOM do modal. */
const dialogo = (page) =>
  page.evaluate(() => {
    const d = document.querySelector('.nx-modal[role="dialog"]');
    if (!d) return null;
    return {
      titulo: (d.querySelector(".nx-modal-title")?.textContent || "").trim(),
      texto: (d.querySelector(".nx-confirm-texto")?.textContent || "").trim(),
      detalhe: (d.querySelector(".nx-confirm-detalhe")?.textContent || "").trim(),
      botoes: [...(d.querySelectorAll(".nx-modal-actions button") || [])].map((b) => b.textContent.trim()),
    };
  });

async function clicarNoDialogo(page, texto) {
  const clicado = await page.evaluate((rotulo) => {
    const botao = [...document.querySelectorAll('.nx-modal[role="dialog"] .nx-modal-actions button')]
      .find((b) => b.textContent.trim() === rotulo);
    if (!botao) return false;
    botao.click();
    return true;
  }, texto);
  await espera(350);
  return clicado;
}

/**
 * Contador de pedidos às duas portas, visto do navegador. É assim que a prova
 * distingue "o botão estava apagado" de "o botão estava apagado e mesmo assim
 * saiu um pedido" — o atributo sozinho não diria a segunda parte.
 */
function contePedidosDeEliminacao(page) {
  const vistos = [];
  page.on("request", (req) => {
    let caminho;
    try {
      caminho = new URL(req.url()).pathname;
    } catch {
      return;
    }
    if (/\/lgpd\/minha-conta\/(anonimizar|excluir)$/.test(caminho)) {
      vistos.push(req.method() + " " + caminho);
    }
  });
  return vistos;
}

/** Janela isolada (contexto novo, sem o token da conta de captura) para uma conta de prova. */
async function novaJanelaDeProva(browser, rotulo, colecaoDeErros) {
  const contexto = await (browser.createBrowserContext
    ? browser.createBrowserContext()
    : browser.createIncognitoBrowserContext());
  const pagina = await contexto.newPage();
  await injetarAjuda(pagina);
  await pagina.setViewport({ width: 1440, height: 900 });
  pagina.on("pageerror", (e) => colecaoDeErros.push(rotulo + ": " + String(e)));
  const pedidos = contePedidosDeEliminacao(pagina);
  return { contexto, pagina, pedidos };
}

async function avisoDe(page, trecho) {
  const visto = await avisoAte(page, trecho);
  const vistos = visto ? [] : await page.evaluate(() =>
    [...document.querySelectorAll(".toast-message")].map((m) => (m.textContent || "").trim()));
  ok("a tela avisa: " + trecho, visto, visto ? undefined : "avisos na tela: " + JSON.stringify(vistos));
  await semToast(page);
}

/** Igual a `avisoDe`, mas fotografa com o aviso ainda na tela. */
async function avisoComFoto(page, trecho, nome) {
  const visto = await avisoAte(page, trecho);
  if (visto) await foto(page, nome);
  ok("a tela avisa: " + trecho, visto, visto ? undefined : "nenhum aviso com esse texto apareceu");
  await semToast(page);
}

async function avisoAte(page, trecho) {
  return page
    .waitForFunction((t) => [...document.querySelectorAll(".toast-message")]
      .some((m) => (m.textContent || "").includes(t)), { timeout: 12000 }, trecho)
    .then(() => true)
    .catch(() => false);
}

async function semToast(page) {
  await page
    .waitForFunction(() => !document.querySelector(".toast-message, .toast"), { timeout: 12000 })
    .catch(() => {});
  await espera(250);
}

async function foto(page, nome) {
  if (FOTOS_PEDIDAS.length && !FOTOS_PEDIDAS.includes(nome)) {
    console.log("  [foto] " + nome + " (fora da lista desta corrida)");
    return;
  }
  await page.screenshot({ path: SHOTS + "/" + nome + ".png" });
  console.log("  [foto] " + nome + ".png");
}

const textoDaPagina = (page) => page.evaluate(() => document.body.innerText);

// Os 400 que a prova provoca de propósito aparecem no console do navegador como
// "Failed to load resource". Isso é ruído da rede, não do app: o que interessa é
// erro de JavaScript (pageerror), que continua contando.
const ruidoDeRede = (t) =>
  /Failed to load resource: the server responded with a status of 4\d\d/.test(t);

/** Abre uma aba pela barra e confere que a URL acompanhou (a primeira aba não polui o endereço). */
async function irParaAba(page, id) {
  await page.evaluate((i) => document.querySelector('.nx-tab[data-tab="' + i + '"]')?.click(), id);
  await espera(500);
  await semToast(page);
  const marcada = page.url().includes("aba=" + id);
  if (id === "conta") ok("voltar à primeira aba limpa o ?aba=", !marcada, page.url());
  else ok("a URL marca a aba escolhida", marcada, page.url());
}

async function entrarNoPainel(page, email, senha) {
  await page.goto(BASE + "/login", { waitUntil: "networkidle0" });
  await page.waitForSelector("input[type=email]");
  await page.type("input[type=email]", email);
  await page.type("input[type=password]", senha);
  await Promise.all([
    page.waitForFunction(() => window.location.pathname.startsWith("/app"), { timeout: 15000 }),
    page.click("button[type=submit]"),
  ]);
  await semToast(page);
}

// ------------------------------------------------------------------------ banco
// Só usuários e casas de prova, criados e apagados por aqui: um STAFF segura a
// leitura de somente leitura (seção 8), os outros exercem os direitos de eliminação
// da T6.4 — nenhum deles é a conta que aparece nas fotos das outras abas.
let prisma = null;
async function abrirBanco() {
  // D6 (tarefa T1): o .env de desenvolvimento fica fora desta prova. O cliente vem de
  // banco-de-prova.cjs, que so aceita DATABASE_URL_TESTE apontando para o banco de prova.
  prisma = clienteDoBancoDeProva();
}

const contasDeProva = [];
let numeroDeProva = 0;

async function criarContaDeProva(companyId, nome, papel = "STAFF") {
  const bcrypt = require("bcryptjs");
  numeroDeProva += 1;
  const email = "prova-config-" + Date.now() + "-" + numeroDeProva + "@nexus.prova";
  const senha = "ProvaLeitura2026#";
  const user = await prisma.user.create({
    data: { email, name: nome, passwordHash: await bcrypt.hash(senha, 12) },
  });
  await prisma.companyUser.create({ data: { userId: user.id, companyId, role: papel } });
  const conta = { id: user.id, email, senha, nome, papel };
  contasDeProva.push(conta);
  console.log("  [banco] " + papel + " de prova criado: " + email);
  return conta;
}

async function criarStaff(companyId) {
  return criarContaDeProva(companyId, "Prova Leitura");
}

const casasDeProva = [];
let numeroDeCasa = 0;

/**
 * Uma casa vazia, criada só para a guarda do artigo 18 falar: é o único jeito de
 * provar o 409 de "último responsável ativo" sem tocar em empresa que exista de
 * verdade. O slug carrega o instante para não colidir com rodada anterior.
 */
async function criarCasaDeProva(nome) {
  numeroDeCasa += 1;
  const company = await prisma.company.create({
    data: { name: nome, slug: "prova-config-" + Date.now() + "-" + numeroDeCasa },
  });
  casasDeProva.push(company);
  console.log("  [banco] casa de prova criada: " + company.name + " (" + company.slug + ")");
  return company;
}

/** O que sobrou de uma conta de prova, linha por linha, depois do pedido. */
async function retratoDaConta(id) {
  const user = await prisma.user.findUnique({ where: { id } });
  const [vinculos, sessoes, aceites] = await Promise.all([
    prisma.companyUser.count({ where: { userId: id } }),
    prisma.refreshToken.count({ where: { userId: id } }),
    prisma.consentRecord.count({ where: { userId: id } }),
  ]);
  return { user, vinculos, sessoes, aceites };
}

// --------------------------------------------------------------- valores da casa
// Os três booleanos de política (estoque negativo, lançamento de venda e de
// compra) entram aqui: a prova os liga e desliga no fluxo, mas a conferência
// final é a mesma dos outros campos — se algo sobrar ligado, o script avisa.
const CAMPOS_EMPRESA = [
  "name", "legalName", "tradeName", "cnpj", "phone", "email", "zipCode", "street",
  "number", "district", "city", "stateUf", "logoUrl", "currency", "timezone",
  "language", "revenueTarget", "allowNegativeStock",
  "autoFinanceSales", "autoFinancePurchases",
];

const CNPJ_INVALIDO = "11.222.333/0001-99";
const CNPJ_VALIDO = "11.222.333/0001-81";
const CNPJ_DIGITOS = "11222333000181";
const TELEFONE_PROVA = "(11) 98765-4321";
const CEP_PROVA = "01310-100";

const vazio = (v) => v === null || v === undefined || v === "";

/** null e "" são a mesma coisa para a empresa: campo sem valor. */
function diferencas(antes, depois) {
  return CAMPOS_EMPRESA.filter((c) => {
    const a = antes[c];
    const b = depois[c];
    if (vazio(a) && vazio(b)) return false;
    return String(a) !== String(b);
  });
}

// ----------------------------------------------------------------------- roteiro
(async () => {
  const login = await chame("POST", "/auth/login", { email: CAPTA.email, password: CAPTA.senha });
  if (login.status !== 200) {
    console.error("login falhou: " + login.status + " " + JSON.stringify(login.dados));
    process.exit(1);
  }
  token = login.dados.accessToken;

  const empresaAntes = (await chame("GET", "/companies/current")).dados;
  const contaAntes = (await chame("GET", "/auth/me")).dados;
  console.log("API: sessão obtida · empresa \"" + empresaAntes.name + "\" · moeda "
    + empresaAntes.currency + " · fuso " + empresaAntes.timezone + " · meta " + String(empresaAntes.revenueTarget));

  await abrirBanco();
  const staff = await criarStaff(empresaAntes.id);

  // D6 (tarefa T1): a prova so escreve no banco de prova. A conferencia entra na API, pega o
  // id que ela devolve no login da conta de prova e exige que esse id exista em
  // nexusbusinessmanager_teste - se o servidor atende outro banco, a prova para aqui.
  await conferirServidorDeProva();

  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: "new",
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });

  const errosDeConsole = [];
  const contasSobrantes = [];
  const casasSobrantes = [];

  try {
    const pagina = await browser.newPage();
    await injetarAjuda(pagina);
    await pagina.setViewport({ width: 1440, height: 900 });
    pagina.on("console", (m) => { if (m.type() === "error") errosDeConsole.push(m.text()); });
    pagina.on("pageerror", (e) => errosDeConsole.push(String(e)));

    // == 1) Entrada e as cinco abas ==
    console.log("== 1) Entrar em Configurações ==");
    await entrarNoPainel(pagina, CAPTA.email, CAPTA.senha);
    await pagina.goto(BASE + "/app/configuracoes", { waitUntil: "networkidle0" });
    await pagina.waitForSelector(".nx-painel", { timeout: 15000 });

    const linkMenu = await pagina.evaluate(() =>
      [...document.querySelectorAll(".admin-nav-item")]
        .find((a) => (a.textContent || "").includes("Configurações"))?.getAttribute("href") ?? null);
    ok("o menu tem o link de Configurações", linkMenu === "/app/configuracoes", String(linkMenu));

    const abas = await pagina.$$eval(".nx-tab", (els) => els.map((e) => e.dataset.tab));
    ok("Minha conta, Seus dados, Empresa, Aparência e Empresas",
      abas.join(",") === "conta,privacidade,empresa,aparencia,acesso", abas.join(","));

    const cabecalho = await textoDaPagina(pagina);
    ok("o cabeçalho diz quem está na tela", /OWNER/.test(cabecalho));
    ok("quem administra não vê a faixa de somente leitura",
      !(await pagina.evaluate(() => Boolean(document.querySelector(".status-pill.is-off")))));

    await irParaAba(pagina, "empresa");
    await pagina.reload({ waitUntil: "networkidle0" });
    await pagina.waitForSelector(".nx-painel", { timeout: 15000 });
    ok("recarregar a página mantém a aba escolhida",
      (await pagina.evaluate(() => document.querySelector(".nx-tab.is-active")?.dataset.tab)) === "empresa");

    // == 2) Minha conta ==
    console.log("== 2) Aba Minha conta: nome, telefone e senha ==");
    await irParaAba(pagina, "conta");

    const blocoConta = await blocoDe(pagina, "Seus dados");
    ok("bloco \"Seus dados\" com botão Salvar", blocoConta?.botao?.texto === "Salvar", JSON.stringify(blocoConta?.botao));
    ok("sem mudança pendente, o botão está desabilitado", blocoConta?.botao?.desabilitado === true);

    const emailLeitura = await pagina.evaluate((t) => {
      const field = window.localDoCampo(t, "E-mail de acesso");
      const el = field?.querySelector("input");
      return {
        readOnly: el?.readOnly ?? null,
        valor: el?.value ?? null,
        dica: field?.querySelector(".field-hint")?.textContent.trim() ?? null,
      };
    }, "Seus dados");
    ok("o e-mail aparece mas não se edita",
      emailLeitura.readOnly === true && emailLeitura.valor === CAPTA.email, JSON.stringify(emailLeitura));
    ok("a tela explica por que ele é travado", /não se altera/.test(emailLeitura.dica || ""), String(emailLeitura.dica));

    await escreverCampo(pagina, "Seus dados", "Telefone", TELEFONE_PROVA);
    ok("o telefone é mascarado enquanto se digita",
      (await valorDoCampo(pagina, "Seus dados", "Telefone")) === TELEFONE_PROVA);
    ok("com mudança pendente o botão libera",
      (await blocoDe(pagina, "Seus dados")).botao?.desabilitado === false);
    await salvarBloco(pagina, "Seus dados");
    await avisoDe(pagina, "Seus dados foram atualizados.");

    const meDepois = (await chame("GET", "/auth/me")).dados;
    ok("a API guarda só os algarismos", meDepois.phone === "11987654321", String(meDepois.phone));
    ok("a tela volta mascarada depois de gravar",
      (await valorDoCampo(pagina, "Seus dados", "Telefone")) === TELEFONE_PROVA);
    await foto(pagina, "22-configuracoes-conta");

    await escreverCampo(pagina, "Seus dados", "Telefone", "(11) 333");
    await salvarBloco(pagina, "Seus dados");
    const erroTelefone = await erroDoCampo(pagina, "Seus dados", "Telefone");
    ok("telefone curto devolve a regra no próprio campo", /telefone válido/.test(erroTelefone || ""),
      String(erroTelefone));
    await semToast(pagina);

    await escreverCampo(pagina, "Seus dados", "Telefone", "");
    await salvarBloco(pagina, "Seus dados");
    await avisoDe(pagina, "Seus dados foram atualizados.");
    ok("esvaziar o campo limpa o telefone", vazio((await chame("GET", "/auth/me")).dados.phone));

    // == 2b) Aba Seus dados: o direito de acesso na tela (T6.3) ==
    // A leitura é cara e fica auditada, então a prova confere três coisas que o
    // teste de componente não pode conferir sozinho: a tela é montada pela resposta
    // real da API, o arquivo baixado é o corpo inteiro dela, e cada export deixa
    // uma linha na trilha de auditoria desta conta.
    console.log("== 2b) Aba Seus dados: a foto que a casa dá da pessoa ==");
    const exportosAntes = await prisma.auditLog.count({
      where: { action: "lgpd.export", userId: contaAntes.id },
    });
    const referencia = (await chame("GET", "/lgpd/meus-dados")).dados;

    await irParaAba(pagina, "privacidade");
    await pagina.waitForSelector(".nx-bloco", { timeout: 15000 });

    const titulosPrivacidade = await pagina.$$eval(".nx-bloco .panel-title", (els) =>
      els.map((e) => e.textContent.trim()));
    // Quatro blocos de leitura e um de escrita (T6.4). A ordem é a da tela, e a
    // eliminação vem por último de propósito: é o caminho sem volta, não a
    // primeira coisa que a pessoa vê ao abrir a própria ficha.
    ok("quatro blocos de leitura e o de eliminação por último",
      titulosPrivacidade.join(",") ===
        "Seus dados,O que você aceitou,Onde mais você está,O que a casa guarda e não entrega," + TITULO_ELIMINACAO,
      titulosPrivacidade.join(","));

    const fotoTela = await pagina.evaluate((t) => {
      const bloco = window.localDoBloco(t);
      return {
        linhas: [...(bloco?.querySelectorAll(".nx-grade .field") || [])].map((f) => {
          const rotulo = (f.querySelector(".field-label")?.textContent || "").trim();
          const valor = (f.querySelector(".field-label")?.nextElementSibling?.textContent || "").trim();
          return rotulo + "=" + valor;
        }),
        botao: bloco?.querySelector(".nx-bloco-acao button")?.textContent.trim() ?? null,
      };
    }, "Seus dados");
    ok("a tela escreve a conta que está logada",
      fotoTela.linhas.includes("E-mail de acesso=" + CAPTA.email)
        && fotoTela.linhas.includes("Nome=" + CAPTA.nome),
      fotoTela.linhas.join(" | "));
    ok("o papel exibido é o da empresa ativa do token",
      fotoTela.linhas.includes("Papel na empresa ativa=" + referencia.empresaAtiva.papel),
      fotoTela.linhas.join(" | "));
    ok("as sessões são contadas a partir da resposta",
      fotoTela.linhas.includes(
        "Sessões abertas=" + referencia.sessoes.filter((s) => !s.revogadaEm && !s.usadaEm).length
          + " de " + referencia.sessoes.length),
      fotoTela.linhas.join(" | "));
    ok("o botão oferece a cópia, não uma gravação",
      fotoTela.botao === "Baixar cópia em JSON", String(fotoTela.botao));

    const leituras = await pagina.evaluate(() => {
      const bloco = window.localDoBloco("O que você aceitou");
      return {
        itens: [...(bloco?.querySelectorAll("li") || [])].map((li) => li.textContent.trim()),
        texto: (bloco?.textContent || "").trim(),
      };
    });
    // A conta fictícia de captura nasceu em 13/10, antes do aceite existir na porta
    // de cadastro: o que ela tem é o estado vazio, e é ele que a tela mostra. As
    // duas pontas — linha por aceite e a frase de "ninguém marcou por ela" — são
    // conferidas contra o mesmo corpo que a API devolve, então a tela não pode
    // inventar nem esconder linha.
    ok("a lista de aceites segue o que a API devolve",
      referencia.aceites.length === 0
        ? leituras.itens.length === 0 && /Nenhuma caixa marcada registrada/.test(leituras.texto)
        : leituras.itens.length === referencia.aceites.length
          && /versão \d+/.test(leituras.itens[0]),
      JSON.stringify({ itens: leituras.itens.length, naApi: referencia.aceites.length }));
    ok("as outras empresas aparecem com o papel de cada uma",
      (await pagina.evaluate(() =>
        window.localDoBloco("Onde mais você está")?.querySelectorAll("li").length ?? 0))
        === referencia.vinculos.length,
      "vinculos na API: " + referencia.vinculos.length);

    await pagina.evaluate(() => {
      const botao = window.localDoBloco("Seus dados")?.querySelector(".nx-bloco-acao button");
      botao?.click();
    });
    await avisoDe(pagina, "Cópia gerada");
    await espera(250);

    const arquivo = await pagina.evaluate(async () => {
      const blob = window.copias[window.copias.length - 1];
      if (!blob) return null;
      const texto = await blob.text();
      return { tamanho: texto.length, corpo: JSON.parse(texto) };
    });
    ok("o navegador produziu um arquivo para baixar", Boolean(arquivo),
      arquivo ? arquivo.tamanho + " bytes" : "nenhum blob criado");
    ok("o arquivo traz a mesma conta que a API devolve",
      arquivo?.corpo.titular.email === referencia.titular.email
        && arquivo?.corpo.aceites.length === referencia.aceites.length
        && arquivo?.corpo.naoIncluidos.length === referencia.naoIncluidos.length,
      JSON.stringify({
        email: arquivo?.corpo.titular.email,
        aceites: arquivo?.corpo.aceites.length,
        ausencias: arquivo?.corpo.naoIncluidos.length,
      }));
    const corpoDoArquivo = JSON.stringify(arquivo?.corpo ?? {});
    ok("credencial nenhuma desce no arquivo",
      !/passwordHash|tokenHash|totpSecret|recoveryCode/.test(corpoDoArquivo),
      corpoDoArquivo.slice(0, 80));
    ok("a tela declara o que fica de fora, com motivo",
      (await pagina.evaluate(() =>
        [...(window.localDoBloco("O que a casa guarda e não entrega")?.querySelectorAll("li") || [])]
          .map((li) => li.textContent.trim())))
        .length === referencia.naoIncluidos.length,
      "ausências declaradas: " + referencia.naoIncluidos.length);
    await foto(pagina, "22-configuracoes-seus-dados");

    const exportosDepois = await prisma.auditLog.count({
      where: { action: "lgpd.export", userId: contaAntes.id },
    });
    const ultimoExporto = await prisma.auditLog.findFirst({
      where: { action: "lgpd.export", userId: contaAntes.id },
      orderBy: { createdAt: "desc" },
    });
    // Mais de uma linha por visita é esperado e não é defeito: em desenvolvimento o
    // React monta o painel duas vezes, e a leitura da referência feita aqui pelo
    // próprio script também passa pela porta. O que se prova é o contrato — cada
    // leitura assina a conta, a empresa e a entidade "user".
    ok("cada leitura da cópia fica na trilha, assinada por esta conta",
      exportosDepois > exportosAntes
        && ultimoExporto?.entity === "user"
        && ultimoExporto?.entityId === contaAntes.id
        && ultimoExporto?.companyId === empresaAntes.id,
      exportosAntes + " -> " + exportosDepois + " · última: "
        + JSON.stringify({ e: ultimoExporto?.entity, id: ultimoExporto?.entityId, c: ultimoExporto?.companyId }));

    // == 2c) Aba Seus dados: os dois direitos que apagam (T6.4) ==
    //
    // Anonimizar e excluir são a escrita mais cara do produto, e a prova se divide
    // em três pontas:
    //  - a recusa por SENHA corre na conta de captura: um 400 de "senha não confere"
    //    não destrói linha nenhuma, e é ele que mostra o diálogo de perigo, a frase
    //    do servidor na tela e a sessão que continua de pé;
    //  - a recusa por EMPRESA ("a casa não pode ficar sem dono") corre numa conta que
    //    é a única responsável ativa de uma casa vazia criada por esta prova, e nunca
    //    na de captura: medido nesta rodada, a empresa da captura tem mais OWNERs
    //    ativos (os administradores da instalação), então o 409 nem chegaria a ela;
    //  - os caminhos de SUCESSO correm numa casa vazia criada por esta prova, com uma
    //    responsável descartável (e o 409 acima desaparece quando ela ganha um
    //    sucessor) e com uma conta STAFF apagada pela API.
    // A terceira recusa — a conta da plataforma — fica de fora de propósito: prová-la
    // aqui exigiria tocar o administrador real. Ela é conferida na suíte da API
    // (anonimizacao-e-exclusao-do-titular.test.ts), onde a conta é de mentira, assim
    // como "a senha antiga não abre mais a conta" e "com um sucessor na casa o 409
    // desaparece".
    console.log("== 2c) Aba Seus dados: anonimizar e excluir ==");

    const pedidosDaCaptura = contePedidosDeEliminacao(pagina);
    // Toda consulta de trilha abaixo é recortada por este instante: o banco de prova
    // acumula rodadas, e uma contagem sem recorte mediria o resíduo da anterior.
    const inicioDaEliminacao = new Date(Date.now() - 5000);

    const ondeSeEscreve = await pagina.evaluate(() =>
      [...document.querySelectorAll(".nx-bloco")].map((b) => ({
        titulo: (b.querySelector(".panel-title")?.textContent || "").trim(),
        campos: b.querySelectorAll("input:not([readonly]), textarea, select").length,
      })));
    ok("o painel de eliminação é o único que aceita escrita nesta aba",
      ondeSeEscreve.filter((b) => b.campos > 0).map((b) => b.titulo).join(",") === TITULO_ELIMINACAO,
      JSON.stringify(ondeSeEscreve));

    const botoesSemSenha = await botoesDeEliminacao(pagina);
    ok("os dois caminhos, pelo nome que a pessoa lê",
      botoesSemSenha.map((b) => b.texto).join(",") === "ANONIMIZAR A CONTA,EXCLUIR A CONTA",
      JSON.stringify(botoesSemSenha));
    ok("sem senha digitada nenhum dos dois aceita clique",
      botoesSemSenha.length === 2 && botoesSemSenha.every((b) => b.desabilitado),
      JSON.stringify(botoesSemSenha));
    ok("o vermelho de perigo é o da exclusão, e só ele",
      botoesSemSenha[0]?.perigo === false && botoesSemSenha[1]?.perigo === true,
      JSON.stringify(botoesSemSenha));

    const campoDeSenha = await pagina.evaluate((t, r) => {
      const campo = window.localDoCampo(t, r);
      return {
        tipo: campo?.querySelector("input")?.type ?? null,
        valor: campo?.querySelector("input")?.value ?? null,
        dica: campo?.querySelector(".field-hint")?.textContent.trim() ?? null,
      };
    }, TITULO_ELIMINACAO, "Senha para confirmar");
    ok("a confirmação é uma senha, não um texto qualquer",
      campoDeSenha.tipo === "password" && campoDeSenha.valor === "", JSON.stringify(campoDeSenha));
    ok("a tela diz o teto de três por minuto antes do pedido",
      /três por minuto/.test(campoDeSenha.dica || "") && /trilha de auditoria/.test(campoDeSenha.dica || ""),
      String(campoDeSenha.dica));

    await clicarEliminacao(pagina, "ANONIMIZAR A CONTA");
    await espera(400);
    ok("o botão apagado não dispara pedido nenhum",
      pedidosDaCaptura.length === 0, JSON.stringify(pedidosDaCaptura));

    await pagina.evaluate((t) => window.localDoBloco(t)?.scrollIntoView({ block: "center" }), TITULO_ELIMINACAO);
    await espera(250);
    await foto(pagina, "22-configuracoes-eliminar-dados");

    // A senha digitada aqui não é a da conta de captura: é uma senha falsa, escrita
    // justamente para que o pedido volte recuse sem que nada seja destruído. O valor
    // não importa para a guarda da empresa, mas importa para o 400 — e é ele que a
    // tela mostra.
    const SENHA_FALSA = "SenhaQueNaoVaiServir2026#";
    await escreverCampo(pagina, TITULO_ELIMINACAO, "Senha para confirmar", SENHA_FALSA);
    ok("com a senha digitada os dois botões liberam",
      (await botoesDeEliminacao(pagina)).every((b) => !b.desabilitado),
      JSON.stringify(await botoesDeEliminacao(pagina)));

    await clicarEliminacao(pagina, "ANONIMIZAR A CONTA");
    const dialogoDePerigo = await dialogo(pagina);
    ok("o pedido passa pelo diálogo de perigo do sistema (nada de confirm nativo)",
      dialogoDePerigo?.titulo === "Anonimizar a conta", JSON.stringify(dialogoDePerigo));
    ok("o diálogo escreve a conta que seria destruída",
      /Deseja realmente anonimizar/.test(dialogoDePerigo?.texto || "")
        && (dialogoDePerigo?.texto || "").includes(CAPTA.nome), String(dialogoDePerigo?.texto));
    ok("o segundo parágrafo diz que não há volta",
      /N[ãa]o h[áa] volta/.test(dialogoDePerigo?.detalhe || ""), String(dialogoDePerigo?.detalhe));
    ok("os botões do diálogo são Voltar e Anonimizar",
      dialogoDePerigo?.botoes.join(",") === "Voltar,Anonimizar", JSON.stringify(dialogoDePerigo?.botoes));
    await foto(pagina, "22-configuracoes-eliminar-dialogo");

    await clicarNoDialogo(pagina, "Voltar");
    ok("negar no diálogo não manda pedido nenhum",
      pedidosDaCaptura.length === 0, JSON.stringify(pedidosDaCaptura));
    ok("fechado o diálogo, a pessoa continua na própria tela",
      (await dialogo(pagina)) === null && (await pagina.evaluate(() => window.location.pathname)) === "/app/configuracoes");

    await clicarEliminacao(pagina, "ANONIMIZAR A CONTA");
    await clicarNoDialogo(pagina, "Anonimizar");
    await avisoComFoto(pagina, "A senha não confere", "22-configuracoes-eliminar-recusa-senha");
    ok("a tela fez exatamente um pedido, na porta de anonimizar",
      pedidosDaCaptura.length === 1 && /^POST \/.*lgpd\/minha-conta\/anonimizar$/.test(pedidosDaCaptura[0]),
      JSON.stringify(pedidosDaCaptura));
    ok("a recusa não despeja a pessoa da própria sessão",
      (await pagina.evaluate(() => window.location.pathname)) === "/app/configuracoes");
    ok("a senha digitada continua no campo, para tentar de novo sem redigitar",
      (await valorDoCampo(pagina, TITULO_ELIMINACAO, "Senha para confirmar")) === SENHA_FALSA);

    const recusaDeSenhaNaTrilha = await prisma.auditLog.findFirst({
      where: { action: "lgpd.anonymize.failed", userId: contaAntes.id, createdAt: { gte: inicioDaEliminacao } },
      orderBy: { createdAt: "desc" },
    });
    ok("a tentativa sem senha confere fica na trilha, com o motivo escrito",
      recusaDeSenhaNaTrilha?.entity === "user" && recusaDeSenhaNaTrilha?.entityId === contaAntes.id
        && recusaDeSenhaNaTrilha?.companyId === empresaAntes.id
        && /Senha apresentada n[ãa]o confere/.test(JSON.stringify(recusaDeSenhaNaTrilha?.metadata ?? {})),
      JSON.stringify(recusaDeSenhaNaTrilha?.metadata ?? null));
    const contaAposRecusa = await prisma.user.findUnique({ where: { id: contaAntes.id } });
    ok("nada foi destruído: a conta da captura segue ativa, com o mesmo nome",
      contaAposRecusa?.active === true && contaAposRecusa?.name === contaAntes.name
        && contaAposRecusa?.anonymizedAt === null,
      JSON.stringify({ ativa: contaAposRecusa?.active, nome: contaAposRecusa?.name }));

    // ------------------------------------------------- a casa que não pode ficar sem dono
    // A espera abaixo não é decoração: a leitura desta aba tem teto de cinco pedidos
    // por minuto pelo mesmo endereço, e a captura já gastou três (a consulta de
    // referência acima e as duas montagens do painel, que o React de desenvolvimento
    // faz). Cada janela nova monta o painel outra vez; sem virar a janela, o quarto
    // e o quinto pedidos chegariam num 429 e a prova fotografaria um erro de tela.
    console.log("  [leitura] esperando a janela de cinco por minuto virar (61s)...");
    await espera(61 * 1000);

    const casaSemSucessor = await criarCasaDeProva("Casa Sem Sucessor");
    const donaUnica = await criarContaDeProva(casaSemSucessor.id, "Prova Dona Unica", "OWNER");
    const janelaDaDona = await novaJanelaDeProva(browser, "dona", errosDeConsole);
    await entrarNoPainel(janelaDaDona.pagina, donaUnica.email, donaUnica.senha);
    await janelaDaDona.pagina.goto(BASE + "/app/configuracoes?aba=privacidade", { waitUntil: "networkidle0" });
    await janelaDaDona.pagina.waitForSelector(".nx-bloco", { timeout: 15000 });
    await semToast(janelaDaDona.pagina);
    ok("uma conta de outra casa recebe a mesma tela de eliminação",
      (await botoesDeEliminacao(janelaDaDona.pagina)).length === 2,
      JSON.stringify(await botoesDeEliminacao(janelaDaDona.pagina)));

    // Aqui a senha é a verdadeira: o que recusa este pedido não é a senha, é a casa.
    await escreverCampo(janelaDaDona.pagina, TITULO_ELIMINACAO, "Senha para confirmar", donaUnica.senha);
    await clicarEliminacao(janelaDaDona.pagina, "ANONIMIZAR A CONTA");
    await clicarNoDialogo(janelaDaDona.pagina, "Anonimizar");
    await avisoComFoto(janelaDaDona.pagina, "último responsável ativo", "22-configuracoes-eliminar-recusa-dona");
    ok("a dona solitária fez exatamente um pedido",
      janelaDaDona.pedidos.length === 1 && /anonimizar$/.test(janelaDaDona.pedidos[0]),
      JSON.stringify(janelaDaDona.pedidos));
    ok("recusado o pedido, ela continua logada na própria casa",
      (await janelaDaDona.pagina.evaluate(() => window.location.pathname)) === "/app/configuracoes");
    const recusaDaCasaNaTrilha = await prisma.auditLog.findFirst({
      where: { action: "lgpd.anonymize.blocked", userId: donaUnica.id, createdAt: { gte: inicioDaEliminacao } },
      orderBy: { createdAt: "desc" },
    });
    ok("a recusa da casa fica na trilha, com o nome dela escrito",
      recusaDaCasaNaTrilha?.companyId === casaSemSucessor.id
        && /Casa Sem Sucessor/.test(JSON.stringify(recusaDaCasaNaTrilha?.metadata ?? {})),
      JSON.stringify(recusaDaCasaNaTrilha?.metadata ?? null));
    const aposRecusaDaCasa = await prisma.user.findUnique({ where: { id: donaUnica.id } });
    ok("e a conta dela não mudou de nada",
      aposRecusaDaCasa?.active === true && aposRecusaDaCasa?.anonymizedAt === null);

    // ------------------------------------- o sucessor que destrava o direito, sem redigitar
    // A regra que recusa mora na casa, não na conta: criada uma segunda responsável
    // ativa, o mesmo botão — com a mesma senha ainda no campo, como a tela promete —
    // passa. É o que prova que o 409 acima não era uma porta trancada por ser porta.
    await criarContaDeProva(casaSemSucessor.id, "Prova Sucessor", "OWNER");
    await clicarEliminacao(janelaDaDona.pagina, "ANONIMIZAR A CONTA");
    await clicarNoDialogo(janelaDaDona.pagina, "Anonimizar");
    await avisoComFoto(janelaDaDona.pagina, "Seus dados pessoais foram removidos", "22-configuracoes-eliminar-sucesso");
    ok("o segundo pedido saiu do mesmo botão, com a senha que já estava no campo",
      janelaDaDona.pedidos.length === 2 && /^POST \/.*lgpd\/minha-conta\/anonimizar$/.test(janelaDaDona.pedidos[1]),
      JSON.stringify(janelaDaDona.pedidos));
    const saidaDaDona = await janelaDaDona.pagina.evaluate(() => window.location.pathname);
    ok("exercido o direito, a sessão acaba e a pessoa volta para a porta de entrada",
      saidaDaDona === "/", saidaDaDona);

    const anonimizada = await retratoDaConta(donaUnica.id);
    ok("o nome virou rótulo fixo e o endereço virou protocolo",
      anonimizada.user?.name === "Titular anonimizado"
        && /^titular-anonimizado\+.+@invalid$/.test(anonimizada.user?.email || ""),
      JSON.stringify({ nome: anonimizada.user?.name, email: anonimizada.user?.email }));
    ok("a conta continua existindo como número, e não serve mais para entrar",
      anonimizada.user?.active === false && anonimizada.user?.anonymizedAt instanceof Date
        && anonimizada.sessoes === 0 && anonimizada.vinculos === 1,
      JSON.stringify({ ativa: anonimizada.user?.active, sessoes: anonimizada.sessoes, vinculos: anonimizada.vinculos }));
    const linhaDaAnonimizacao = await prisma.auditLog.findFirst({
      where: { action: "lgpd.anonymize", entityId: donaUnica.id, createdAt: { gte: inicioDaEliminacao } },
      orderBy: { createdAt: "desc" },
    });
    ok("a anonimização fica na trilha com a contagem do que sobrou",
      linhaDaAnonimizacao?.userId === donaUnica.id
        && /preservado/.test(JSON.stringify(linhaDaAnonimizacao?.metadata ?? {})),
      JSON.stringify(linhaDaAnonimizacao?.metadata ?? null));
    ok("e a casa continuou com um responsável ativo: o direito não deixou ninguém órfão",
      (await prisma.companyUser.count({
        where: { companyId: casaSemSucessor.id, role: "OWNER", user: { active: true } },
      })) === 1);
    await janelaDaDona.pagina.close().catch(() => {});
    await janelaDaDona.contexto.close().catch(() => {});

    // ------------------------------------------------------------------ a exclusão
    // O caminho que apaga a linha corre pela API, numa conta STAFF da casa de prova:
    // a interface dos dois botões já foi provada no navegador acima, e aqui o que
    // importa é o banco. A senha falsa vai na porta de EXCLUIR porque o teto de três
    // por minuto é por rota — a de anonimizar já gastou a sua janela.
    const excluirDe = await criarContaDeProva(casaSemSucessor.id, "Prova Excluir");
    const tokenExclusao = await tokenDaConta(excluirDe.email, excluirDe.senha);

    const recusaDeSenha = await chameCom(tokenExclusao, "POST", EXCLUIR, { senha: "SenhaTrocada2027#" });
    ok("senha que não confere devolve 400 com a regra escrita",
      recusaDeSenha.status === 400 && /senha n[ãa]o confere/.test(recusaDeSenha.dados.message || ""),
      recusaDeSenha.status + " " + JSON.stringify(recusaDeSenha.dados).slice(0, 160));
    const intacta = await retratoDaConta(excluirDe.id);
    ok("a recusa não mexe em linha nenhuma",
      intacta.user?.name === "Prova Excluir" && intacta.user?.active === true
        && intacta.user?.anonymizedAt === null && intacta.sessoes > 0,
      JSON.stringify({ nome: intacta.user?.name, ativa: intacta.user?.active, sessoes: intacta.sessoes }));
    ok("a tentativa sem senha confere fica na trilha da exclusão",
      (await prisma.auditLog.count({
        where: { action: "lgpd.delete.failed", userId: excluirDe.id, createdAt: { gte: inicioDaEliminacao } },
      })) >= 1);

    const respostaDeExclusao = await chameCom(tokenExclusao, "POST", EXCLUIR, { senha: excluirDe.senha });
    ok("a exclusão devolve 200 com a frase do servidor",
      respostaDeExclusao.status === 200 && /exclu[íi]da/.test(respostaDeExclusao.dados.aviso || ""),
      respostaDeExclusao.status + " " + String(respostaDeExclusao.dados.aviso).slice(0, 120));
    const sobrouDaExclusao = await retratoDaConta(excluirDe.id);
    ok("a linha do cadastro saiu, junto do vínculo e das sessões",
      sobrouDaExclusao.user === null && sobrouDaExclusao.vinculos === 0 && sobrouDaExclusao.sessoes === 0,
      JSON.stringify({ user: sobrouDaExclusao.user, vinculos: sobrouDaExclusao.vinculos }));
    const linhaDaExclusao = await prisma.auditLog.findFirst({
      where: { action: "lgpd.delete", entityId: excluirDe.id, createdAt: { gte: inicioDaEliminacao } },
      orderBy: { createdAt: "desc" },
    });
    ok("a linha que conta o pedido sobrevive sem dono",
      linhaDaExclusao?.userId === null && linhaDaExclusao?.companyId === casaSemSucessor.id,
      JSON.stringify({ userId: linhaDaExclusao?.userId, companyId: linhaDaExclusao?.companyId }));

    // ------------------------------------------------------------------ o teto
    // Três pedidos por minuto por endereço na porta de anonimizar, conferidos com o
    // balde zerado: os três acima (a recusa de senha da captura, a recusa de casa e o
    // sucesso) gastariam a janela, e a espera de um minuto é o que transforma a
    // medição em contagem. Os pedidos são sem sessão de propósito — se o limitador
    // barra antes do `authenticate`, os três primeiros devolvem 401 e o quarto, 429.
    console.log("  [teto] esperando a janela de um minuto virar (61s)...");
    await espera(61 * 1000);
    const rajada = [];
    for (let i = 0; i < 4; i++) {
      const pedido = await chameCom(null, "POST", ANONIMIZAR, { senha: "x" });
      rajada.push({ status: pedido.status, teto: pedido.headers.get("x-ratelimit-limit") });
    }
    ok("três pedidos passam e o quarto é barrado antes de chegar à guarda",
      rajada.map((r) => r.status).join(",") === "401,401,401,429",
      JSON.stringify(rajada));
    ok("o teto anunciado na resposta é três",
      rajada[3].teto === "3", String(rajada[3].teto));

    // == 3) Empresa ==
    console.log("== 3) Aba Empresa: cadastro, endereço, formato, logo, meta e as duas políticas ==");
    await irParaAba(pagina, "empresa");
    const titulos = await pagina.$$eval(".nx-bloco .panel-title", (els) => els.map((e) => e.textContent.trim()));
    ok("sete blocos independentes", titulos.join(",") ===
      "Identificação,Endereço,Formato de números e datas,Identidade visual,Meta de receita do mês,Política de estoque,Lançamento automático no financeiro", titulos.join(","));

    const listas = await pagina.evaluate(() => ({
      moedas: window.localDoCampo("Formato de números e datas", "Moeda")?.querySelector("select")?.options.length ?? 0,
      ufs: window.localDoCampo("Endereço", "Estado (UF)")?.querySelector("select")?.options.length ?? 0,
      idioma: window.localDoCampo("Formato de números e datas", "Idioma da numeração")?.querySelector("select")?.value ?? null,
    }));
    ok("a lista de moedas vem da API (12)", listas.moedas === 12, String(listas.moedas));
    ok("as 27 UFs aparecem no select de estado", listas.ufs === 27, String(listas.ufs));
    ok("o idioma atual vem marcado", listas.idioma === empresaAntes.language, String(listas.idioma));

    await escreverCampo(pagina, "Identificação", "CNPJ", CNPJ_INVALIDO);
    await salvarBloco(pagina, "Identificação");
    const erroCnpj = await erroDoCampo(pagina, "Identificação", "CNPJ");
    ok("CNPJ com dígito verificador errado é rejeitado no campo", /CNPJ inválido/.test(erroCnpj || ""), String(erroCnpj));
    await foto(pagina, "22-configuracoes-erro-cnpj");
    await semToast(pagina);

    await escreverCampo(pagina, "Identificação", "CNPJ", CNPJ_VALIDO);
    await salvarBloco(pagina, "Identificação");
    await avisoDe(pagina, "Dados da empresa atualizados.");
    let atual = (await chame("GET", "/companies/current")).dados;
    ok("a API normaliza o CNPJ em 14 dígitos", atual.cnpj === CNPJ_DIGITOS, String(atual.cnpj));
    ok("a tela re-mascara o valor que voltou do servidor",
      (await valorDoCampo(pagina, "Identificação", "CNPJ")) === CNPJ_VALIDO);
    ok("gravar um bloco não toca nos campos dos outros",
      atual.currency === empresaAntes.currency && atual.timezone === empresaAntes.timezone
        && String(atual.revenueTarget) === String(empresaAntes.revenueTarget));

    await escreverCampo(pagina, "Endereço", "CEP", CEP_PROVA);
    await escreverCampo(pagina, "Endereço", "Cidade", "São Paulo");
    await selecionarCampo(pagina, "Endereço", "Estado (UF)", "SP");
    await salvarBloco(pagina, "Endereço");
    await avisoDe(pagina, "Dados da empresa atualizados.");
    atual = (await chame("GET", "/companies/current")).dados;
    ok("CEP guardado sem máscara", atual.zipCode === "01310100", String(atual.zipCode));
    ok("UF e cidade gravadas", atual.stateUf === "SP" && atual.city === "São Paulo",
      atual.stateUf + " / " + atual.city);

    await selecionarCampo(pagina, "Formato de números e datas", "Moeda", "USD");
    await salvarBloco(pagina, "Formato de números e datas");
    await avisoDe(pagina, "Dados da empresa atualizados.");
    atual = (await chame("GET", "/companies/current")).dados;
    const meMoeda = (await chame("GET", "/auth/me")).dados;
    ok("moeda nova na empresa e na sessão", atual.currency === "USD" && meMoeda.currency === "USD",
      atual.currency + " / " + meMoeda.currency);

    await escreverCampo(pagina, "Identidade visual", "Endereço da logo", "logo.minhaempresa");
    await salvarBloco(pagina, "Identidade visual");
    const erroLogo = await erroDoCampo(pagina, "Identidade visual", "Endereço da logo");
    ok("endereço de logo sem http(s) é rejeitado", /http\(s\)/.test(erroLogo || ""), String(erroLogo));
    await semToast(pagina);
    // O 400 derrubou a escrita: o valor rejeitado nunca chegou ao banco, então
    // apagar o campo devolve o texto original e o bloco fica sem nada a gravar.
    await escreverCampo(pagina, "Identidade visual", "Endereço da logo", "");
    ok("campo rejeitado volta ao original e o botão desliga",
      (await blocoDe(pagina, "Identidade visual")).botao?.desabilitado === true);
    ok("sem logo, a tela explica o que o painel mostra",
      /Sem logo cadastrada/.test(await textoDaPagina(pagina)));

    await escreverCampo(pagina, "Meta de receita do mês", "Valor da meta", "25000");
    await salvarBloco(pagina, "Meta de receita do mês");
    await avisoDe(pagina, "Meta de receita atualizada.");
    atual = (await chame("GET", "/companies/current")).dados;
    ok("meta gravada como número", Number(atual.revenueTarget) === 25000, String(atual.revenueTarget));
    const dicaMeta = await pagina.evaluate((t) =>
      window.localDoCampo(t, "Valor da meta")?.querySelector(".field-hint")?.textContent.trim() ?? null,
      "Meta de receita do mês");
    ok("a dica escreve a meta no formato da empresa",
      /US\$/.test(dicaMeta || "") && /25\.000/.test(dicaMeta || ""), String(dicaMeta));

    // Fase 3b: a política de estoque mora no switch do bloco novo. A prova
    // liga, grava, confere no GET e desliga de volta — o que cada porta de
    // saída faz com a chave ligada é o suite estoque-politica.test.ts.
    await pagina.evaluate(() => {
      window.localDoBloco("Política de estoque")?.querySelector("input[type=checkbox]")?.click();
    });
    await espera(150);
    ok("ligar o switch acende o bloco", await pagina.evaluate(() =>
      window.localDoBloco("Política de estoque")?.querySelector(".nx-ligado")?.classList.contains("is-on") ?? false));
    await salvarBloco(pagina, "Política de estoque");
    await avisoDe(pagina, "Saídas agora podem deixar o estoque negativo.");
    atual = (await chame("GET", "/companies/current")).dados;
    ok("a política ligada grava no servidor", atual.allowNegativeStock === true, String(atual.allowNegativeStock));
    await pagina.evaluate(() => {
      window.localDoBloco("Política de estoque")?.querySelector("input[type=checkbox]")?.click();
    });
    await espera(150);
    const estadoSwitch = await pagina.evaluate(() => {
      const bloco = window.localDoBloco("Política de estoque");
      const cx = bloco?.querySelector("input[type=checkbox]");
      const bt = bloco?.querySelector(".nx-bloco-acao button");
      return { checked: cx?.checked ?? null, botaoDesabilitado: bt?.disabled ?? null, botao: bt?.textContent.trim() ?? null };
    });
    console.log("  [switch->off] " + JSON.stringify(estadoSwitch));
    await salvarBloco(pagina, "Política de estoque");
    await avisoDe(pagina, "Pronto: nenhuma saída passa sem saldo cobrir a quantidade.");
    atual = (await chame("GET", "/companies/current")).dados;
    ok("desligada volta ao padrão fechado", atual.allowNegativeStock === false, String(atual.allowNegativeStock));

    // Fase 3e: o bloco de lançamento automático tem duas chaves e um botão. A
    // prova inverte a primeira e confere no GET que a segunda não foi tocada —
    // escrita parcial é a regra de todos os blocos desta tela, agora com dois
    // booleanos no mesmo payload. O que a geração faz com a chave ligada é o
    // suite parcelamento.test.ts; aqui se prova a porta e a tela.
    const BLOCO_LANC = "Lançamento automático no financeiro";
    const chavesDoBloco = () => pagina.evaluate((t) =>
      [...(window.localDoBloco(t)?.querySelectorAll("input[type=checkbox]") || [])].map((c) => c.checked), BLOCO_LANC);
    const estadoAntesDeLancar = await chavesDoBloco();
    ok("o bloco traz uma chave por política", estadoAntesDeLancar.length === 2, JSON.stringify(estadoAntesDeLancar));
    ok("a tela mostra o que está salvo",
      estadoAntesDeLancar[0] === empresaAntes.autoFinanceSales && estadoAntesDeLancar[1] === empresaAntes.autoFinancePurchases,
      JSON.stringify(estadoAntesDeLancar));

    await pagina.evaluate((t) => { window.localDoBloco(t)?.querySelectorAll("input[type=checkbox]")?.[0]?.click(); }, BLOCO_LANC);
    await espera(150);
    await salvarBloco(pagina, BLOCO_LANC);
    await avisoDe(pagina, "Política de lançamento automático atualizada.");
    atual = (await chame("GET", "/companies/current")).dados;
    ok("inverter só a venda grava só a venda",
      atual.autoFinanceSales === !empresaAntes.autoFinanceSales
        && atual.autoFinancePurchases === empresaAntes.autoFinancePurchases,
      String(atual.autoFinanceSales) + " / " + String(atual.autoFinancePurchases));
    const dicaDaVenda = await pagina.evaluate((t) =>
      window.localDoBloco(t)?.querySelectorAll(".field-hint")?.[0]?.textContent.trim() ?? null, BLOCO_LANC);
    ok("a dica da venda explica as parcelas", /parcela/.test(dicaDaVenda || ""), String(dicaDaVenda));

    await pagina.evaluate((t) => { window.localDoBloco(t)?.querySelectorAll("input[type=checkbox]")?.[1]?.click(); }, BLOCO_LANC);
    await espera(150);
    await salvarBloco(pagina, BLOCO_LANC);
    await avisoDe(pagina, "Política de lançamento automático atualizada.");
    atual = (await chame("GET", "/companies/current")).dados;
    ok("a segunda chave grava sem desfazer a primeira",
      atual.autoFinanceSales === !empresaAntes.autoFinanceSales
        && atual.autoFinancePurchases === !empresaAntes.autoFinancePurchases,
      String(atual.autoFinanceSales) + " / " + String(atual.autoFinancePurchases));
    await foto(pagina, "22-configuracoes-lancamento-automatico");

    // Devolve as duas ao que a casa tinha: o botão fica ativo só com as duas
    // invertidas, e o mesmo clique nas duas cai de volta no estado original.
    await pagina.evaluate((t) => {
      const caixas = window.localDoBloco(t)?.querySelectorAll("input[type=checkbox]");
      caixas?.[0]?.click();
      caixas?.[1]?.click();
    }, BLOCO_LANC);
    await espera(150);
    await salvarBloco(pagina, BLOCO_LANC);
    await avisoDe(pagina, "Política de lançamento automático atualizada.");
    atual = (await chame("GET", "/companies/current")).dados;
    ok("as duas voltam ao estado da casa",
      atual.autoFinanceSales === empresaAntes.autoFinanceSales
        && atual.autoFinancePurchases === empresaAntes.autoFinancePurchases,
      String(atual.autoFinanceSales) + " / " + String(atual.autoFinancePurchases));
    await foto(pagina, "22-configuracoes-empresa");

    // == 4) Aparência ==
    console.log("== 4) Aba Aparência: tema deste navegador e formato do painel ==");
    await irParaAba(pagina, "aparencia");
    ok("o tema inicial é o escuro",
      (await pagina.evaluate(() => document.documentElement.getAttribute("data-theme"))) === "dark");
    await pagina.evaluate(() => {
      [...document.querySelectorAll(".theme-choice button")].find((b) => b.textContent.trim() === "Claro")?.click();
    });
    await espera(350);
    ok("o botão Claro troca o tema na hora",
      (await pagina.evaluate(() => document.documentElement.getAttribute("data-theme"))) === "light");
    await pagina.evaluate(() => {
      [...document.querySelectorAll(".theme-choice button")].find((b) => b.textContent.trim() === "Escuro")?.click();
    });
    await espera(350);
    ok("o botão Escuro devolve",
      (await pagina.evaluate(() => document.documentElement.getAttribute("data-theme"))) === "dark");

    const previa = await pagina.evaluate(() => {
      const bloco = window.localDoBloco("Formato em uso no painel");
      return [...(bloco?.querySelectorAll(".kv dd") || [])].map((d) => d.textContent.trim());
    });
    ok("a prévia escreve o valor com a moeda da empresa",
      previa.length === 3 && /US\$/.test(previa[0]), previa.join(" | "));
    await foto(pagina, "22-configuracoes-aparencia");

    await pagina.evaluate(() => {
      const botao = [...document.querySelectorAll(".nx-bloco-acao button")]
        .find((b) => b.textContent.trim() === "Ajustar na aba Empresa");
      botao?.click();
    });
    await espera(400);
    ok("o atalho leva à aba onde o formato se ajusta",
      (await pagina.evaluate(() => document.querySelector(".nx-tab.is-active")?.dataset.tab)) === "empresa");

    // == 5) O painel inteiro obedece ==
    console.log("== 5) Dashboard: a meta cadastrada vira régua ==");
    await pagina.goto(BASE + "/app", { waitUntil: "networkidle0" });
    await pagina.waitForSelector(".nx-tabs", { timeout: 15000 });
    await pagina.evaluate(() => document.querySelector('.nx-tab[data-tab="metas"]')?.click());
    await espera(1500);
    // Intl escreve "US$" seguido de espaço inseparável (U+00A0); a checagem
    // normaliza para não trocar um falso negativo por detalhe de tipografia.
    const painel = (await textoDaPagina(pagina)).replace(/\u00A0/g, " ");
    ok("o card de meta traz o valor gravado em Configurações",
      /Alvo de US\$ 25\.000,00/.test(painel), (painel.match(/Alvo de[^\n]*/) || [""])[0]);
    ok("a faixa \"nenhuma meta\" sumiu", !/Nenhuma meta cadastrada/.test(painel));

    // == 6) Empresas ==
    console.log("== 6) Aba Empresas: a porta entre os contextos ==");
    await pagina.goto(BASE + "/app/configuracoes?aba=acesso", { waitUntil: "networkidle0" });
    await pagina.waitForSelector(".nx-bloco", { timeout: 15000 });
    const listaEmpresas = await pagina.evaluate(() => {
      const item = document.querySelector(".company-item.is-current");
      return {
        nome: item?.querySelector(".company-name")?.textContent.trim() ?? null,
        botao: item?.querySelector("button")?.textContent.trim() ?? null,
        desabilitado: item?.querySelector("button")?.disabled ?? null,
        auditoria: document.querySelector(".nx-bloco-acao a")?.getAttribute("href") ?? null,
      };
    });
    ok("a empresa ativa está marcada e não se auto-oferece",
      listaEmpresas.nome === empresaAntes.name && listaEmpresas.botao === "Atual"
        && listaEmpresas.desabilitado === true, JSON.stringify(listaEmpresas));
    ok("quem tem audit:read enxerga a trilha", listaEmpresas.auditoria === "/app/auditoria",
      String(listaEmpresas.auditoria));
    await foto(pagina, "22-configuracoes-empresas");

    // == 7) Devolver tudo ==
    console.log("== 7) Devolver a empresa ao estado anterior ==");
    await irParaAba(pagina, "empresa");
    await escreverCampo(pagina, "Identificação", "CNPJ", "");
    await salvarBloco(pagina, "Identificação");
    await avisoDe(pagina, "Dados da empresa atualizados.");
    atual = (await chame("GET", "/companies/current")).dados;
    ok("limpar o campo pela tela apaga o registro", vazio(atual.cnpj), String(atual.cnpj));

    const pendentes = diferencas(empresaAntes, atual);
    const restaurar = {};
    for (const campo of pendentes) {
      const original = empresaAntes[campo];
      restaurar[campo] = vazio(original) ? (campo === "revenueTarget" ? null : "") : original;
    }
    const resposta = await chame("PATCH", "/companies/current", restaurar);
    ok("a restauração passa pela mesma API da tela", resposta.status === 200,
      resposta.status + " " + JSON.stringify(restaurar));
    const empresaDepois = (await chame("GET", "/companies/current")).dados;
    ok("a empresa voltou exatamente ao que era", diferencas(empresaAntes, empresaDepois).length === 0,
      "diferentes: " + diferencas(empresaAntes, empresaDepois).join(","));

    if (!vazio(contaAntes.phone)) {
      await chame("PATCH", "/auth/me", { phone: contaAntes.phone });
    }

    await irParaAba(pagina, "conta");
    await foto(pagina, "22-configuracoes-limpo");

    // == 8) Papel que não pode gravar ==
    console.log("== 8) STAFF: enxerga tudo, não grava nada ==");
    const contexto = await (browser.createBrowserContext
      ? browser.createBrowserContext()
      : browser.createIncognitoBrowserContext());
    const paginaStaff = await contexto.newPage();
    await injetarAjuda(paginaStaff);
    await paginaStaff.setViewport({ width: 1440, height: 900 });
    paginaStaff.on("pageerror", (e) => errosDeConsole.push("staff: " + String(e)));
    await entrarNoPainel(paginaStaff, staff.email, staff.senha);
    await paginaStaff.goto(BASE + "/app/configuracoes?aba=empresa", { waitUntil: "networkidle0" });
    await paginaStaff.waitForSelector(".nx-painel", { timeout: 15000 });

    const leitura = await paginaStaff.evaluate(() => ({
      faixa: document.querySelector(".status-pill.is-off")?.textContent.trim() ?? null,
      blocos: document.querySelectorAll(".nx-bloco").length,
      botoes: document.querySelectorAll(".nx-bloco-acao button").length,
      notas: document.querySelectorAll(".nx-bloco-nota").length,
      campoTravado: window.localDoCampo("Identificação", "CNPJ")?.querySelector("input")?.disabled ?? null,
      listaTravada: window.localDoCampo("Formato de números e datas", "Moeda")?.querySelector("select")?.disabled ?? null,
      rota: window.location.pathname,
    }));
    ok("a tela avisa que é somente leitura", leitura.faixa === "Somente leitura", String(leitura.faixa));
    ok("o STAFF lê a empresa inteira", leitura.rota === "/app/configuracoes" && leitura.blocos === 7,
      JSON.stringify(leitura));
    ok("nenhum botão de gravar em bloco algum", leitura.botoes === 0, String(leitura.botoes));
    ok("cada bloco explica quem grava ali", leitura.notas === 7, String(leitura.notas));
    ok("campos e listas aparecem travados",
      leitura.campoTravado === true && leitura.listaTravada === true, JSON.stringify(leitura));
    await foto(paginaStaff, "22-configuracoes-somente-leitura");

    await irParaAba(paginaStaff, "conta");
    ok("o próprio nome, ele pode mudar",
      (await campoDesabilitado(paginaStaff, "Seus dados", "Nome")) === false);

    // A mesma aba, vista por quem não administra: o dado lido é o dela, e o do dono
    // da empresa não aparece. É o isolamento do artigo 18 conferido na tela.
    await irParaAba(paginaStaff, "privacidade");
    await paginaStaff.waitForSelector(".nx-bloco", { timeout: 15000 });
    const fotoStaff = await paginaStaff.evaluate((t) => {
      const bloco = window.localDoBloco(t);
      return [...(bloco?.querySelectorAll(".nx-grade .field") || [])].map((f) => {
        const rotulo = (f.querySelector(".field-label")?.textContent || "").trim();
        const valor = (f.querySelector(".field-label")?.nextElementSibling?.textContent || "").trim();
        return rotulo + "=" + valor;
      });
    }, "Seus dados");
    ok("o STAFF lê a própria conta, não a de quem administra",
      fotoStaff.includes("E-mail de acesso=" + staff.email)
        && !fotoStaff.some((l) => l.includes(CAPTA.email)),
      fotoStaff.join(" | "));
    ok("o papel exibido é o dele nesta empresa",
      fotoStaff.includes("Papel na empresa ativa=STAFF"), fotoStaff.join(" | "));
    await foto(paginaStaff, "22-configuracoes-seus-dados-staff");
    await irParaAba(paginaStaff, "conta");

    await escreverCampo(paginaStaff, "Senha de acesso", "Senha atual", staff.senha);
    await escreverCampo(paginaStaff, "Senha de acesso", "Nova senha", "abc");
    await escreverCampo(paginaStaff, "Senha de acesso", "Confirme a nova senha", "abc");
    await salvarBloco(paginaStaff, "Senha de acesso");
    ok("senha fraca é barrada antes de sair da tela",
      Boolean(await erroDoCampo(paginaStaff, "Senha de acesso", "Nova senha")));

    await escreverCampo(paginaStaff, "Senha de acesso", "Senha atual", "SenhaErrada2026#");
    await escreverCampo(paginaStaff, "Senha de acesso", "Nova senha", "ProvaLeitura2027#");
    await escreverCampo(paginaStaff, "Senha de acesso", "Confirme a nova senha", "ProvaLeitura2027#");
    await salvarBloco(paginaStaff, "Senha de acesso");
    await avisoDe(paginaStaff, "A senha atual não confere");

    await escreverCampo(paginaStaff, "Senha de acesso", "Senha atual", staff.senha);
    await escreverCampo(paginaStaff, "Senha de acesso", "Nova senha", "ProvaLeitura2027#");
    await escreverCampo(paginaStaff, "Senha de acesso", "Confirme a nova senha", "ProvaLeitura2027#");
    await salvarBloco(paginaStaff, "Senha de acesso");
    await avisoDe(paginaStaff, "Senha alterada");
    const continua = await paginaStaff.evaluate(() => ({
      rota: window.location.pathname,
      quem: document.querySelector(".page-sub")?.textContent.trim() ?? null,
    }));
    ok("trocar a senha não despeja a pessoa da própria sessão",
      continua.rota === "/app/configuracoes" && /Prova Leitura/.test(continua.quem || ""),
      JSON.stringify(continua));
    await paginaStaff.close();
    await contexto.close();

    // == 9) Prints da casa ==
    console.log("== 9) Prints: tema claro e celular ==");
    await pagina.goto(BASE + "/app/configuracoes?aba=aparencia", { waitUntil: "networkidle0" });
    await pagina.waitForSelector(".nx-bloco", { timeout: 15000 });
    await pagina.evaluate(() => {
      [...document.querySelectorAll(".theme-choice button")].find((b) => b.textContent.trim() === "Claro")?.click();
    });
    await espera(400);
    await pagina.goto(BASE + "/app/configuracoes", { waitUntil: "networkidle0" });
    await pagina.waitForSelector(".nx-painel", { timeout: 15000 });
    await semToast(pagina);
    await foto(pagina, "06-configuracoes-claro");

    await pagina.goto(BASE + "/app/configuracoes?aba=aparencia", { waitUntil: "networkidle0" });
    await pagina.waitForSelector(".nx-bloco", { timeout: 15000 });
    await pagina.evaluate(() => {
      [...document.querySelectorAll(".theme-choice button")].find((b) => b.textContent.trim() === "Escuro")?.click();
    });
    await espera(400);
    await pagina.setViewport({ width: 390, height: 844 });
    await pagina.goto(BASE + "/app/configuracoes?aba=empresa", { waitUntil: "networkidle0" });
    await pagina.waitForSelector(".nx-painel", { timeout: 15000 });
    const noCelular = await pagina.evaluate(() => {
      const grade = document.querySelector(".nx-grade");
      return {
        colunas: grade ? getComputedStyle(grade).gridTemplateColumns.split(" ").length : 0,
        abas: Boolean(document.querySelector(".nx-tabs")),
      };
    });
    ok("no celular a grade dos campos vira uma coluna", noCelular.colunas === 1, String(noCelular.colunas));
    ok("a barra de abas continua acessível", noCelular.abas);
    await foto(pagina, "22-configuracoes-celular");
    await pagina.setViewport({ width: 1440, height: 900 });
    await pagina.close();
  } finally {
    await browser.close().catch(() => {});
    // Toda conta criada por aqui sai do banco, inclusive a que a própria prova
    // anonimizou (ela continua sendo uma linha, agora sem nome) e a que a prova
    // excluiu (essa já sumiu sozinha, e o delete abaixo reclama em silêncio).
    // As casas de prova saem depois das contas: enquanto houver membro, a chave
    // estrangeira não deixa apagar a empresa.
    if (prisma) {
      for (const conta of contasDeProva) {
        // A conta que a própria prova excluiu já não tem linha: apagar de novo
        // seria reclamar de um trabalho que o produto fez.
        if ((await prisma.user.count({ where: { id: conta.id } })) === 0) continue;
        try {
          await prisma.loginAttempt.deleteMany({ where: { email: conta.email } });
          await prisma.user.delete({ where: { id: conta.id } });
        } catch (e) {
          console.log("  [limpeza] " + conta.email + ": " + e.message);
        }
      }
      for (const casa of casasDeProva) {
        try {
          await prisma.company.delete({ where: { id: casa.id } });
        } catch (e) {
          console.log("  [limpeza] casa " + casa.slug + ": " + e.message);
          casasSobrantes.push(casa.slug);
        }
      }
      for (const conta of contasDeProva) {
        if (await prisma.user.count({ where: { id: conta.id } })) {
          contasSobrantes.push(conta.email);
        }
      }
      console.log("  [banco] " + contasDeProva.length + " contas e " + casasDeProva.length
        + " casas de prova criadas, " + contasSobrantes.length + " contas e "
        + casasSobrantes.length + " casas sobrando");
      await prisma.$disconnect().catch(() => {});
    }
  }

  const empresaFinal = (await chame("GET", "/companies/current")).dados;
  const contaFinal = (await chame("GET", "/auth/me")).dados;
  console.log("== Estado final ==");
  console.log("  empresa: " + JSON.stringify(Object.fromEntries(CAMPOS_EMPRESA.map((c) => [c, empresaFinal[c]]))));
  console.log("  conta: nome=" + contaFinal.name + " telefone=" + String(contaFinal.phone));
  ok("nada sobrou alterado na empresa", diferencas(empresaAntes, empresaFinal).length === 0);
  ok("nada sobrou alterado na conta",
    contaFinal.name === contaAntes.name && String(contaFinal.phone ?? "") === String(contaAntes.phone ?? ""));
  ok("nenhuma conta de prova ficou no banco", contasSobrantes.length === 0, contasSobrantes.join(","));
  ok("nenhuma casa de prova ficou no banco", casasSobrantes.length === 0, casasSobrantes.join(","));
  const soDeVerdade = errosDeConsole.filter((t) => !ruidoDeRede(t));
  ok("nenhum erro de JavaScript no caminho", soDeVerdade.length === 0, soDeVerdade.slice(0, 3).join(" | "));

  console.log("\n" + checks + " checagens · " + falhas.length + " falhas");
  if (falhas.length) {
    console.log(falhas.map((f) => "  - " + f).join("\n"));
    process.exit(1);
  }
  console.log("Configurações provadas: cinco abas, gravação bloco a bloco, validação no campo, leitura travada, a cópia da LGPD e os dois direitos que apagam no navegador.");
})();
