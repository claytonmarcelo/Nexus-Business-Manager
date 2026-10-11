// Prova do /app/configuracoes: as quatro abas gravam de verdade, cada bloco solta
// só o que mudou, e o que a API reprova aparece embaixo do campo — não num aviso
// genérico que a pessoa lê e não sabe onde corrigir.
//
// A prova escreve na empresa e na conta do administrador de propósito (é o único
// cadastro com papel de escrita) e devolve tudo ao valor que encontrou no início.
// O papel que não pode gravar é conferido com um usuário de prova criado no banco
// e apagado no fim: sem rota de exclusão de usuário no produto, ele não pode
// deixar rastro nem aparecer numa listagem.
const puppeteer = require("puppeteer-core");
const path = require("path");
const { EMAIL_ADMIN, SENHA_ADMIN } = require("./senha-admin.cjs");

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
  try {
    dados = JSON.parse(texto);
  } catch {
    dados = { texto };
  }
  return { status: res.status, dados };
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

async function avisoDe(page, trecho) {
  const visto = await page
    .waitForFunction((t) => [...document.querySelectorAll(".toast-message")]
      .some((m) => (m.textContent || "").includes(t)), { timeout: 12000 }, trecho)
    .then(() => true)
    .catch(() => false);
  ok("a tela avisa: " + trecho, visto);
  await semToast(page);
}

async function semToast(page) {
  await page
    .waitForFunction(() => !document.querySelector(".toast-message, .toast"), { timeout: 12000 })
    .catch(() => {});
  await espera(250);
}

async function foto(page, nome) {
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
// Só o usuário de papel STAFF, criado e apagado por aqui.
let prisma = null;
async function abrirBanco() {
  require("dotenv").config({ path: path.join(__dirname, "..", "apps", "api", ".env") });
  const { PrismaClient } = require("@prisma/client");
  prisma = new PrismaClient();
}

async function criarStaff(companyId) {
  const bcrypt = require("bcryptjs");
  const email = "prova-config-" + Date.now() + "@nexus.prova";
  const senha = "ProvaLeitura2026#";
  const user = await prisma.user.create({
    data: { email, name: "Prova Leitura", passwordHash: await bcrypt.hash(senha, 12) },
  });
  await prisma.companyUser.create({ data: { userId: user.id, companyId, role: "STAFF" } });
  console.log("  [banco] STAFF de prova criado: " + email);
  return { id: user.id, email, senha };
}

// --------------------------------------------------------------- valores da casa
const CAMPOS_EMPRESA = [
  "name", "legalName", "tradeName", "cnpj", "phone", "email", "zipCode", "street",
  "number", "district", "city", "stateUf", "logoUrl", "currency", "timezone",
  "language", "revenueTarget",
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
  const login = await chame("POST", "/auth/login", { email: EMAIL_ADMIN, password: SENHA_ADMIN });
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

  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: "new",
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });

  const errosDeConsole = [];
  let staffApagado = false;

  try {
    const pagina = await browser.newPage();
    await injetarAjuda(pagina);
    await pagina.setViewport({ width: 1440, height: 900 });
    pagina.on("console", (m) => { if (m.type() === "error") errosDeConsole.push(m.text()); });
    pagina.on("pageerror", (e) => errosDeConsole.push(String(e)));

    // == 1) Entrada e as quatro abas ==
    console.log("== 1) Entrar em Configurações ==");
    await entrarNoPainel(pagina, EMAIL_ADMIN, SENHA_ADMIN);
    await pagina.goto(BASE + "/app/configuracoes", { waitUntil: "networkidle0" });
    await pagina.waitForSelector(".nx-painel", { timeout: 15000 });

    const linkMenu = await pagina.evaluate(() =>
      [...document.querySelectorAll(".admin-nav-item")]
        .find((a) => (a.textContent || "").includes("Configurações"))?.getAttribute("href") ?? null);
    ok("o menu tem o link de Configurações", linkMenu === "/app/configuracoes", String(linkMenu));

    const abas = await pagina.$$eval(".nx-tab", (els) => els.map((e) => e.dataset.tab));
    ok("Minha conta, Empresa, Aparência e Empresas",
      abas.join(",") === "conta,empresa,aparencia,acesso", abas.join(","));

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
      emailLeitura.readOnly === true && emailLeitura.valor === EMAIL_ADMIN, JSON.stringify(emailLeitura));
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

    // == 3) Empresa ==
    console.log("== 3) Aba Empresa: cadastro, endereço, formato, logo e meta ==");
    await irParaAba(pagina, "empresa");
    const titulos = await pagina.$$eval(".nx-bloco .panel-title", (els) => els.map((e) => e.textContent.trim()));
    ok("cinco blocos independentes", titulos.join(",") ===
      "Identificação,Endereço,Formato de números e datas,Identidade visual,Meta de receita do mês", titulos.join(","));

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
    ok("o STAFF lê a empresa inteira", leitura.rota === "/app/configuracoes" && leitura.blocos === 5,
      JSON.stringify(leitura));
    ok("nenhum botão de gravar em bloco algum", leitura.botoes === 0, String(leitura.botoes));
    ok("cada bloco explica quem grava ali", leitura.notas === 5, String(leitura.notas));
    ok("campos e listas aparecem travados",
      leitura.campoTravado === true && leitura.listaTravada === true, JSON.stringify(leitura));
    await foto(paginaStaff, "22-configuracoes-somente-leitura");

    await irParaAba(paginaStaff, "conta");
    ok("o próprio nome, ele pode mudar",
      (await campoDesabilitado(paginaStaff, "Seus dados", "Nome")) === false);

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
    try {
      await prisma.user.delete({ where: { id: staff.id } });
      staffApagado = true;
      console.log("  [banco] STAFF de prova apagado");
    } catch (e) {
      console.log("  [limpeza] falha ao apagar o usuário de prova: " + e.message);
    }
    await prisma.$disconnect().catch(() => {});
  }

  const empresaFinal = (await chame("GET", "/companies/current")).dados;
  const contaFinal = (await chame("GET", "/auth/me")).dados;
  console.log("== Estado final ==");
  console.log("  empresa: " + JSON.stringify(Object.fromEntries(CAMPOS_EMPRESA.map((c) => [c, empresaFinal[c]]))));
  console.log("  conta: nome=" + contaFinal.name + " telefone=" + String(contaFinal.phone));
  ok("nada sobrou alterado na empresa", diferencas(empresaAntes, empresaFinal).length === 0);
  ok("nada sobrou alterado na conta",
    contaFinal.name === contaAntes.name && String(contaFinal.phone ?? "") === String(contaAntes.phone ?? ""));
  ok("o usuário de prova não ficou no banco", staffApagado);
  const soDeVerdade = errosDeConsole.filter((t) => !ruidoDeRede(t));
  ok("nenhum erro de JavaScript no caminho", soDeVerdade.length === 0, soDeVerdade.slice(0, 3).join(" | "));

  console.log("\n" + checks + " checagens · " + falhas.length + " falhas");
  if (falhas.length) {
    console.log(falhas.map((f) => "  - " + f).join("\n"));
    process.exit(1);
  }
  console.log("Configurações provadas: quatro abas, gravação bloco a bloco, validação no campo e leitura travada.");
})();
