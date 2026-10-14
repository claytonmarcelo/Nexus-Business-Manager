// Prova do sino e da tela de avisos (/app/notificacoes).
//
// A prova fabrica dados reais: cria lançamentos pendentes vencidos pela API e
// roda a varredura, que é o caminho de verdade (não existe POST /notifications
// para ninguém injetar aviso, e quem provoca o evento não recebe o próprio
// aviso — a varredura não tem autor, então ela chega em mim). No fim ela apaga
// os próprios lançamentos e os próprios avisos pelo banco: o produto não tem
// botão de apagar aviso (apagar trilha não é função de negócio), então a limpeza
// é da prova, pela tabela, marcando antes o que é dela.
//
// Toda comparação de número sai de uma leitura fresca da API, nunca de um valor
// guardado lá do começo: o sino, a aba e os filtros mudam contagem o tempo todo.
//
// O quadro "E-mail" das preferências e a frase da varredura (N59) são conferidos
// contra o estado que a própria rota devolve, e não contra uma frase fixa: a mesma
// prova vale numa máquina sem SMTP — caixa desligada e o motivo na dica — e numa
// produção com SMTP ligado — caixa editável e o transporte na dica.
const puppeteer = require("puppeteer-core");
const { EMAIL_ADMIN, SENHA_ADMIN } = require("./senha-admin.cjs");
const { conferirServidorDeProva, clienteDoBancoDeProva } = require("./banco-de-prova.cjs");

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const BASE = require("./pilha-de-prova.cjs").baseDoNavegador();
const API = (require("./pilha-de-prova.cjs").raizDaApi()) + "/api";
const SHOTS = require("./pilha-de-prova.cjs").pastaDeCaptura("docs/screenshots");

const MARCA = "PROVA-SINO";
const QUANTIDADE = 12;
const TAMANHO_PAGINA = 10;

let checks = 0;
const falhas = [];
function ok(nome, cond, detalhe) {
  checks += 1;
  if (cond) console.log("  [ok] " + nome + (detalhe ? " (" + detalhe + ")" : ""));
  else {
    falhas.push(nome + (detalhe ? " -> " + detalhe : ""));
    console.log("  [FALHA] " + nome + " (" + detalhe + ")");
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

const contarPeloBanco = () => chame("GET", "/notifications/count");

// ------------------------------------------------------------------ banco
// Só para a limpeza do que a própria prova criou.
function abrirBanco() {
  // D6 (tarefa T1): este parser do .env de desenvolvimento foi apagado junto com a
  // criacao do PrismaClient. A prova nao injeta mais o DATABASE_URL de quem esta
  // trabalhando no processo: o cliente vem de banco-de-prova.cjs, que so aceita
  // DATABASE_URL_TESTE apontando para nexusbusinessmanager_teste.
  return clienteDoBancoDeProva();
}

async function limpar(prisma, momento) {
  const avisos = await prisma.notification.deleteMany({ where: { body: { contains: MARCA } } });
  const lancamentos = await prisma.financeEntry.deleteMany({ where: { description: { startsWith: MARCA } } });
  console.log("  [limpeza " + momento + "] avisos: " + avisos.count + " · lançamentos: " + lancamentos.count);
}

// ------------------------------------------------------------------ helpers
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

/** Chip de filtro de tipo: o rótulo vem seguido do número, então o ajuste é por começo. */
async function clicarChip(page, rotulo) {
  const clicado = await page.evaluate((t) => {
    const alvo = [...document.querySelectorAll(".nx-avisos-filtros [aria-pressed]")]
      .find((b) => (b.textContent || "").trim().startsWith(t));
    if (!alvo) return false;
    alvo.click();
    return true;
  }, rotulo);
  ok("o filtro \"" + rotulo + "\" está na barra", clicado);
  await espera(600);
  return clicado;
}

const chipPressionado = (page, rotulo) =>
  page.evaluate((t) => {
    const alvo = [...document.querySelectorAll(".nx-avisos-filtros [aria-pressed]")]
      .find((b) => (b.textContent || "").trim().startsWith(t));
    return alvo ? alvo.getAttribute("aria-pressed") : null;
  }, rotulo);

/** Espera um trecho do Toastr e limpa a tela antes da próxima ação. */
async function avisoDe(page, trecho) {
  const visto = await page
    .waitForFunction((t) => [...document.querySelectorAll(".toast-message")]
      .some((m) => (m.textContent || "").includes(t)), { timeout: 12000 }, trecho)
    .then(() => true)
    .catch(() => false);
  ok("a tela avisa: " + trecho, visto);
  await semToast(page);
}

/**
 * O mesmo espera do `avisoDe`, mas devolve a frase inteira do Toastr: quando a
 * asserção é sobre o que a tela afirma (N59), procurar um trecho não basta — é
 * preciso conferir o que veio junto.
 */
async function textoDoAviso(page, trecho) {
  const pegado = await page
    .waitForFunction(
      (t) => [...document.querySelectorAll(".toast-message")]
        .map((m) => m.textContent || "").find((c) => c.includes(t)) ?? null,
      { timeout: 12000 },
      trecho,
    )
    .then((handle) => handle.jsonValue())
    .catch(() => null);
  await semToast(page);
  return pegado;
}

async function semToast(page) {
  await page.waitForFunction(() => !document.querySelector(".toast-message, .toast"), { timeout: 12000 }).catch(() => {});
  await espera(250);
}

async function foto(page, nome) {
  await page.screenshot({ path: SHOTS + "/" + nome + ".png" });
  console.log("  [foto] " + nome + ".png");
}

const existe = (page, seletor) => page.evaluate((sel) => Boolean(document.querySelector(sel)), seletor);

const textoDe = (page, seletor) =>
  page.$eval(seletor, (el) => el.textContent.trim()).catch(() => null);

const contagemDoSino = (page) =>
  page.$eval(".nx-sino-contagem", (el) => el.textContent.trim()).catch(() => null);

/** Espera o sino mostrar um número específico — é assim que a prova sabe que a recarga chegou. */
async function sinoMostrar(page, numero) {
  return page
    .waitForFunction((n) => document.querySelector(".nx-sino-contagem")?.textContent.trim() === n,
      { timeout: 10000 }, String(numero))
    .then(() => true)
    .catch(() => false);
}

async function sinoSemNumero(page) {
  return page
    .waitForFunction(() => !document.querySelector(".nx-sino-contagem"), { timeout: 10000 })
    .then(() => true)
    .catch(() => false);
}

const etiquetaDaAba = (page, id) =>
  page.$eval('.nx-tab[data-tab="' + id + '"]', (el) => ({
    rotulo: el.querySelector(".nx-tab-label")?.textContent.trim() ?? "",
    badge: el.querySelector(".nx-tab-badge")?.textContent.trim() ?? "",
    ativa: el.classList.contains("is-active"),
  })).catch(() => null);

const itensDoSino = (page) =>
  page.$$eval(".nx-sino-item", (ns) => ns.map((n) => ({
    titulo: n.querySelector(".nx-sino-item-titulo")?.textContent.trim() ?? "",
    texto: n.querySelector(".nx-sino-item-texto")?.textContent.trim() ?? "",
    meta: n.querySelector(".nx-sino-item-meta")?.textContent.trim() ?? "",
    novo: n.classList.contains("is-novo"),
  })));

const linhasDaTela = (page) =>
  page.$$eval(".nx-avisos .nx-aviso", (ns) => ns.map((n) => ({
    titulo: n.querySelector(".nx-aviso-titulo")?.textContent.trim() ?? "",
    texto: n.querySelector(".nx-aviso-texto")?.textContent.trim() ?? "",
    tipo: n.querySelector(".nx-aviso-tipo")?.textContent.trim() ?? "",
    meta: n.querySelector(".nx-aviso-meta")?.textContent.trim() ?? "",
    novo: n.classList.contains("is-novo"),
    acoes: [...n.querySelectorAll(".row-actions button")].map((b) => b.textContent.trim()),
  })));

// ------------------------------------------------------------------ roteiro
(async () => {
  const login = await chame("POST", "/auth/login", { email: EMAIL_ADMIN, password: SENHA_ADMIN });
  if (login.status !== 200) {
    console.error("login falhou: " + login.status + " " + JSON.stringify(login.dados));
    process.exit(1);
  }
  token = login.dados.accessToken;
  console.log("API: sessão de administração obtida em \"" + login.dados.user.companyName + "\"");

  const prisma = abrirBanco();
  await limpar(prisma, "antes");
  const antes = await contarPeloBanco();
  console.log("  [estado inicial] naoLidas=" + antes.dados.naoLidas);

  // Avisos de verdade: lançamentos vencidos + a varredura que a equipe roda.
  for (let i = 0; i < QUANTIDADE; i++) {
    const dias = 3 + i;
    const vencimento = new Date(Date.now() - dias * 86_400_000).toISOString().slice(0, 10);
    const r = await chame("POST", "/finance/entries", {
      type: "EXPENSE",
      description: MARCA + " " + String(i + 1).padStart(2, "0") + " conta de demonstração vencida",
      amount: 100 + i,
      dueDate: vencimento,
      paid: false,
    });
    if (r.status !== 201) {
      console.error("lançamento " + i + " falhou: " + r.status + " " + JSON.stringify(r.dados));
      process.exit(1);
    }
  }
  console.log("API: " + QUANTIDADE + " lançamentos pendentes vencidos criados");

  const varredura = await chame("POST", "/notifications/scan");
  ok("a varredura responde 200 e devolve quantos avisos nasceram",
    varredura.status === 200 && typeof varredura.dados.criadas === "number",
    varredura.status + " " + JSON.stringify(varredura.dados));

  const resumoApi = await contarPeloBanco();
  const esperadosParaMim = QUANTIDADE;
  ok("os avisos da varredura chegaram até mim",
    resumoApi.dados.naoLidas === (antes.dados.naoLidas || 0) + esperadosParaMim,
    "antes " + antes.dados.naoLidas + " · agora " + resumoApi.dados.naoLidas);
  ok("a quebra por tipo aponta o Financeiro",
    resumoApi.dados.porTipo.billing >= esperadosParaMim, JSON.stringify(resumoApi.dados.porTipo));
  ok("parte dos avisos é urgente (atraso maior que uma semana)",
    resumoApi.dados.urgentes > 0, String(resumoApi.dados.urgentes));

  // A mesma consulta que o sino faz, para comparar linha a linha.
  const seisDaApi = await chame("GET", "/notifications?status=todas&page=1&pageSize=6");
  ok("a lista paginada devolve {data, meta}",
    Array.isArray(seisDaApi.dados.data) && typeof seisDaApi.dados.meta.total === "number",
    "meta " + JSON.stringify(seisDaApi.dados.meta));

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
  pagina.on("console", (m) => { if (m.type() === "error") erros.push(m.text()); });
  pagina.on("pageerror", (e) => erros.push(String(e)));

  try {
    // == 1) Entrar e ver o sino ==
    console.log("== 1) O sino no cabeçalho ==");
    await pagina.goto(BASE + "/login", { waitUntil: "networkidle0" });
    await pagina.waitForSelector("input[type=email]");
    await pagina.type("input[type=email]", EMAIL_ADMIN);
    await pagina.type("input[type=password]", SENHA_ADMIN);
    await Promise.all([
      pagina.waitForFunction(() => window.location.pathname.startsWith("/app"), { timeout: 15000 }),
      pagina.click("button[type=submit]"),
    ]);
    await semToast(pagina);
    const sinoCarregou = await sinoMostrar(pagina, resumoApi.dados.naoLidas);
    ok("o sino chega já contando os avisos pendentes", sinoCarregou,
      await contagemDoSino(pagina));

    const noMenu = await pagina.evaluate(() => {
      const link = [...document.querySelectorAll(".admin-nav-item")]
        .find((a) => (a.textContent || "").includes("Notificações"));
      return { href: link?.getAttribute("href") ?? null };
    });
    ok("o menu tem a linha de Notificações", noMenu.href === "/app/notificacoes", String(noMenu.href));

    const sino = await pagina.evaluate(() => {
      const botao = document.querySelector(".nx-sino-botao");
      const marca = document.querySelector(".nx-sino-contagem");
      return {
        ha: Boolean(botao),
        rotulo: botao?.getAttribute("aria-label") ?? null,
        expandido: botao?.getAttribute("aria-expanded") ?? null,
        controla: botao?.getAttribute("aria-controls") ?? null,
        contagem: marca?.textContent.trim() ?? null,
        urgente: marca?.classList.contains("is-urgente") ?? false,
      };
    });
    ok("o sino está no cabeçalho", sino.ha);
    ok("ele começa fechado para o leitor de tela", sino.expandido === "false", String(sino.expandido));
    ok("o botão aponta o painel pelo id", sino.controla === "nx-sino-painel", String(sino.controla));
    ok("o rótulo do sino diz quantos avisos estão pendentes",
      /não lidos/.test(sino.rotulo || "") && (sino.rotulo || "").includes(String(resumoApi.dados.naoLidas)),
      sino.rotulo);
    ok("a bolinha do sino bate com a contagem da API",
      sino.contagem === String(resumoApi.dados.naoLidas),
      sino.contagem + " x " + resumoApi.dados.naoLidas);
    ok("com aviso urgente a bolinha troca para o tom de risco", sino.urgente);

    // == 2) Abrir o painel do sino ==
    console.log("== 2) O painel do sino ==");
    await pagina.click(".nx-sino-botao");
    await pagina.waitForSelector(".nx-sino-item", { timeout: 8000 });
    await espera(400);
    ok("o botão passa a dizer que o painel está aberto",
      (await pagina.$eval(".nx-sino-botao", (b) => b.getAttribute("aria-expanded"))) === "true");

    const topo = await pagina.evaluate(() => ({
      titulo: document.querySelector(".nx-sino-titulo")?.textContent.trim(),
      resumo: document.querySelector(".nx-sino-resumo")?.textContent.trim(),
      painel: document.querySelector(".nx-sino-painel")?.getAttribute("aria-label"),
      id: document.querySelector(".nx-sino-painel")?.id,
    }));
    ok("o painel se anuncia como avisos recentes",
      topo.titulo === "Avisos" && topo.painel === "Avisos recentes" && topo.id === "nx-sino-painel",
      JSON.stringify(topo));
    ok("o resumo do painel mostra a contagem e os urgentes",
      (topo.resumo || "").includes(String(resumoApi.dados.naoLidas)) && /urgente/.test(topo.resumo || ""),
      topo.resumo);

    const recentes = await itensDoSino(pagina);
    const titulosApi = (seisDaApi.dados.data || []).map((n) => n.title);
    ok("o painel traz os seis mais recentes, não a lista inteira", recentes.length === 6, String(recentes.length));
    ok("o painel é a mesma lista que a API devolve, na mesma ordem",
      recentes.map((r) => r.titulo).join("|") === titulosApi.join("|"),
      recentes.map((r) => r.titulo).join(" / "));
    ok("os seis do painel são meus e ainda não foram lidos",
      recentes.every((r) => r.texto.includes(MARCA) && r.novo));
    ok("cada linha diz o tipo e há quanto tempo",
      /Financeiro · /.test(recentes[0].meta), recentes[0].meta);
    await foto(pagina, "21-notificacoes-sino");

    // Fechar no Esc devolve o foco para o botão — teclado não fica órfão.
    await pagina.keyboard.press("Escape");
    await espera(300);
    ok("Esc fecha o painel do sino", !(await existe(pagina, ".nx-sino-painel")));
    ok("o foco volta para o botão do sino",
      await pagina.evaluate(() => document.activeElement?.classList.contains("nx-sino-botao") ?? false));

    // Clique fora fecha.
    await pagina.click(".nx-sino-botao");
    await pagina.waitForSelector(".nx-sino-painel");
    await pagina.mouse.click(700, 500);
    await espera(300);
    ok("clicar fora fecha o painel", !(await existe(pagina, ".nx-sino-painel")));

    // Clicar num aviso marca como lido e leva para a tela do negócio.
    const alvoPainel = seisDaApi.dados.data[0];
    await pagina.click(".nx-sino-botao");
    await pagina.waitForSelector(".nx-sino-item", { timeout: 8000 });
    await Promise.all([
      pagina.waitForFunction(() => window.location.pathname === "/app/financeiro", { timeout: 12000 }),
      pagina.click(".nx-sino-item-botao"),
    ]);
    await semToast(pagina);
    ok("clicar no aviso leva à tela do negócio", pagina.url().includes("/app/financeiro"), pagina.url());
    ok("e fechar o painel pelo caminho", !(await existe(pagina, ".nx-sino-painel")));
    const lidasAposClique = await chame("GET", "/notifications?status=lidas&page=1&pageSize=50");
    ok("o aviso clicado já está lido no banco",
      (lidasAposClique.dados.data || []).some((n) => n.id === alvoPainel.id),
      String(alvoPainel.title));
    const resumoAposClique = await contarPeloBanco();
    ok("o sino acompanha o clique sem recarregar a página",
      await sinoMostrar(pagina, resumoAposClique.dados.naoLidas),
      resumoApi.dados.naoLidas + " -> " + resumoAposClique.dados.naoLidas);

    // == 3) A tela de avisos ==
    console.log("== 3) A tela /app/notificacoes ==");
    await pagina.evaluate(() => {
      const link = [...document.querySelectorAll(".admin-nav-item")]
        .find((a) => a.getAttribute("href") === "/app/notificacoes");
      link.click();
    });
    await pagina.waitForSelector(".nx-avisos .nx-aviso", { timeout: 12000 });
    await semToast(pagina);
    ok("\"Notificações\" no menu abre a tela", pagina.url().includes("/app/notificacoes"), pagina.url());

    const resumoTela = await contarPeloBanco();
    const listaTela = await chame("GET", "/notifications?status=todas&page=1&pageSize=" + TAMANHO_PAGINA);
    const totalReal = listaTela.dados.meta.total;
    const paginasReais = listaTela.dados.meta.totalPages;
    const naPrimeira = Math.min(TAMANHO_PAGINA, totalReal);
    const naSegunda = Math.max(0, totalReal - TAMANHO_PAGINA);

    const cabecalho = await pagina.evaluate(() => ({
      titulo: document.querySelector(".page-title")?.textContent.trim(),
      pills: [...document.querySelectorAll(".nx-avisos-head-acoes .status-pill")].map((p) => p.textContent.trim()),
    }));
    ok("o cabeçalho da tela conta não lidos e urgentes",
      cabecalho.titulo === "Notificações" && cabecalho.pills.length === 2 &&
      cabecalho.pills.join(" ").includes(String(resumoTela.dados.naoLidas)) &&
      /urgente/.test(cabecalho.pills.join(" ")),
      JSON.stringify(cabecalho));

    const abaTodos = await etiquetaDaAba(pagina, "todos");
    const abaNaoLidos = await etiquetaDaAba(pagina, "naolidos");
    const abaPrefs = await etiquetaDaAba(pagina, "preferencias");
    ok("a tela tem três abas", [abaTodos, abaNaoLidos, abaPrefs].every(Boolean) &&
      (await pagina.$$eval(".nx-tab", (ns) => ns.length)) === 3,
      [abaTodos?.rotulo, abaNaoLidos?.rotulo, abaPrefs?.rotulo].join(" | "));
    ok("a aba padrão é a de todos os avisos, sem aba na URL",
      abaTodos.ativa && !pagina.url().includes("aba="), pagina.url());
    ok("a aba \"Não lidos\" carrega o número do sino na etiqueta",
      abaNaoLidos.badge === String(resumoTela.dados.naoLidas),
      abaNaoLidos.badge + " x " + resumoTela.dados.naoLidas);

    const pagina1 = await linhasDaTela(pagina);
    ok("a primeira página vem com o tamanho da página", pagina1.length === naPrimeira,
      pagina1.length + " de " + totalReal);
    const resumoPaginacao = await textoDe(pagina, ".pagination-info");
    ok("a paginação é do servidor e diz o total real",
      (resumoPaginacao || "").includes("de " + totalReal + " avisos") &&
      (resumoPaginacao || "").includes("página 1 de " + paginasReais),
      resumoPaginacao);
    ok("nenhum aviso da tela é de outra empresa ou de outra pessoa",
      pagina1.every((l) => l.texto.includes(MARCA)), pagina1[0]?.texto);
    // A primeira linha pode ser a que o sino acabou de fechar: a lista é do
    // mais novo para o mais antigo e não esconde o que já foi lido.
    const primeiraNaoLida = pagina1.find((l) => l.novo);
    ok("a linha não lida traz tipo, tempo, prioridade e estado",
      Boolean(primeiraNaoLida) && /Financeiro/.test(primeiraNaoLida.meta) &&
      /Alta|Média|Baixa/.test(primeiraNaoLida.meta) && /não lido/.test(primeiraNaoLida.meta),
      primeiraNaoLida ? primeiraNaoLida.meta : "nenhuma não lida na página");
    ok("cada linha não lida oferece abrir e marcar lida",
      primeiraNaoLida?.acoes.join(", ") === "Abrir, Marcar lida", String(primeiraNaoLida?.acoes));
    ok("o aviso lido no sino continua na lista, agora como lido",
      pagina1.some((l) => !l.novo && l.titulo === alvoPainel.title &&
        /lido/.test(l.meta) && !/não lido/.test(l.meta)),
      String(alvoPainel?.title));
    await foto(pagina, "21-notificacoes-tela");

    // Filtro por tipo: os chips mostram a contagem que o sino contou.
    const chips = await pagina.$$eval(".nx-avisos-filtros [aria-pressed]", (ns) =>
      ns.map((b) => ({
        rotulo: b.textContent.trim(),
        numero: b.querySelector(".nx-avisos-chip-num")?.textContent.trim() ?? "",
      })));
    ok("os cinco tipos aparecem no filtro, com o número do sino",
      chips.length === 6 && chips.some((c) => c.rotulo.startsWith("Financeiro")) &&
      chips.find((c) => c.rotulo.startsWith("Financeiro"))?.numero === String(resumoTela.dados.porTipo.billing),
      chips.map((c) => c.rotulo + "[" + c.numero + "]").join(" | "));

    const billingReal = await chame("GET", "/notifications?status=todas&kind=billing&page=1&pageSize=" + TAMANHO_PAGINA);
    await clicarChip(pagina, "Financeiro");
    const soBilling = await linhasDaTela(pagina);
    ok("filtrar por Financeiro deixa só o que é de Financeiro",
      (await chipPressionado(pagina, "Financeiro")) === "true" &&
      soBilling.length === Math.min(TAMANHO_PAGINA, billingReal.dados.meta.total) &&
      soBilling.every((l) => l.tipo === "Financeiro" && l.texto.includes(MARCA)),
      soBilling.length + " linhas de " + billingReal.dados.meta.total);

    await clicarChip(pagina, "CRM");
    const vazioDoTipo = await pagina.evaluate(() => ({
      linhas: document.querySelectorAll(".nx-avisos .nx-aviso").length,
      estado: document.querySelector(".state-title")?.textContent.trim() ?? null,
      descricao: document.querySelector(".state-desc")?.textContent.trim() ?? null,
    }));
    ok("um tipo sem aviso diz isso na tela, sem tabela vazia",
      vazioDoTipo.linhas === 0 && vazioDoTipo.estado === "Nenhum aviso por aqui" &&
      /desse tipo/.test(vazioDoTipo.descricao || ""),
      JSON.stringify(vazioDoTipo));

    await clicarChip(pagina, "Todos os tipos");
    ok("voltar para todos os tipos traz a lista de volta",
      (await chipPressionado(pagina, "Todos os tipos")) === "true" &&
      (await linhasDaTela(pagina)).length === naPrimeira);

    // Página 2 — só faz sentido se houver mais de uma página.
    ok("a conta passa de uma página, então a paginação é testável",
      paginasReais >= 2, String(paginasReais));
    await pagina.click('.pagination-list button[aria-label="Página 2"]');
    await espera(800);
    const pagina2 = await linhasDaTela(pagina);
    ok("a segunda página fecha a conta", pagina2.length === naSegunda,
      pagina2.length + " x " + naSegunda);
    ok("a página ativa fica marcada na paginação",
      (await pagina.$eval(".pagination-list button.is-active", (b) => b.textContent.trim())) === "2");
    await pagina.click('.pagination-list button[aria-label="Página anterior"]');
    await espera(800);

    // Marcar um só — pelo título, para não depender de qual linha é a primeira.
    const resumoAntesMarcar = await contarPeloBanco();
    const antesUm = resumoAntesMarcar.dados.naoLidas;
    const alvoTitulo = (await linhasDaTela(pagina)).find((l) => l.novo)?.titulo;
    ok("ainda há um pendente na página para marcar", Boolean(alvoTitulo), String(alvoTitulo));
    await pagina.evaluate((marca, titulo) => {
      const alvo = [...document.querySelectorAll(".nx-avisos .nx-aviso")].find((l) =>
        (l.textContent || "").includes(marca) &&
        l.querySelector(".nx-aviso-titulo")?.textContent.trim() === titulo);
      const botao = [...alvo.querySelectorAll(".row-actions button")]
        .find((b) => b.textContent.trim() === "Marcar lida");
      botao.click();
    }, MARCA, alvoTitulo);
    await espera(700);
    const linhaMarcada = (await linhasDaTela(pagina)).find((l) => l.titulo === alvoTitulo);
    ok("marcar um aviso muda a linha na hora",
      Boolean(linhaMarcada) && !linhaMarcada.novo && !/não lido/.test(linhaMarcada.meta) &&
      linhaMarcada.acoes.join(",") === "Abrir",
      linhaMarcada ? linhaMarcada.meta + " [" + linhaMarcada.acoes + "]" : "linha sumiu");
    ok("o sino acompanha a mudança sem recarregar",
      await sinoMostrar(pagina, antesUm - 1),
      antesUm + " -> " + await contagemDoSino(pagina));
    const resumoDepois = await contarPeloBanco();
    ok("e o banco confirma o novo número", resumoDepois.dados.naoLidas === antesUm - 1,
      String(resumoDepois.dados.naoLidas));
    ok("a etiqueta da aba segue o mesmo número",
      (await etiquetaDaAba(pagina, "naolidos"))?.badge === String(antesUm - 1),
      (await etiquetaDaAba(pagina, "naolidos"))?.badge);

    // Aba Não lidos
    await pagina.click('.nx-tab[data-tab="naolidos"]');
    await pagina.waitForFunction(() => window.location.search.includes("aba=naolidos"), { timeout: 8000 });
    await espera(900);
    const naoLidos = await linhasDaTela(pagina);
    ok("a aba Não lidos vem pela URL e mostra só o pendente",
      naoLidos.length > 0 && naoLidos.every((l) => l.novo), String(naoLidos.length));
    await foto(pagina, "21-notificacoes-naolidos");

    // Marcar todos pelo botão da lista
    await clicarTexto(pagina, ".nx-avisos-marcar", "Marcar todos como lidos");
    await avisoDe(pagina, "avisos marcados como lidos");
    await espera(700);
    const vazia = await pagina.evaluate(() => ({
      estado: document.querySelector(".state-title")?.textContent.trim() ?? null,
      descricao: document.querySelector(".state-desc")?.textContent.trim() ?? null,
    }));
    ok("fechado o último pendente, a aba diz que não há nada",
      vazia.estado === "Nenhum aviso pendente", JSON.stringify(vazia));
    ok("o sino zerou junto", await sinoSemNumero(pagina), await contagemDoSino(pagina));
    const resumoZerado = await contarPeloBanco();
    ok("e o banco também", resumoZerado.dados.naoLidas === 0, String(resumoZerado.dados.naoLidas));

    await pagina.click('.nx-tab[data-tab="todos"]');
    await pagina.waitForSelector(".nx-avisos .nx-aviso", { timeout: 12000 });
    await espera(500);
    const tudoLido = await linhasDaTela(pagina);
    ok("em Todos os avisos os registros continuam lá, agora lidos",
      tudoLido.length === naPrimeira && tudoLido.every((l) => !l.novo && /lido/.test(l.meta)),
      String(tudoLido.length));

    // == 4) Preferências ==
    console.log("== 4) Preferências e canais ==");
    await pagina.click('.nx-tab[data-tab="preferencias"]');
    await pagina.waitForSelector(".nx-avisos-tipos", { timeout: 10000 });
    await espera(500);
    const preferencias = await pagina.evaluate(() => {
      const linhas = [...document.querySelectorAll(".nx-avisos-tipos .check-line")].map((l) => ({
        rotulo: l.querySelector("strong")?.textContent.trim() ?? "",
        marcada: l.querySelector("input").checked,
        desabilitada: l.querySelector("input").disabled,
        dica: l.querySelector(".nx-avisos-dica")?.textContent.trim() ?? "",
      }));
      const salvar = [...document.querySelectorAll("button")]
        .find((b) => b.textContent.trim() === "Salvar preferências");
      return { linhas, salvarDesabilitado: salvar?.disabled ?? null };
    });
    const nomesDasLinhas = preferencias.linhas.map((l) => l.rotulo);
    ok("as cinco chaves de tipo aparecem na tela",
      ["Vendas", "Estoque", "CRM", "Financeiro", "Relatório diário"]
        .every((r) => nomesDasLinhas.includes(r)),
      preferencias.linhas.map((l) => l.rotulo + ":" + (l.marcada ? "on" : "off")).join(", "));
    ok("o padrão vem do servidor: tudo ligado menos o relatório diário",
      ["Vendas", "Estoque", "CRM", "Financeiro"].every((r) =>
        preferencias.linhas.find((l) => l.rotulo === r)?.marcada === true) &&
      preferencias.linhas.find((l) => l.rotulo === "Relatório diário")?.marcada === false);
    ok("o botão de salvar começa desligado: nada mudou ainda",
      preferencias.salvarDesabilitado === true);
    ok("o canal de sino é editável e ligado",
      preferencias.linhas.some((l) => l.rotulo === "Sino do painel" && !l.desabilitada && l.marcada));
    // N59: a caixa de e-mail não é mais uma frase escrita na tela. A prova lê o
    // estado que a própria rota devolve e confere se o quadro obedece a ele — assim
    // o script vale tanto numa instalação sem SMTP quanto numa com SMTP ligado.
    const canal = await chame("GET", "/notifications/preferences");
    const email = canal.dados.email ?? {};
    const linhaEmail = preferencias.linhas.find((l) => l.rotulo === "E-mail");
    ok("a rota descreve o canal com transporte e motivo quando não entrega",
      typeof email.disponivel === "boolean" && typeof email.transporte === "string" &&
      (email.disponivel ? email.motivo === null : (email.motivo ?? "").length > 0),
      JSON.stringify(email));
    ok("a caixa de e-mail obedece ao estado do canal, não a um disabled fixo",
      email.disponivel ? linhaEmail && !linhaEmail.desabilitada
        : linhaEmail && linhaEmail.desabilitada && linhaEmail.dica.includes(email.motivo ?? "###"),
      (linhaEmail ? (linhaEmail.desabilitada ? "desligada" : "editável") : "sem linha") +
        " · disponivel=" + String(email.disponivel));
    ok("a dica do canal diz o que a instalação afirma de si",
      linhaEmail && (email.disponivel
        ? linhaEmail.dica.includes(email.transporte)
        : /Indispon/i.test(linhaEmail.dica)),
      linhaEmail?.dica.slice(0, 70));

    await pagina.evaluate(() => {
      const linha = [...document.querySelectorAll(".nx-avisos-tipos .check-line")]
        .find((l) => (l.querySelector("strong")?.textContent || "").trim() === "Estoque");
      linha.querySelector("input").click();
    });
    await espera(300);
    const botaoLigado = await pagina.evaluate(() =>
      [...document.querySelectorAll("button")].find((b) => b.textContent.trim() === "Salvar preferências")?.disabled);
    ok("o botão de salvar fica disponível com o rascunho diferente", botaoLigado === false, String(botaoLigado));
    await clicarTexto(pagina, "button", "Salvar preferências");
    await avisoDe(pagina, "preferências de aviso foram salvas");

    const gravado = await chame("GET", "/notifications/preferences");
    ok("a chave desligada chegou ao banco", gravado.dados.lowStock === false,
      JSON.stringify({ lowStock: gravado.dados.lowStock }));
    ok("o botão volta a desligar depois de gravar",
      await pagina.evaluate(() =>
        [...document.querySelectorAll("button")].find((b) => b.textContent.trim() === "Salvar preferências")?.disabled) === true);

    await pagina.reload({ waitUntil: "networkidle0" });
    await pagina.waitForSelector(".nx-avisos-tipos", { timeout: 15000 });
    await espera(600);
    const recarregada = await pagina.evaluate(() => {
      const linha = [...document.querySelectorAll(".nx-avisos-tipos .check-line")]
        .find((l) => (l.querySelector("strong")?.textContent || "").trim() === "Estoque");
      return linha?.querySelector("input")?.checked ?? null;
    });
    ok("recarregada a tela, a preferência vem do banco", recarregada === false);
    ok("a URL mantém a aba de preferências", pagina.url().includes("aba=preferencias"), pagina.url());
    await foto(pagina, "21-notificacoes-preferencias");

    // Devolve ao padrão da casa.
    await pagina.evaluate(() => {
      const linha = [...document.querySelectorAll(".nx-avisos-tipos .check-line")]
        .find((l) => (l.querySelector("strong")?.textContent || "").trim() === "Estoque");
      linha.querySelector("input").click();
    });
    await clicarTexto(pagina, "button", "Salvar preferências");
    await avisoDe(pagina, "preferências de aviso foram salvas");
    const restaurado = await chame("GET", "/notifications/preferences");
    const PADRAO = {
      saleAlerts: true, lowStock: true, dailyReport: false, overdueBills: true,
      newLead: true, emailChannel: false, inAppChannel: true,
    };
    ok("as preferências voltam ao padrão do produto",
      Object.entries(PADRAO).every(([k, v]) => restaurado.dados[k] === v),
      JSON.stringify(restaurado.dados));

    // Varredura pela tela: a chave antifduplication do mês não repete o aviso.
    // N59: o aviso agora traz os dois números, e esta instalação não tem entregador
    // que entrega, então a parte do e-mail não pode aparecer na frase.
    await clicarTexto(pagina, "button", "Rodar varredura agora");
    const avisoDaVarredura = await textoDoAviso(pagina, "Nenhum aviso novo neste mês");
    ok("a varredura repetida avisa pelo sino", avisoDaVarredura !== null, String(avisoDaVarredura));
    if (!email.disponivel) {
      ok("sem entregador que entrega, a frase não fala de fila de e-mail",
        avisoDaVarredura !== null && !avisoDaVarredura.includes("fila de e-mail"),
        String(avisoDaVarredura));
    }
    ok("a varredura repetida não duplica aviso",
      (await contarPeloBanco()).dados.naoLidas === 0);

    // == 5) Aparência ==
    console.log("== 5) Aparência ==");
    await pagina.click('.nx-tab[data-tab="todos"]');
    await pagina.waitForSelector(".nx-avisos .nx-aviso", { timeout: 12000 });
    await espera(600);
    await pagina.click('button[role="switch"]');
    await espera(700);
    ok("a tela acompanha o tema claro",
      (await pagina.evaluate(() => document.documentElement.getAttribute("data-theme"))) === "light");
    await foto(pagina, "21-notificacoes-claro");
    await pagina.click('button[role="switch"]');
    await espera(600);

    await pagina.setViewport({ width: 390, height: 844, isMobile: true });
    await espera(900);
    const celular = await pagina.evaluate(() => ({
      largura: document.documentElement.scrollWidth,
      area: document.documentElement.clientWidth,
      sino: Boolean(document.querySelector(".nx-sino-botao")),
    }));
    ok("no celular o sino continua alcançável", celular.sino);
    ok("a tela de avisos não arrasta na horizontal",
      celular.largura <= celular.area + 1, celular.largura + " x " + celular.area);
    await foto(pagina, "21-notificacoes-celular");
    await pagina.evaluate(() => document.querySelector(".nx-sino-botao").click());
    await pagina.waitForSelector(".nx-sino-painel", { timeout: 8000 });
    await espera(600);
    const painelCelular = await pagina.evaluate(() => {
      const painel = document.querySelector(".nx-sino-painel");
      const caixas = [...painel.querySelectorAll(".nx-sino-item-botao")];
      return {
        largura: Math.round(painel.getBoundingClientRect().width),
        tela: window.innerWidth,
        desborda: caixas.some((b) => b.getBoundingClientRect().right > window.innerWidth + 1),
      };
    });
    ok("no celular o painel do sino cabe na tela",
      painelCelular.largura <= painelCelular.tela && !painelCelular.desborda,
      JSON.stringify(painelCelular));
    await pagina.setViewport({ width: 1440, height: 900 });
  } finally {
    // == 6) Limpeza ==
    console.log("== 6) Limpar o que a prova criou ==");
    await semToast(pagina).catch(() => {});
    await browser.close();
    await limpar(prisma, "depois");
    const sobra = await chame("GET", "/notifications?status=todas&page=1&pageSize=100");
    const restos = (sobra.dados.data || []).filter((n) => (n.body || "").includes(MARCA));
    ok("nenhum aviso de teste sobra na empresa", restos.length === 0, String(restos.length));
    const noBanco = await prisma.financeEntry.count({ where: { description: { startsWith: MARCA } } });
    ok("nenhum lançamento de teste sobra no financeiro", noBanco === 0, String(noBanco));
    await prisma.$disconnect();
    ok("nenhum erro de console na tela", erros.length === 0, erros.slice(0, 2).join(" | "));
  }

  console.log("\n" + checks + " checagens, " + falhas.length + " falhas.");
  if (falhas.length) {
    console.log(falhas.map((f) => " - " + f).join("\n"));
    process.exit(1);
  }
})().catch((e) => {
  console.error("PROVA QUEBROU:", e);
  process.exit(1);
});
