// Prova do /app/rotinas: a tela lista as rotinas-padrão com agenda traduzida,
// o "Executar agora" chama o mesmo executor do relógio e grava estado de verdade
// (pílula Ok, mensagem, duração), pausar pede confirmação e some com a "próxima
// execução", retomar dispensa diálogo — e quem não configura (STAFF) não vê o
// link no menu nem a tabela na URL direta.
//
// A prova escreve no banco de propósito (executa as três rotinas) e devolve tudo:
// apaga os avisos que as corridas criaram, restaura last_* e enabled das rotinas
// ao valor do início, e apaga o usuário STAFF de prova. As rotinas alcançam TODAS
// as empresas ativas por desenho; o antiduplicação mensal das contas vencidas já
// pode ter consumido o mês — por isso a prova confere o formato da mensagem, não
// a quantidade de avisos.
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

async function semToast(page) {
  await page
    .waitForFunction(() => !document.querySelector(".toast-message, .toast"), { timeout: 12000 })
    .catch(() => {});
  await espera(250);
}

async function avisoDe(page, trecho) {
  const visto = await page
    .waitForFunction((t) => [...document.querySelectorAll(".toast-message")]
      .some((m) => (m.textContent || "").includes(t)), { timeout: 15000 }, trecho)
    .then(() => true)
    .catch(() => false);
  ok("a tela avisa: " + trecho, visto);
  await semToast(page);
}

async function foto(page, nome) {
  await page.screenshot({ path: SHOTS + "/" + nome + ".png" });
  console.log("  [foto] " + nome + ".png");
}

const ruidoDeRede = (t) =>
  /Failed to load resource: the server responded with a status of 4\d\d/.test(t);

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

// Uma linha da tabela de rotinas, achada pelo nome que a pessoa lê.
async function linhaDaRotina(page, nome) {
  return page.evaluate((n) => {
    const tr = [...document.querySelectorAll("tbody tr")].find(
      (r) => (r.querySelector("strong")?.textContent || "").trim() === n);
    if (!tr) return null;
    const botoes = [...tr.querySelectorAll("button")].map((b) => ({
      texto: b.textContent.trim(), desabilitado: b.disabled,
    }));
    return {
      texto: tr.innerText,
      pill: tr.querySelectorAll(".status-pill")[0]?.textContent.trim() ?? null,
      pills: [...tr.querySelectorAll(".status-pill")].map((p) => p.textContent.trim()),
      botoes,
    };
  }, nome);
}

async function clicarBotaoDaLinha(page, nome, texto) {
  const clicado = await page.evaluate((n, t) => {
    const tr = [...document.querySelectorAll("tbody tr")].find(
      (r) => (r.querySelector("strong")?.textContent || "").trim() === n);
    const botao = tr && [...tr.querySelectorAll("button")].find((b) => b.textContent.trim() === t);
    if (!botao) return false;
    botao.click();
    return true;
  }, nome, texto);
  await espera(400);
  return clicado;
}

// ------------------------------------------------------------------------ banco
let prisma = null;
async function abrirBanco() {
  require("dotenv").config({ path: path.join(__dirname, "..", "apps", "api", ".env") });
  const { PrismaClient } = require("@prisma/client");
  prisma = new PrismaClient();
}

async function criarStaff(companyId) {
  const bcrypt = require("bcryptjs");
  const email = "prova-rotinas-" + Date.now() + "@nexus.prova";
  const senha = "ProvaRotinas2026#";
  const user = await prisma.user.create({
    data: { email, name: "Prova Rotinas", passwordHash: await bcrypt.hash(senha, 12) },
  });
  await prisma.companyUser.create({ data: { userId: user.id, companyId, role: "STAFF" } });
  console.log("  [banco] STAFF de prova criado: " + email);
  return { id: user.id, email, senha };
}

// --------------------------------------------------------------- roteiro
(async () => {
  const login = await chame("POST", "/auth/login", { email: EMAIL_ADMIN, password: SENHA_ADMIN });
  if (login.status !== 200) {
    console.error("login falhou: " + login.status + " " + JSON.stringify(login.dados));
    process.exit(1);
  }
  token = login.dados.accessToken;
  const empresa = (await chame("GET", "/companies/current")).dados;
  console.log("API: sessão obtida · empresa \"" + empresa.name + "\"");

  await abrirBanco();
  // Retrato do início: estado das rotinas e avisos já existentes das varreduras.
  const jobsAntes = await prisma.cronJob.findMany();
  const idsAvisosAntes = new Set(
    (await prisma.notification.findMany({
      where: { dedupeKey: { startsWith: "vencida:" } }, select: { id: true },
    })).map((n) => n.id),
  );
  const staff = await criarStaff(empresa.id);

  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: "new",
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });

  try {
    const pagina = await browser.newPage();
    await pagina.setViewport({ width: 1440, height: 900 });
    const erros = [];
    pagina.on("pageerror", (e) => erros.push(String(e)));
    pagina.on("console", (m) => {
      if (m.type() === "error" && !ruidoDeRede(m.text())) erros.push("console: " + m.text());
    });

    // ---- 1. o menu chama, a tela abre ----
    console.log("\n-- menu e chegada --");
    await entrarNoPainel(pagina, EMAIL_ADMIN, SENHA_ADMIN);
    const temLink = await pagina.evaluate(() =>
      [...document.querySelectorAll(".admin-nav-item")].some((a) => a.textContent.includes("Rotinas agendadas")));
    ok("o menu lateral tem \"Rotinas agendadas\"", temLink);
    await Promise.all([
      pagina.waitForFunction(() => window.location.pathname === "/app/rotinas", { timeout: 10000 }),
      pagina.evaluate(() =>
        [...document.querySelectorAll(".admin-nav-item")].find((a) => a.textContent.includes("Rotinas agendadas"))?.click()),
    ]);
    await semToast(pagina);
    const titulo = await pagina.evaluate(() => document.querySelector(".page-title")?.textContent.trim());
    ok("a tela abre em /app/rotinas com título", titulo === "Rotinas agendadas", titulo);

    // ---- 2. as três rotinas-padrão, traduzidas ----
    console.log("\n-- tabela de rotinas --");
    await pagina.reload({ waitUntil: "networkidle0" });
    await semToast(pagina);
    const contas = await linhaDaRotina(pagina, "Contas vencidas");
    const estoque = await linhaDaRotina(pagina, "Estoque abaixo do mínimo");
    const relatorio = await linhaDaRotina(pagina, "Relatório diário");
    ok("as três rotinas do código estão na tabela", Boolean(contas && estoque && relatorio));
    ok("a agenda vem traduzida e com a expressão crua junto",
      Boolean(contas) && contas.texto.includes("todos os dias às 07:00") && contas.texto.includes("0 7 * * *"));
    ok("cada linha mostra a próxima execução em diante", Boolean(contas) && contas.texto.includes("próxima:"));
    ok("estado inicial é Ativa", contas?.pill === "Ativa" && estoque?.pill === "Ativa", contas?.pill);
    ok("cada rotina tem Executar agora e Pausar",
      Boolean(contas) && contas.botoes.some((b) => b.texto === "Executar agora") && contas.botoes.some((b) => b.texto === "Pausar"));
    await foto(pagina, "23-rotinas-tela");

    // ---- 3. executar agora: corrida real, estado gravado ----
    console.log("\n-- executar agora --");
    const disparado = await clicarBotaoDaLinha(pagina, "Contas vencidas", "Executar agora");
    ok("o botão da linha foi clicado", disparado);
    await avisoDe(pagina, "Contas vencidas:");
    const linhaDepois = await linhaDaRotina(pagina, "Contas vencidas");
    ok("a linha mostra a pílula Ok com a corrida", Boolean(linhaDepois) && linhaDepois.pills.some((p) => p.startsWith("Ok")));
    ok("a mensagem da corrida aparece na linha",
      Boolean(linhaDepois) && /avisos? criados? em \d+ empresa/.test(linhaDepois.texto),
      linhaDepois?.texto.slice(0, 120));
    const jobsApi = await chame("GET", "/ops/jobs");
    const jobContas = jobsApi.dados.data.find((j) => j.slug === "contas-vencidas");
    ok("a API gravou última execução, status e duração no banco",
      Boolean(jobContas.ultimaExecucao) && jobContas.ultimoStatus === "ok" && typeof jobContas.duracaoMs === "number",
      jobContas.ultimaExecucao + " · " + jobContas.ultimoStatus + " · " + jobContas.duracaoMs + " ms");

    const disparoEstoque = await clicarBotaoDaLinha(pagina, "Estoque abaixo do mínimo", "Executar agora");
    ok("a segunda rotina também roda", disparoEstoque);
    await avisoDe(pagina, "Estoque abaixo do mínimo:");
    const linhaEstoque = await linhaDaRotina(pagina, "Estoque abaixo do mínimo");
    ok("a resposta do estoque tem o formato da casa",
      /empresas? avisadas? · \d+ avisos?/.test(linhaEstoque?.texto || ""), linhaEstoque?.texto.slice(0, 120));
    await foto(pagina, "23-rotinas-executou");

    const disparoRelatorio = await clicarBotaoDaLinha(pagina, "Relatório diário", "Executar agora");
    ok("o relatório diário roda sem erro", disparoRelatorio);
    await avisoDe(pagina, "Relatório diário:");

    // ---- 4. pausar pede confirmação; retomar não ----
    console.log("\n-- pausar e retomar --");
    await clicarBotaoDaLinha(pagina, "Estoque abaixo do mínimo", "Pausar");
    const dialogo = await pagina.evaluate(() => {
      const overlay = document.querySelector(".nx-modal-overlay");
      if (!overlay) return null;
      return {
        titulo: overlay.querySelector(".nx-modal-titulo, h2, h3")?.textContent.trim()
          || overlay.innerText.split("\n")[0],
        texto: overlay.innerText,
      };
    });
    ok("pausar abre o diálogo de confirmação da casa", Boolean(dialogo), dialogo?.titulo);
    ok("o diálogo diz o que acontece com a rotina",
      Boolean(dialogo) && dialogo.texto.includes("Executar agora") && dialogo.texto.includes("horário"));
    await foto(pagina, "23-rotinas-confirmacao");
    const confirmado = await pagina.evaluate(() => {
      const overlay = document.querySelector(".nx-modal-overlay");
      const botao = overlay && [...overlay.querySelectorAll("button")].find((b) => b.textContent.trim() === "Pausar");
      if (!botao) return false;
      botao.click();
      return true;
    });
    ok("o botão do diálogo confirma", confirmado);
    await avisoDe(pagina, "pausada");
    const pausada = await linhaDaRotina(pagina, "Estoque abaixo do mínimo");
    ok("a pílula passa a dizer Pausada", pausada?.pill === "Pausada", pausada?.pill);
    ok("rotina pausada não mostra próxima execução", !pausada?.texto.includes("próxima:"));

    await clicarBotaoDaLinha(pagina, "Estoque abaixo do mínimo", "Retomar");
    const semDialogo = await pagina.evaluate(() => !document.querySelector(".nx-modal-overlay"));
    ok("retomar dispensa diálogo — retomar não quebra nada", semDialogo);
    await avisoDe(pagina, "retomada");
    const retomada = await linhaDaRotina(pagina, "Estoque abaixo do mínimo");
    ok("a rotina volta a Ativa, com próxima execução",
      retomada?.pill === "Ativa" && retomada?.texto.includes("próxima:"));

    // ---- 5. tema claro + celular ----
    console.log("\n-- tema claro e celular --");
    await pagina.evaluate(() => localStorage.setItem("nexus.theme", "light"));
    await pagina.reload({ waitUntil: "networkidle0" });
    await semToast(pagina);
    const claro = await pagina.evaluate(() => document.documentElement.getAttribute("data-theme"));
    ok("a tela respeita o tema claro", claro === "light", claro);
    await foto(pagina, "23-rotinas-claro");
    await pagina.evaluate(() => localStorage.setItem("nexus.theme", "dark"));

    await pagina.setViewport({ width: 390, height: 844 });
    await pagina.reload({ waitUntil: "networkidle0" });
    await semToast(pagina);
    const cabecaCelular = await pagina.evaluate(() => {
      const t = document.querySelector(".page-title")?.textContent.trim();
      const tabela = document.querySelector("table.table");
      return { t, temTabela: Boolean(tabela) };
    });
    ok("no celular a tela continua legível (tabela rolável, sem cortar o título)",
      cabecaCelular.t === "Rotinas agendadas" && cabecaCelular.temTabela);
    await foto(pagina, "23-rotinas-celular");

    // ---- 6. quem não configura não vê nem por URL direta ----
    console.log("\n-- papel que não gerir --");
    const outro = await (browser.createBrowserContext
      ? browser.createBrowserContext()
      : browser.createIncognitoBrowserContext());
    const paginaStaff = await outro.newPage();
    await paginaStaff.setViewport({ width: 1440, height: 900 });
    await entrarNoPainel(paginaStaff, staff.email, staff.senha);
    const linkStaff = await paginaStaff.evaluate(() =>
      document.body.innerText.includes("Rotinas agendadas"));
    ok("no menu do STAFF não há linha de Rotinas", !linkStaff);
    await paginaStaff.goto(BASE + "/app/rotinas", { waitUntil: "networkidle0" });
    await semToast(paginaStaff);
    const semPermissao = await paginaStaff.evaluate(() => document.body.innerText);
    ok("na URL direta, a tela diz \"Sem permissão por aqui\" em vez de tabela",
      semPermissao.includes("Sem permissão por aqui") && !semPermissao.includes("Executar agora"));
    await foto(paginaStaff, "23-rotinas-sem-permissao");
    await paginaStaff.close();
    await outro.close();

    // API também barra: 403 com o token do STAFF
    const tokenAdminAntes = token;
    const loginStaff = await chame("POST", "/auth/login", { email: staff.email, password: staff.senha });
    token = loginStaff.dados.accessToken;
    const listaStaff = await chame("GET", "/ops/jobs");
    ok("a API responde 403 para quem tenta listar sem settings:write", listaStaff.status === 403, String(listaStaff.status));
    const runStaff = await chame("POST", "/ops/jobs/contas-vencidas/run");
    ok("e 403 também para executar", runStaff.status === 403, String(runStaff.status));
    token = tokenAdminAntes;

    // ---- 7. a auditoria viu as corridas manuais ----
    console.log("\n-- auditoria --");
    const auditados = await prisma.auditLog.findMany({
      where: { action: { in: ["cron.job.run", "cron.job.updated"] }, companyId: empresa.id },
      orderBy: { createdAt: "desc" }, take: 20,
    });
    ok("cada \"executar agora\" deixou trilha na auditoria",
      auditados.filter((a) => a.action === "cron.job.run").length >= 3,
      String(auditados.filter((a) => a.action === "cron.job.run").length));
    ok("pausar/retomar deixou trilha na auditoria",
      auditados.filter((a) => a.action === "cron.job.updated").length >= 2,
      String(auditados.filter((a) => a.action === "cron.job.updated").length));

    ok("nenhum erro de JavaScript na prova", erros.length === 0, erros.join(" | ").slice(0, 200));
  } finally {
    await browser.close();

    // ---- devolve tudo ----
    console.log("\n-- restauração --");
    const apagadosEstoque = await prisma.notification.deleteMany({
      where: { dedupeKey: { startsWith: "estoque-baixo:" } },
    });
    const apagadosRelatorio = await prisma.notification.deleteMany({
      where: { dedupeKey: { startsWith: "relatorio-diario:" } },
    });
    const novosVencidas = await prisma.notification.findMany({
      where: { dedupeKey: { startsWith: "vencida:" } }, select: { id: true },
    });
    let apagadosVencidas = 0;
    for (const n of novosVencidas) {
      if (!idsAvisosAntes.has(n.id)) {
        await prisma.notification.delete({ where: { id: n.id } });
        apagadosVencidas += 1;
      }
    }
    console.log("  [banco] avisos das corridas apagados: estoque=" + apagadosEstoque.count
      + " relatório=" + apagadosRelatorio.count + " vencidas(novos)=" + apagadosVencidas);

    for (const antes of jobsAntes) {
      await prisma.cronJob.update({
        where: { slug: antes.slug },
        data: {
          enabled: antes.enabled,
          lastRunAt: antes.lastRunAt,
          lastStatus: antes.lastStatus,
          lastMessage: antes.lastMessage,
          durationMs: antes.durationMs,
        },
      });
    }
    await prisma.user.delete({ where: { id: staff.id } });
    const sobrouStaff = await prisma.user.findUnique({ where: { id: staff.id } });
    ok("o usuário STAFF de prova não deixou rastro", sobrouStaff === null);
    const jobsFinal = await prisma.cronJob.findMany();
    const restaurado = jobsFinal.every((j) => {
      const antes = jobsAntes.find((k) => k.slug === j.slug);
      return antes && j.enabled === antes.enabled && String(j.lastRunAt) === String(antes.lastRunAt)
        && j.lastStatus === antes.lastStatus && j.durationMs === antes.durationMs;
    });
    ok("as rotinas voltaram ao estado do início da prova", restaurado);
    await prisma.$disconnect();
  }

  console.log("\n=======================================");
  console.log(checks + " verificações · " + falhas.length + " falhas");
  if (falhas.length) {
    console.log(falhas.map((f) => " - " + f).join("\n"));
    process.exit(1);
  }
  console.log("PROVA DAS ROTINAS AGENDADAS: OK");
  process.exit(0);
})().catch((e) => {
  console.error("erro na prova:", e);
  process.exit(1);
});
