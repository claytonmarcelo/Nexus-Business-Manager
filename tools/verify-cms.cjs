// Prova do editor do site público (/app/cms): o que a pessoa digita aqui é o
// que a vitrine lê do banco. Cada aba é conferida na tela E na API — salvar na
// tela sem chegar ao payload público seria a mesma coisa que não salvar.
//
// No fim a prova desfaz tudo: apaga o item criado, devolve o texto legal para
// rascunho com o título padrão, abre o site e devolve a configuração ao padrão do
// produto, para nenhum print - e nenhum banco - sair com conteúdo de teste.
const puppeteer = require("puppeteer-core");
const { EMAIL_ADMIN, SENHA_ADMIN } = require("./senha-admin.cjs");
const { conferirServidorDeProva } = require("./banco-de-prova.cjs");

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
async function chame(metodo, caminho, corpo, cabecalhos) {
  const res = await fetch(API + caminho, {
    method: metodo,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: "Bearer " + token } : {}),
      ...(cabecalhos || {}),
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

// ------------------------------------------------------------------ helpers
// Campo controlado pelo React: escrever em el.value por fora não dispara o
// onChange e o estado continua com o texto antigo. O setter nativo + o evento
// input é o jeito de digitar sem depender de seleção de mouse.
async function escrever(page, seletor, valor) {
  await page.waitForSelector(seletor, { timeout: 8000 });
  const achado = await page.evaluate((sel, texto) => {
    const el = document.querySelector(sel);
    if (!el) return false;
    const proto = el instanceof HTMLTextAreaElement
      ? window.HTMLTextAreaElement.prototype
      : window.HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, "value").set.call(el, texto);
    el.dispatchEvent(new Event("input", { bubbles: true }));
    return true;
  }, seletor, valor);
  if (!achado) ok("campo " + seletor + " existe", false, "não encontrado");
  return achado;
}

const valorDe = (page, seletor) =>
  page.$eval(seletor, (el) => el.value).catch(() => null);

const textoDe = (page, seletor) =>
  page.$eval(seletor, (el) => el.textContent.trim()).catch(() => null);

/** Marca/desmarca o interruptor pelo texto do rótulo. */
async function marcar(page, rotulo, quer) {
  return page.evaluate((texto, desejado) => {
    const alvo = [...document.querySelectorAll(".nx-ligado")].find((l) =>
      (l.textContent || "").includes(texto));
    const caixa = alvo?.querySelector("input[type=checkbox]");
    if (!caixa) return "sem campo";
    if (caixa.checked !== desejado) caixa.click();
    return caixa.checked === desejado;
  }, rotulo, quer);
}

const estaMarcado = (page, rotulo) =>
  page.evaluate((texto) => {
    const alvo = [...document.querySelectorAll(".nx-ligado")].find((l) =>
      (l.textContent || "").includes(texto));
    const caixa = alvo?.querySelector("input[type=checkbox]");
    return caixa ? caixa.checked : null;
  }, rotulo);

/** Rótulo do botão de gravar de um bloco — a tela precisa dizer o que o clique faz. */
async function rotuloDoBotaoDoBloco(page, tituloDoBloco) {
  return page.evaluate((titulo) => {
    const bloco = [...document.querySelectorAll(".nx-bloco")].find(
      (b) => (b.querySelector(".panel-title")?.textContent || "").trim() === titulo);
    return bloco?.querySelector(".nx-bloco-acao button")?.textContent.trim() ?? null;
  }, tituloDoBloco);
}

/** Clique no botão de gravar de um bloco, identificado pelo título do bloco. */
async function salvarBloco(page, tituloDoBloco) {
  const rotulo = await rotuloDoBotaoDoBloco(page, tituloDoBloco);
  const clicado = await page.evaluate((titulo) => {
    const bloco = [...document.querySelectorAll(".nx-bloco")].find(
      (b) => (b.querySelector(".panel-title")?.textContent || "").trim() === titulo);
    const botao = bloco?.querySelector(".nx-bloco-acao button");
    if (!botao) return false;
    botao.click();
    return true;
  }, tituloDoBloco);
  ok("bloco \"" + tituloDoBloco + "\" tem botão de gravar (" + rotulo + ")", clicado);
  return clicado;
}

async function clicarTexto(page, seletor, texto) {
  const clicado = await page.evaluate((sel, t) => {
    const alvo = [...document.querySelectorAll(sel)].find((b) => (b.textContent || "").trim() === t);
    if (!alvo) return false;
    alvo.click();
    return true;
  }, seletor, texto);
  ok("botão \"" + texto + "\" encontrado", clicado);
  await espera(400);
  return clicado;
}

/** Espera o aviso do Toastr e limpa a tela antes da próxima ação. */
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

const existe = (page, seletor) => page.evaluate((sel) => Boolean(document.querySelector(sel)), seletor);

// ------------------------------------------------------------- padrão da casa
// Espelho dos *_PADRAO de apps/api/src/modules/cms/cms.service.ts e do bloco
// CONFIG_PADRAO_PRODUTO de tools/verify-landing-cms.cjs. A prova termina aqui,
// e não no "estado anterior", porque o estado anterior pode ser texto deixado
// pela suíte de testes.
const PADRAO = {
  headline: "Gestão empresarial com precisão e elegância",
  subheadline:
    "Clientes, produtos, vendas, estoque, finanças, CRM e agenda em um só lugar — um ambiente seguro, responsivo e com identidade própria, do balcão à nuvem.",
  cores: {
    fundo: "#0b0d10",
    painel: "#171b22",
    texto: "#f2ece4",
    textoSuave: "#a7adba",
    marca: "#c8a870",
    destaque: "#b05050",
    borda: "#2a313c",
  },
  hero: {
    eyebrow: "ERP SaaS multiempresa",
    ctaPrimario: "Acessar sistema",
    rotaPrimario: "/login",
    ctaSecundario: "Criar minha empresa",
    rotaSecundario: "/cadastro",
    imagemUrl: "",
    overlay: 0.55,
    desfoque: 0,
  },
  seo: {
    titulo: "Nexus Business Manager — ERP SaaS multiempresa",
    descricao:
      "Clientes, produtos, vendas, estoque, finanças, CRM e agenda em um só lugar, com isolamento por empresa e trilha de auditoria.",
    palavrasChave: "erp, saas, multiempresa, gestão empresarial, vendas, estoque, financeiro, crm",
    ogTitulo: "Nexus Business Manager",
    ogDescricao: "Gestão empresarial com precisão e elegância.",
    ogImagem: "",
    twitterCard: "summary_large_image",
    canonica: "",
    robots: "index, follow",
  },
  whatsapp: {
    ativo: false,
    numero: "",
    mensagem: "Olá! Quero conhecer o Nexus Business Manager.",
    rotulo: "Fale no WhatsApp",
    posicao: "direita",
  },
  contact: { email: "", telefone: "", endereco: "", horario: "" },
  social: { redes: [] },
  manutencao: {
    ativa: false,
    mensagem: "Estamos ajustando o Nexus Business Manager. Voltamos em instantes.",
    previsao: "",
    previsaoEm: null,
    tokenPulso: "",
    ipsPermitidos: [],
  },
};

const HEADLINE_PROVA = "Headline digitado no editor da vitrine";
const TITULO_ITEM = "Capacidade criada pelo editor";
const MENSAGEM_PROVA = "Ajustando a vitrine: o site reabre em alguns minutos.";
const TERMOS_PROVA =
  "Primeiro parágrafo dos termos escritos pelo editor do site público.\n\n" +
  "Segundo parágrafo, para conferir que a quebra de linha vira parágrafo na página.";

async function limparRestos(momento) {
  const lista = await chame("GET", "/cms/items?kind=FEATURE");
  if (lista.status !== 200) return;
  for (const item of lista.dados.data || []) {
    if (item.title.startsWith(TITULO_ITEM)) {
      const removido = await chame("DELETE", "/cms/items/" + item.id);
      console.log("  [limpeza " + momento + "] " + item.title + " -> " + removido.status);
    }
  }
}

// -------------------------------------------------------------------- roteiro
(async () => {
  const login = await chame("POST", "/auth/login", { email: EMAIL_ADMIN, password: SENHA_ADMIN });
  if (login.status !== 200) {
    console.error("login falhou: " + login.status + " " + JSON.stringify(login.dados));
    process.exit(1);
  }
  token = login.dados.accessToken;
  console.log("API: sessão de administração obtida");

  // Estado inicial honesto: site aberto, sem pulso e sem item de teste.
  await chame("PATCH", "/cms/config", { manutencao: { ativa: false, tokenPulso: "", previsaoEm: null } });
  await limparRestos("antes");

  // D6 (tarefa T1): a prova so escreve no banco de prova. A conferencia entra na API, pega o
  // id que ela devolve no login da conta de prova e exige que esse id exista em
  // nexusbusinessmanager_teste - se o servidor atende outro banco, a prova para aqui.
  await conferirServidorDeProva();

  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: "new",
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });

  const erros = [];
  const pagina = await browser.newPage();
  await pagina.setViewport({ width: 1440, height: 900 });
  pagina.on("console", (msg) => {
    if (msg.type() === "error") erros.push(msg.text());
  });
  pagina.on("pageerror", (e) => erros.push(String(e)));

  try {
    // == 1) Entrada no editor ==
    console.log("== 1) Entrar no editor do site público ==");
    await pagina.goto(BASE + "/login", { waitUntil: "networkidle0" });
    await pagina.waitForSelector("input[type=email]");
    await pagina.type("input[type=email]", EMAIL_ADMIN);
    await pagina.type("input[type=password]", SENHA_ADMIN);
    await Promise.all([
      pagina.waitForFunction(() => window.location.pathname.startsWith("/app"), { timeout: 15000 }),
      pagina.click("button[type=submit]"),
    ]);
    await semToast(pagina);

    const noMenu = await pagina.evaluate(() => {
      const link = [...document.querySelectorAll(".admin-nav-item")]
        .find((a) => (a.textContent || "").includes("CMS & Site Público"));
      const emBreve = [...document.querySelectorAll(".admin-nav-item.is-soon")]
        .some((a) => (a.textContent || "").includes("CMS"));
      return { href: link?.getAttribute("href") ?? null, emBreve };
    });
    ok("o menu tem o link do editor", noMenu.href === "/app/cms", String(noMenu.href));
    ok("a linha \"em breve\" do CMS saiu do menu", !noMenu.emBreve);

    await Promise.all([
      pagina.waitForSelector(".page-loader, .nx-painel", { timeout: 15000 }),
      pagina.click(".admin-nav-item[href=\"/app/cms\"]"),
    ]);
    await pagina.waitForSelector(".nx-painel", { timeout: 15000 });
    await semToast(pagina);
    ok("o editor abre em /app/cms", pagina.url().includes("/app/cms"), pagina.url());

    const atalho = await pagina.evaluate(() => {
      const a = document.querySelector(".admin-open-site");
      return a
        ? { href: a.getAttribute("href"), alvo: a.getAttribute("target"), texto: a.textContent.trim() }
        : null;
    });
    ok("o cabeçalho do painel tem o atalho da vitrine", Boolean(atalho), JSON.stringify(atalho));
    ok("ele abre a página pública em outra aba",
      atalho?.href === "/" && atalho?.alvo === "_blank", JSON.stringify(atalho));

    const pill = await textoDe(pagina, ".cms-head .status-pill");
    ok("a página diz se o site está aberto ou fechado", /Site aberto/.test(pill || ""), String(pill));

    // == 2) As cinco abas ==
    console.log("== 2) As cinco abas do editor ==");
    const abas = await pagina.$$eval(".nx-tab", (els) => els.map((e) => e.dataset.tab));
    ok("Conteúdo, Itens, Textos legais, SEO e Manutenção",
      abas.join(",") === "conteudo,itens,legais,seo,manutencao", abas.join(","));

    for (const id of ["itens", "legais", "seo", "manutencao", "conteudo"]) {
      await pagina.click("[data-tab=\"" + id + "\"]");
      await espera(300);
      const urlOk = id === "conteudo"
        ? !pagina.url().includes("aba=")
        : pagina.url().includes("aba=" + id);
      ok("a aba " + id + " aparece na URL", urlOk, pagina.url());
      ok("e o painel dela está na tela", (await pagina.$(".nx-tabpanel")) !== null);
    }

    // == 3) Conteúdo: texto ==
    console.log("== 3) Salvar um headline e ver a vitrine mudar ==");
    const headlineAtual = await valorDe(pagina, "input[aria-label=\"Headline *\"]");
    ok("o editor mostra o headline que está no banco", Boolean(headlineAtual), String(headlineAtual));
    await escrever(pagina, "input[aria-label=\"Headline *\"]", HEADLINE_PROVA);
    ok("o campo aceita o texto novo", (await valorDe(pagina, "input[aria-label=\"Headline *\"]")) === HEADLINE_PROVA);
    await salvarBloco(pagina, "Textos do topo");
    await avisoDe(pagina, "Bloco salvo");
    const lido = await chame("GET", "/public/landing");
    ok("a API pública devolve o headline digitado", lido.dados.headline === HEADLINE_PROVA,
      String(lido.dados.headline));

    // == 4) Conteúdo: cor ==
    console.log("== 4) A paleta do editor pinta a vitrine ==");
    await escrever(pagina, "input[aria-label=\"Fundo (código hexadecimal)\"]", "#101820");
    await salvarBloco(pagina, "Cores da vitrine");
    await avisoDe(pagina, "Bloco salvo");
    const aposCor = await chame("GET", "/public/landing");
    ok("a cor do fundo chegou ao banco", aposCor.dados.cores.fundo === "#101820",
      String(aposCor.dados.cores.fundo));
    ok("e o restante da paleta continuou lá", Boolean(aposCor.dados.cores.texto),
      String(aposCor.dados.cores.texto));
    ok("o headline da etapa anterior não foi embora", aposCor.dados.headline === HEADLINE_PROVA,
      "merge bloco a bloco");

    const vitrine = await browser.newPage();
    await vitrine.setViewport({ width: 1440, height: 900 });
    const errosVitrine = [];
    vitrine.on("console", (m) => {
      // A vitrine é lida com o site em manutenção em outra etapa: 503 esperado
      // não é defeito, e a prova do editor não pode falhar por barulho de rede.
      if (m.type() === "error" && !/503|Failed to load resource/i.test(m.text())) errosVitrine.push(m.text());
    });
    await vitrine.goto(BASE + "/", { waitUntil: "networkidle0" });
    await vitrine.waitForSelector(".landing", { timeout: 12000 });
    await espera(700);
    const naVitrine = await vitrine.evaluate(() => {
      const raiz = document.querySelector(".landing");
      return {
        h1: document.querySelector("h1")?.textContent.trim() ?? "",
        fundo: getComputedStyle(raiz).getPropertyValue("--bg").trim(),
      };
    });
    ok("a vitrine lê o headline do editor", naVitrine.h1 === HEADLINE_PROVA, naVitrine.h1);
    ok("e a cor cadastrada é a da página", naVitrine.fundo.toLowerCase() === "#101820", naVitrine.fundo);
    ok("a vitrine abre sem erro de console", errosVitrine.length === 0, errosVitrine.slice(0, 2).join(" | "));
    await vitrine.close();

    // == 5) Itens ==
    console.log("== 5) Criar, esconder, mostrar, editar e excluir um item ==");
    await pagina.click("[data-tab=\"itens\"]");
    await pagina.waitForSelector(".cms-tipos", { timeout: 8000 });
    await clicarTexto(pagina, ".cms-tipos button", "Capacidades");
    await clicarTexto(pagina, ".cms-acima-da-lista button", "Novo capacidade");
    await pagina.waitForSelector(".nx-modal", { timeout: 8000 });
    ok("o diálogo do item novo abre", (await pagina.$(".nx-modal")) !== null);
    await escrever(pagina, ".nx-modal input[aria-label=\"Título *\"]", TITULO_ITEM);
    await escrever(pagina, ".nx-modal textarea[aria-label=\"Texto do item\"]",
      "Texto da capacidade criada pelo editor.");
    await escrever(pagina, ".nx-modal input[aria-label=\"Ícone (1 caractere)\"]", "▦");
    await escrever(pagina, ".nx-modal input[aria-label=\"Âncora no site\"]", "#recursos");
    ok("o formulário de capacidade não pede estrela de depoimento",
      !(await existe(pagina, ".nx-modal input[aria-label=\"Estrelas\"]")));
    ok("e pede a única coisa que faz sentido aqui: ícone e âncora",
      (await existe(pagina, ".nx-modal input[aria-label=\"Ícone (1 caractere)\"]")) &&
      (await existe(pagina, ".nx-modal input[aria-label=\"Âncora no site\"]")));
    await foto(pagina, "20-cms-item-novo");
    await pagina.click(".nx-modal .btn-brand");
    await avisoDe(pagina, "Item criado");
    const naLista = await pagina.$$eval(".table tbody tr td:first-child",
      (tds) => tds.map((t) => t.textContent.trim()));
    ok("o item criado aparece na tabela", naLista.includes(TITULO_ITEM), naLista.join(" | "));
    const comItem = await chame("GET", "/public/landing");
    ok("e aparece no payload público", (comItem.dados.capacidades || []).some((c) => c.title === TITULO_ITEM));
    await foto(pagina, "20-cms-itens");

    await clicarTexto(pagina, ".row-actions button", "Esconder");
    await avisoDe(pagina, "escondido");
    const escondido = await chame("GET", "/public/landing");
    ok("escondido, ele sai da vitrine", !(escondido.dados.capacidades || []).some((c) => c.title === TITULO_ITEM));
    ok("mas continua na lista do editor",
      (await pagina.$$eval(".table tbody tr td:first-child", (t) => t.map((x) => x.textContent.trim())))
        .includes(TITULO_ITEM));

    await clicarTexto(pagina, ".row-actions button", "Mostrar");
    await avisoDe(pagina, "visível");
    const mostrador = await chame("GET", "/public/landing");
    ok("mostrado, ele volta para a vitrine",
      (mostrador.dados.capacidades || []).some((c) => c.title === TITULO_ITEM));

    await clicarTexto(pagina, ".row-actions button", "Editar");
    await pagina.waitForSelector(".nx-modal", { timeout: 8000 });
    ok("o diálogo de edição abre com o título de volta",
      (await valorDe(pagina, ".nx-modal input[aria-label=\"Título *\"]")) === TITULO_ITEM);
    await escrever(pagina, ".nx-modal input[aria-label=\"Título *\"]", TITULO_ITEM + " editado");
    await pagina.click(".nx-modal .btn-brand");
    await avisoDe(pagina, "Item atualizado");
    const editado = await chame("GET", "/public/landing");
    ok("a edição chega na vitrine",
      (editado.dados.capacidades || []).some((c) => c.title === TITULO_ITEM + " editado"));

    await clicarTexto(pagina, ".row-actions button", "Excluir");
    await pagina.waitForSelector(".nx-modal .nx-confirm-nome", { timeout: 8000 });
    const nomeNoDialogo = await textoDe(pagina, ".nx-modal .nx-confirm-nome");
    ok("a exclusão pede confirmação com o nome do item",
      nomeNoDialogo === TITULO_ITEM + " editado", String(nomeNoDialogo));
    await pagina.click(".nx-modal .btn-risk");
    await avisoDe(pagina, "Item excluído");
    const sobrou = await chame("GET", "/cms/items?kind=FEATURE");
    ok("o item some da lista", !(sobrou.dados.data || []).some((i) => i.title.startsWith(TITULO_ITEM)));

    // == 6) Textos legais ==
    console.log("== 6) Publicar um texto legal ==");
    await pagina.click("[data-tab=\"legais\"]");
    await pagina.waitForSelector(".nx-bloco", { timeout: 8000 });
    const qualDocumento = await textoDe(pagina, ".nx-bloco .panel-title");
    ok("o editor abre no primeiro documento legal", String(qualDocumento) === "Termos de uso", String(qualDocumento));
    await escrever(pagina, ".nx-bloco input[aria-label=\"Título do documento\"]", "Termos de uso do editor");
    await escrever(pagina, ".cms-legal-texto", TERMOS_PROVA);
    await salvarBloco(pagina, "Termos de uso");
    await avisoDe(pagina, "Rascunho salvo");
    const antesPublicar = await chame("GET", "/public/legal/TERMS");
    ok("rascunho não aparece no site", antesPublicar.status === 404, "HTTP " + antesPublicar.status);

    await clicarTexto(pagina, ".nx-bloco-acao button", "Publicar no site");
    await avisoDe(pagina, "Texto publicado");
    const depoisPublicar = await chame("GET", "/public/legal/TERMS");
    ok("publicado, a rota responde", depoisPublicar.status === 200, "HTTP " + depoisPublicar.status);
    ok("e o interruptor da tela acompanha a publicação", (await estaMarcado(pagina, "Publicado no site")) === true);
    const rotulosLegais = await pagina.$$eval(".nx-bloco-acao button",
      (els) => els.map((e) => e.textContent.trim()));
    ok("o botão de publicar passa a se chamar Publicar de novo",
      rotulosLegais.includes("Publicar de novo"), rotulosLegais.join(" | "));

    const paginaLegal = await browser.newPage();
    await paginaLegal.setViewport({ width: 1440, height: 900 });
    await paginaLegal.goto(BASE + "/legal/termos", { waitUntil: "networkidle0" });
    await paginaLegal.waitForSelector(".landing-legal p", { timeout: 12000 });
    const paragrafos = await paginaLegal.$$eval(".landing-legal p", (ps) => ps.map((x) => x.textContent.trim()));
    ok("o texto publicado vira parágrafos na página", paragrafos.length === 2, String(paragrafos.length));
    ok("e o título é o do editor",
      (await paginaLegal.$eval(".landing-legal h1", (h) => h.textContent.trim())) === "Termos de uso do editor");
    await foto(paginaLegal, "20-cms-legal-publicado");
    await paginaLegal.close();
    await foto(pagina, "20-cms-legais");

    // == 7) SEO ==
    console.log("== 7) A nota de SEO medida no que está publicado ==");
    await pagina.click("[data-tab=\"seo\"]");
    await pagina.waitForSelector(".cms-nota-num", { timeout: 10000 });
    const notaAntes = await textoDe(pagina, ".cms-nota-num");
    const classeAntes = await pagina.$eval(".cms-nota-num", (el) => el.className);
    const checagens = await pagina.$$eval(".cms-checagem", (els) => els.length);
    ok("a nota aparece", /^\d+$/.test(String(notaAntes)), String(notaAntes));
    ok("as doze checagens estão listadas", checagens === 12, String(checagens));
    ok("a cor da nota vem de uma classe sem acento",
      /^cms-nota-num is-[a-z-]+$/.test(classeAntes), classeAntes);
    await escrever(pagina, "input[aria-label=\"Título (title)\"]", "Nexus Business Manager — gestão empresarial completa");
    await escrever(pagina, "input[aria-label=\"og:image\"]", BASE + "/favicon-512.png");
    await escrever(pagina, "input[aria-label=\"URL canônica\"]", BASE + "/");
    ok("a meta description é campo de várias linhas",
      (await existe(pagina, "textarea[aria-label=\"Meta description\"]")));
    await salvarBloco(pagina, "Metadados da página pública");
    await avisoDe(pagina, "SEO salvo e nota recalculada");
    const notaDepois = await textoDe(pagina, ".cms-nota-num");
    ok("salvar recalcula a nota na hora", Number(notaDepois) >= Number(notaAntes), notaAntes + " -> " + notaDepois);
    const scoreApi = await chame("GET", "/cms/seo/score");
    ok("a tela e a API mostram a mesma nota", String(scoreApi.dados.nota) === String(notaDepois),
      String(scoreApi.dados.nota));
    const faltas = await pagina.$$eval(".cms-checagem.is-falta",
      (els) => els.map((e) => e.textContent.replace(/\s+/g, " ").trim()));
    console.log("  [nota] faltam " + faltas.length + " checagem(ns): " + faltas.join(" · "));
    await foto(pagina, "20-cms-seo");

    // == 8) Manutenção ==
    console.log("== 8) Fechar o site, gerar o código e abrir de novo ==");
    await pagina.click("[data-tab=\"manutencao\"]");
    await pagina.waitForSelector(".cms-alerta-manutencao", { timeout: 8000 });
    const estadoInicial = await textoDe(pagina, ".cms-alerta-titulo");
    ok("a tela diz que o site está aberto", /aberto/i.test(String(estadoInicial)), String(estadoInicial));
    ok("sem nada marcado o botão é só Salvar",
      (await rotuloDoBotaoDoBloco(pagina, "Fechar ou abrir a plataforma")) === "Salvar",
      String(await rotuloDoBotaoDoBloco(pagina, "Fechar ou abrir a plataforma")));

    await escrever(pagina, "textarea[aria-label=\"Mensagem da tela\"]", MENSAGEM_PROVA);
    await salvarBloco(pagina, "Fechar ou abrir a plataforma");
    await avisoDe(pagina, "Modo manutenção atualizado");
    const comMensagem = await chame("GET", "/cms/config");
    ok("salvar a mensagem não fecha o site",
      comMensagem.dados.manutencao.mensagem === MENSAGEM_PROVA &&
      comMensagem.dados.manutencao.ativa === false,
      String(comMensagem.dados.manutencao.ativa));

    const daquiDuasHoras = new Date(Date.now() + 2 * 60 * 60 * 1000);
    const dois = (n) => String(n).padStart(2, "0");
    const local = daquiDuasHoras.getFullYear() + "-" + dois(daquiDuasHoras.getMonth() + 1) + "-" +
      dois(daquiDuasHoras.getDate()) + "T" + dois(daquiDuasHoras.getHours()) + ":" +
      dois(daquiDuasHoras.getMinutes());
    await escrever(pagina, "input[aria-label=\"Previsão de volta (data e hora)\"]", local);
    await escrever(pagina, "input[aria-label=\"Previsão escrita\"]", "Voltamos ainda hoje.");
    await escrever(pagina, "textarea[aria-label=\"IPs permitidos durante a manutenção\"]", "203.0.113.10");

    const marcou = await marcar(pagina, "Manutenção ativa", true);
    ok("o interruptor liga na tela", marcou === true, String(marcou));
    ok("com ele ligado o botão passa a se chamar Fechar o site",
      (await rotuloDoBotaoDoBloco(pagina, "Fechar ou abrir a plataforma")) === "Fechar o site",
      String(await rotuloDoBotaoDoBloco(pagina, "Fechar ou abrir a plataforma")));
    await clicarTexto(pagina, ".nx-bloco-acao button", "Fechar o site");
    await pagina.waitForSelector(".nx-modal .btn-risk", { timeout: 8000 });
    const avisoFechar = await textoDe(pagina, ".nx-modal .nx-confirm-detalhe");
    ok("fechar o site pede confirmação explicando o 503",
      /503/.test(String(avisoFechar)), String(avisoFechar)?.slice(0, 60));
    await pagina.click(".nx-modal .btn-risk");
    await avisoDe(pagina, "Modo manutenção atualizado");
    const negocio = await chame("GET", "/clients?page=1");
    ok("a rota de negócio cai em 503", negocio.status === 503, "HTTP " + negocio.status);
    ok("e o payload diz que é manutenção", negocio.dados.error === "MAINTENANCE", String(negocio.dados.error));
    const aberta = await chame("GET", "/public/landing");
    ok("a vitrine continua servindo conteúdo", aberta.status === 200, "HTTP " + aberta.status);
    ok("e diz que está em manutenção", aberta.dados.manutencao.ativa === true);
    ok("a previsão de volta virou ISO no banco",
      Math.abs(new Date(aberta.dados.manutencao.previsaoEm).getTime() - daquiDuasHoras.getTime()) < 5 * 60 * 1000,
      String(aberta.dados.manutencao.previsaoEm));
    const configFechado = await chame("GET", "/cms/config");
    ok("o IP permitido foi gravado",
      (configFechado.dados.manutencao.ipsPermitidos || []).join(",") === "203.0.113.10",
      JSON.stringify(configFechado.dados.manutencao.ipsPermitidos));
    ok("e a vitrine pública não entrega a lista de IPs",
      aberta.dados.manutencao.ipsPermitidos === undefined,
      JSON.stringify(Object.keys(aberta.dados.manutencao)));

    const telaManutencao = await browser.newPage();
    await telaManutencao.setViewport({ width: 1440, height: 900 });
    await telaManutencao.goto(BASE + "/", { waitUntil: "domcontentloaded" }).catch(() => {});
    await telaManutencao.waitForSelector(".landing-manutencao", { timeout: 15000 }).catch(() => {});
    ok("quem abre o site vê a tela de manutenção", (await existe(telaManutencao, ".landing-manutencao")));
    const msgNaTela = await textoDe(telaManutencao, ".manutencao-msg");
    ok("com a mensagem escrita no editor", msgNaTela === MENSAGEM_PROVA, String(msgNaTela));
    ok("e o relógio da previsão de volta", (await existe(telaManutencao, ".manutencao-relogio")));
    await foto(telaManutencao, "20-cms-tela-manutencao");
    await telaManutencao.close();

    await clicarTexto(pagina, ".nx-bloco-acao button", "Gerar código");
    await pagina.waitForSelector(".cms-pulso-codigo", { timeout: 8000 });
    const pulso = await textoDe(pagina, ".cms-pulso-codigo");
    ok("o código aparece com 18 caracteres", /^[0-9a-f]{18}$/.test(String(pulso)), String(pulso));
    const bypass = await chame("POST", "/public/bypass", { token: pulso });
    ok("o código libera na API pública", bypass.status === 200 && bypass.dados.liberado === true,
      JSON.stringify(bypass.dados));
    const comPulso = await chame("GET", "/clients?page=1", undefined, { "X-Nexus-Pulse": pulso });
    ok("e abre a rota de negócio para quem o traz", comPulso.status === 200, "HTTP " + comPulso.status);
    const configPulso = await chame("GET", "/cms/config");
    ok("o código mostrado é o que fica guardado no banco",
      configPulso.dados.manutencao.tokenPulso === pulso, String(configPulso.dados.manutencao.tokenPulso).slice(0, 4) + "…");
    await avisoDe(pagina, "Código gerado");
    await foto(pagina, "20-cms-manutencao");

    const desligar = await marcar(pagina, "Manutenção ativa", false);
    ok("o interruptor desliga na tela", desligar === true, String(desligar));
    ok("aí o botão diz Abrir o site, não Fechar o site",
      (await rotuloDoBotaoDoBloco(pagina, "Fechar ou abrir a plataforma")) === "Abrir o site",
      String(await rotuloDoBotaoDoBloco(pagina, "Fechar ou abrir a plataforma")));
    await clicarTexto(pagina, ".nx-bloco-acao button", "Abrir o site");
    await avisoDe(pagina, "Modo manutenção atualizado");
    const reaberta = await chame("GET", "/clients?page=1");
    ok("o site volta a atender", reaberta.status === 200, "HTTP " + reaberta.status);

    // == 9) Devolver a vitrine ao padrão do produto ==
    console.log("== 9) Devolver a vitrine ao padrão do produto ==");
    await limparRestos("fim");
    // O editor trocou também o título do documento. Devolver só o texto deixaria
    // "Termos de uso do editor" no banco para sempre — é o que a prova anterior
    // fazia, e é o que a afirmação abaixo passou a conferir.
    await chame("PUT", "/cms/legal/TERMS", { title: "Termos de uso", content: "", published: false });
    const restaurado = await chame("PATCH", "/cms/config", PADRAO);
    ok("a configuração volta ao padrão", restaurado.status === 200, "HTTP " + restaurado.status);
    const vitrineFinal = await chame("GET", "/public/landing");
    ok("a API pública lê o padrão", vitrineFinal.dados.headline === PADRAO.headline,
      String(vitrineFinal.dados.headline));
    ok("nenhum item de exemplo sobra no banco",
      !(vitrineFinal.dados.capacidades || []).some((c) => c.title.startsWith(TITULO_ITEM)),
      (vitrineFinal.dados.capacidades || []).length + " capacidades");
    ok("o texto legal volta a ser rascunho",
      (await chame("GET", "/public/legal/TERMS")).status === 404);
    const tituloDepois = (await chame("GET", "/cms/legal")).dados.data.find((d) => d.kind === "TERMS")?.title || "";
    ok("e o título do documento volta ao padrão do produto", tituloDepois === "Termos de uso", tituloDepois);
    ok("a manutenção está desligada", vitrineFinal.dados.manutencao.ativa === false);
    ok("e nenhum código de acesso fica no banco",
      restaurado.dados.manutencao.tokenPulso === "", String(restaurado.dados.manutencao.tokenPulso));
    ok("a paleta também voltou", vitrineFinal.dados.cores.fundo === PADRAO.cores.fundo,
      String(vitrineFinal.dados.cores.fundo));

    await pagina.goto(BASE + "/app/cms", { waitUntil: "networkidle0" });
    await pagina.waitForSelector(".nx-painel", { timeout: 15000 });
    await semToast(pagina);
    ok("o editor recarrega mostrando o padrão do banco",
      (await valorDe(pagina, "input[aria-label=\"Headline *\"]")) === PADRAO.headline,
      String(await valorDe(pagina, "input[aria-label=\"Headline *\"]")));
    ok("e o cabeçalho volta a dizer Site aberto",
      /Site aberto/.test(String(await textoDe(pagina, ".cms-head .status-pill"))));

    // == 10) O editor nos dois temas e no celular ==
    console.log("== 10) Aparência do editor ==");
    await foto(pagina, "20-cms-conteudo-dark");
    await pagina.click("button[role=\"switch\"]");
    await espera(600);
    ok("o editor acompanha o tema do painel",
      (await pagina.evaluate(() => document.documentElement.getAttribute("data-theme"))) === "light");
    await foto(pagina, "20-cms-conteudo-claro");
    await pagina.click("button[role=\"switch\"]");
    await espera(500);

    await pagina.click("[data-tab=\"itens\"]");
    await espera(500);
    await pagina.setViewport({ width: 390, height: 844, isMobile: true, deviceScaleFactor: 1 });
    await espera(700);
    const medida = await pagina.evaluate(() => ({
      s: document.documentElement.scrollWidth,
      c: document.documentElement.clientWidth,
    }));
    ok("no celular o editor não arrasta na horizontal", medida.s <= medida.c + 1,
      "scrollWidth " + medida.s + " x clientWidth " + medida.c);
    await foto(pagina, "20-cms-celular");
    await pagina.setViewport({ width: 1440, height: 900 });
    await espera(500);

    ok("nenhum erro de console no editor", erros.length === 0, erros.slice(0, 2).join(" | "));
  } finally {
    await browser.close();
    await limparRestos("finally");
    await chame("PUT", "/cms/legal/TERMS", { title: "Termos de uso", content: "", published: false });
    await chame("PATCH", "/cms/config", PADRAO);
  }

  console.log("\n" + checks + " checagens, " + falhas.length + " falhas.");
  if (falhas.length) {
    console.log(falhas.map((f) => " - " + f).join("\n"));
    process.exit(1);
  }
})().catch((err) => {
  console.error("A prova quebrou: " + (err && err.stack ? err.stack : err));
  process.exit(1);
});
